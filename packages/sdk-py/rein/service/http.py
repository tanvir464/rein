"""Async HTTP wrapper around the REIN service. Mirrors the TS ``ServiceHttp``."""

from __future__ import annotations

import asyncio
from typing import Any, Awaitable, Callable, Optional

import httpx

from rein.auth.token import parse_token, redact_token, token_nearing_expiry
from rein.errors import ReinError
from rein.types import ParsedToken

DEFAULT_RETRY_ATTEMPTS = 3
DEFAULT_RETRY_BACKOFF_MS = 250
DEFAULT_REFRESH_WINDOW_SEC = 60


class ServiceHttp:
    """Bearer-auth HTTP client with retry + refresh.

    Behaviour mirrors the TS counterpart:
      - Refresh proactively when ``exp - now < refresh_window_sec``.
      - Retry 5xx + transport errors with exponential backoff.
      - Return body for 422 (semantic policy reject) and 404 (not found).
      - Throw ``ReinError('ErrUnauthorized')`` on 401, ``ErrConfig`` on other 4xx.
    """

    def __init__(
        self,
        *,
        service_url: str,
        token: ParsedToken,
        client: Optional[httpx.AsyncClient] = None,
        retry_attempts: int = DEFAULT_RETRY_ATTEMPTS,
        retry_backoff_ms: int = DEFAULT_RETRY_BACKOFF_MS,
        refresh_window_sec: int = DEFAULT_REFRESH_WINDOW_SEC,
        on_token_refresh: Optional[Callable[[ParsedToken], Awaitable[None] | None]] = None,
    ) -> None:
        self.service_url = service_url.rstrip("/")
        self._token = token
        self._client = client or httpx.AsyncClient()
        self._owns_client = client is None
        self._retry_attempts = retry_attempts
        self._retry_backoff_ms = retry_backoff_ms
        self._refresh_window_sec = refresh_window_sec
        self._on_refresh = on_token_refresh
        self._refresh_lock = asyncio.Lock()

    @property
    def token(self) -> ParsedToken:
        return self._token

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def __aenter__(self) -> "ServiceHttp":
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.aclose()

    async def get(self, path: str) -> Any:
        return await self._json("GET", path, None)

    async def post(self, path: str, body: Any = None) -> Any:
        return await self._json("POST", path, body)

    async def put(self, path: str, body: Any = None) -> Any:
        return await self._json("PUT", path, body)

    async def delete(self, path: str) -> Any:
        return await self._json("DELETE", path, None)

    async def refresh(self) -> ParsedToken:
        """Force a token refresh. Coalesces concurrent calls behind one round-trip."""
        async with self._refresh_lock:
            url = f"{self.service_url}/v1/auth/refresh"
            r = await self._client.post(
                url, headers={"authorization": f"Bearer {self._token.raw}"}
            )
            if r.status_code != 200:
                raise ReinError(
                    "ErrUnauthorized" if r.status_code == 401 else "ErrService",
                    {"status": r.status_code, "path": "/v1/auth/refresh"},
                )
            body = r.json()
            new_token = parse_token(body["token"])
            self._token = new_token
            if self._on_refresh:
                result = self._on_refresh(new_token)
                if asyncio.iscoroutine(result):
                    await result
            return new_token

    async def _json(self, method: str, path: str, body: Any) -> Any:
        # Skip auto-refresh for the refresh path itself to avoid recursion.
        if path != "/v1/auth/refresh" and token_nearing_expiry(
            self._token, self._refresh_window_sec
        ):
            try:
                await self.refresh()
            except ReinError:
                # Best-effort; surface on the actual call below.
                pass

        url = f"{self.service_url}{path}"
        last_exc: Optional[Exception] = None

        for attempt in range(self._retry_attempts):
            try:
                headers = {"authorization": f"Bearer {self._token.raw}"}
                if body is not None:
                    headers["content-type"] = "application/json"
                r = await self._client.request(
                    method,
                    url,
                    headers=headers,
                    json=body if body is not None else None,
                )

                if r.status_code == 401:
                    raise ReinError("ErrUnauthorized", {"status": 401, "path": path})
                if r.status_code >= 500:
                    raise ReinError(
                        "ErrService", {"status": r.status_code, "path": path}
                    )
                if r.status_code >= 400 and r.status_code not in (404, 422):
                    detail: Any = None
                    try:
                        detail = r.json()
                    except ValueError:
                        detail = r.text
                    raise ReinError(
                        "ErrConfig",
                        {"status": r.status_code, "path": path, "detail": detail},
                    )

                if r.status_code == 204:
                    return None
                ct = r.headers.get("content-type", "")
                if "application/json" in ct:
                    return r.json()
                return r.text

            except ReinError as e:
                last_exc = e
                if e.code in ("ErrUnauthorized", "ErrConfig", "ErrTokenInvalid", "ErrTokenExpired"):
                    raise
                # otherwise retriable (ErrService, ErrTimeout, ErrRpc)
                if attempt == self._retry_attempts - 1:
                    raise
                await asyncio.sleep(
                    (self._retry_backoff_ms * (2**attempt)) / 1000
                )
            except httpx.HTTPError as e:
                last_exc = e
                if attempt == self._retry_attempts - 1:
                    raise ReinError(
                        "ErrService", {"transport": redact_token(str(e))}
                    )
                await asyncio.sleep(
                    (self._retry_backoff_ms * (2**attempt)) / 1000
                )

        if isinstance(last_exc, Exception):
            raise last_exc
        raise ReinError("ErrService", {"reason": "unknown"})

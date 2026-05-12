"""High-level Python client mirroring TS ``Rein``.

v0.1 implements the read paths via the deployed REIN service (``/v1/spend``,
``/v1/x402/spend``, ``/v1/receipts/:nonce``). Direct on-chain reads (balance
via SOL/USDC RPC, ``program.account.X.fetch``) are gated behind the
``rein[chain]`` extra (``solders`` dep) and land in v0.2.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from rein.auth.token import parse_token
from rein.errors import ReinError
from rein.service.http import ServiceHttp
from rein.types import (
    ParsedToken,
    Receipt,
    SpendFail,
    SpendOk,
    SpendOpts,
    SpendOptsTransfer,
    SpendOptsX402,
    SpendResult,
    StepUpResult,
)


def _default_service_url(env: str) -> str:
    if env == "dev":
        return "http://127.0.0.1:8787"
    return "https://api.rein.so"


def _maybe(d: dict[str, Any], k: str) -> Any:
    return d.get(k) if isinstance(d, dict) else None


class Rein:
    """Single-vault client; create one per vault."""

    vault: str
    token: ParsedToken
    service_url: str
    http: ServiceHttp

    def __init__(
        self,
        *,
        vault: str,
        token: str,
        service_url: Optional[str] = None,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        if not isinstance(vault, str):
            raise ReinError("ErrConfig", {"reason": "vault must be a string"})
        if not isinstance(token, str):
            raise ReinError("ErrConfig", {"reason": "token must be a string"})

        parsed = parse_token(token)
        if parsed.payload.vault != vault:
            raise ReinError(
                "ErrConfig",
                {
                    "reason": "token vault mismatch",
                    "expected": vault,
                    "tokenVault": parsed.payload.vault,
                },
            )

        url = service_url or _default_service_url(parsed.env)
        if not (url.startswith("http://") or url.startswith("https://")):
            raise ReinError("ErrConfig", {"reason": "service_url must be http(s)"})

        self.vault = vault
        self.token = parsed
        self.service_url = url
        self.http = ServiceHttp(
            service_url=url, token=parsed, client=http_client
        )
        self._disposed = False

    async def aclose(self) -> None:
        self._disposed = True
        await self.http.aclose()

    async def __aenter__(self) -> "Rein":
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.aclose()

    def has_scope(self, scope: str) -> bool:
        return scope in self.token.payload.scopes

    @property
    def is_disposed(self) -> bool:
        return self._disposed

    def _assert_alive(self) -> None:
        if self._disposed:
            raise ReinError("ErrConfig", {"reason": "Rein client has been disposed"})

    # ─── Reads (service-mediated in v0.1) ─────────────────────────────

    async def receipt(self, id_or_nonce: str) -> Optional[Receipt]:
        """Fetch a single receipt by nonce (numeric string)."""
        self._assert_alive()
        # v0.1: only nonce lookup via service. PDA-based + tx-signature
        # lookups land in v0.2 with the ``chain`` extra.
        if not id_or_nonce.isdigit():
            raise ReinError(
                "ErrConfig",
                {"reason": "v0.1 only supports nonce lookup; install rein[chain] for PDA lookup"},
            )
        body = await self.http.get(
            f"/v1/receipts/{id_or_nonce}?vault={self.vault}"
        )
        if isinstance(body, dict) and body.get("error"):
            return None
        if not isinstance(body, dict):
            return None
        return Receipt(
            id=body["id"],
            signature=body.get("signature", ""),
            vault=body["vault"],
            amount=int(body["amount"]),
            recipient=body["recipient"],
            ts=datetime.fromtimestamp(int(body["ts"]), tz=timezone.utc),
            policy_version=int(body["policyVersion"]),
            nonce=int(body["nonce"]),
            x402_url_hash=body.get("x402UrlHash") or None,
            disputed=bool(body["disputed"]),
        )

    # ─── Writes ───────────────────────────────────────────────────────

    async def spend(self, opts: SpendOpts) -> SpendResult:
        """Service-mediated spend (transfer or x402)."""
        self._assert_alive()
        if not self.has_scope("spend"):
            return SpendFail(
                ok=False, reason="ErrTokenScope", details="token missing `spend` scope"
            )

        if isinstance(opts, SpendOptsTransfer):
            body = await self.http.post(
                "/v1/spend",
                {"recipient": opts.recipient, "amount": str(opts.amount)},
            )
            if body.get("ok") is True:
                return SpendOk(
                    ok=True,
                    receipt_id=body["receiptPda"],
                    signature=body["signature"],
                    amount=int(body["amount"]),
                    recipient=body["recipient"],
                    policy_version=int(body["policyVersion"]),
                    confirmed_at=datetime.now(timezone.utc),
                )
            return SpendFail(
                ok=False,
                reason=body.get("reason", "ErrService"),
                stage=body.get("stage"),
            )

        # x402
        max_amount = (
            opts.max_amount
            if opts.max_amount is not None
            else 2**53 - 1  # MAX_SAFE_INTEGER analogue
        )
        body = await self.http.post(
            "/v1/x402/spend",
            {
                "url": opts.url,
                "maxAmount": str(max_amount),
                "method": opts.method,
                "body": opts.body,
                "headers": opts.headers,
            },
        )
        if body.get("ok") is True:
            receipt = body["receipt"]
            return SpendOk(
                ok=True,
                receipt_id=receipt["receiptPda"],
                signature=receipt["signature"],
                amount=int(receipt["amount"]),
                recipient=receipt["recipient"],
                content=body.get("content"),
                content_type=body.get("contentType"),
                policy_version=int(receipt["policyVersion"]),
                confirmed_at=datetime.now(timezone.utc),
            )
        return SpendFail(
            ok=False,
            reason=body.get("reason", "ErrService"),
            stage=body.get("stage"),
            details=body.get("details"),
        )

    async def request_step_up(
        self,
        *,
        amount: int,
        recipient: str,
        ttl_secs: Optional[int] = None,
        reason: Optional[str] = None,
    ) -> StepUpResult:
        """v0.1: not implemented in pure-Python mode (needs solders for signing).

        Install ``rein[chain]`` for direct-mode signing in v0.2. For now, owners
        can use the dashboard's step-up UI.
        """
        self._assert_alive()
        raise ReinError(
            "ErrConfig",
            {
                "reason": "request_step_up requires the chain extra; "
                "install with `pip install rein[chain]` (v0.2+)",
            },
        )

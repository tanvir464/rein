import base64
import json
import time

import httpx
import pytest

from rein import ReinError, parse_token
from rein.service.http import ServiceHttp


def _b64u(s: str) -> str:
    return base64.urlsafe_b64encode(s.encode("utf-8")).decode("ascii").rstrip("=")


def make_token_str(*, exp=None, kid="01abcdef"):
    if exp is None:
        exp = int(time.time()) + 3600
    payload = {"vault": "vault1", "scopes": ["spend", "read"], "exp": exp, "nonce": "n"}
    return f"rein_dev_{kid}.{_b64u(json.dumps(payload))}.sig"


def make_client(handler):
    """Build an httpx.AsyncClient with a transport that calls ``handler``
    for every request — use this to mock service responses.
    """
    transport = httpx.MockTransport(handler)
    return httpx.AsyncClient(transport=transport)


@pytest.mark.asyncio
async def test_get_attaches_bearer_header():
    seen: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.headers.get("authorization", ""))
        return httpx.Response(200, json={"ok": True})

    client = make_client(handler)
    http = ServiceHttp(
        service_url="http://api.test",
        token=parse_token(make_token_str()),
        client=client,
        retry_attempts=1,
    )
    out = await http.get("/v1/me")
    assert out == {"ok": True}
    assert seen[0].startswith("Bearer rein_dev_")
    await client.aclose()


@pytest.mark.asyncio
async def test_post_serializes_json_body():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = request.content
        captured["ct"] = request.headers.get("content-type")
        return httpx.Response(200, json={"ok": True})

    client = make_client(handler)
    http = ServiceHttp(
        service_url="http://api.test",
        token=parse_token(make_token_str()),
        client=client,
        retry_attempts=1,
    )
    await http.post("/v1/spend", {"recipient": "r", "amount": "1"})
    assert json.loads(captured["body"]) == {"recipient": "r", "amount": "1"}
    assert captured["ct"] == "application/json"
    await client.aclose()


@pytest.mark.asyncio
async def test_returns_body_for_422():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            422, json={"ok": False, "stage": "simulate", "reason": "ErrPerTxCap"}
        )

    client = make_client(handler)
    http = ServiceHttp(
        service_url="http://api.test",
        token=parse_token(make_token_str()),
        client=client,
        retry_attempts=1,
    )
    out = await http.post("/v1/spend", {})
    assert out == {"ok": False, "stage": "simulate", "reason": "ErrPerTxCap"}
    await client.aclose()


@pytest.mark.asyncio
async def test_retries_on_5xx():
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] < 3:
            return httpx.Response(500, text="boom")
        return httpx.Response(200, json={"ok": True})

    client = make_client(handler)
    http = ServiceHttp(
        service_url="http://api.test",
        token=parse_token(make_token_str()),
        client=client,
        retry_attempts=3,
        retry_backoff_ms=1,
    )
    out = await http.get("/v1/me")
    assert out == {"ok": True}
    assert calls["n"] == 3
    await client.aclose()


@pytest.mark.asyncio
async def test_no_retry_on_401():
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(401, text="nope")

    client = make_client(handler)
    http = ServiceHttp(
        service_url="http://api.test",
        token=parse_token(make_token_str()),
        client=client,
        retry_attempts=3,
        retry_backoff_ms=1,
    )
    with pytest.raises(ReinError) as e:
        await http.get("/v1/me")
    assert e.value.code == "ErrUnauthorized"
    assert calls["n"] == 1
    await client.aclose()


@pytest.mark.asyncio
async def test_no_retry_on_400():
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(400, json={"error": "bad input"})

    client = make_client(handler)
    http = ServiceHttp(
        service_url="http://api.test",
        token=parse_token(make_token_str()),
        client=client,
        retry_attempts=3,
        retry_backoff_ms=1,
    )
    with pytest.raises(ReinError) as e:
        await http.post("/v1/spend", {})
    assert e.value.code == "ErrConfig"
    assert calls["n"] == 1
    await client.aclose()


@pytest.mark.asyncio
async def test_proactive_refresh_when_token_near_expiry():
    expiring_soon = make_token_str(exp=int(time.time()) + 30)
    fresh = make_token_str(exp=int(time.time()) + 7200, kid="feedface")
    refreshed_to: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if "/v1/auth/refresh" in str(request.url):
            return httpx.Response(200, json={"token": fresh})
        return httpx.Response(200, json={"ok": True})

    client = make_client(handler)

    def on_refresh(t):
        refreshed_to["kid"] = t.kid

    http = ServiceHttp(
        service_url="http://api.test",
        token=parse_token(expiring_soon),
        client=client,
        retry_attempts=1,
        on_token_refresh=on_refresh,
    )
    await http.get("/v1/me")
    assert refreshed_to.get("kid") == "feedface"
    await client.aclose()

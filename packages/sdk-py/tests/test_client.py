import base64
import json
import time

import httpx
import pytest

from rein import Rein, ReinError
from rein.types import SpendOptsTransfer, SpendOptsX402


def _b64u(s: str) -> str:
    return base64.urlsafe_b64encode(s.encode("utf-8")).decode("ascii").rstrip("=")


VAULT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"


def make_token(vault=VAULT, scopes=("spend", "read"), env="dev"):
    payload = {
        "vault": vault,
        "scopes": list(scopes),
        "exp": int(time.time()) + 3600,
        "nonce": "n",
    }
    return f"rein_{env}_01abcdef.{_b64u(json.dumps(payload))}.sig"


def test_rejects_token_vault_mismatch():
    with pytest.raises(ReinError) as e:
        Rein(vault=VAULT, token=make_token(vault="OTHER_VAULT"))
    assert e.value.code == "ErrConfig"


def test_rejects_bad_service_url():
    with pytest.raises(ReinError):
        Rein(vault=VAULT, token=make_token(), service_url="ftp://nope")


def test_has_scope():
    r = Rein(vault=VAULT, token=make_token(scopes=["spend"]))
    assert r.has_scope("spend") is True
    assert r.has_scope("read") is False


@pytest.mark.asyncio
async def test_spend_transfer_happy_path():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "ok": True,
                "signature": "SIG",
                "receiptPda": "PDA",
                "nonce": "1",
                "amount": "100",
                "policyVersion": 7,
                "recipient": "REC",
            },
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    rein = Rein(
        vault=VAULT, token=make_token(), service_url="http://api.test", http_client=client
    )
    result = await rein.spend(
        SpendOptsTransfer(kind="transfer", recipient="REC", amount=100)
    )
    assert result.ok is True
    assert result.signature == "SIG"
    assert result.receipt_id == "PDA"
    assert result.amount == 100
    assert result.policy_version == 7
    await rein.aclose()


@pytest.mark.asyncio
async def test_spend_transfer_policy_reject_returns_fail():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            422,
            json={"ok": False, "stage": "simulate", "reason": "ErrPerTxCap"},
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    rein = Rein(
        vault=VAULT, token=make_token(), service_url="http://api.test", http_client=client
    )
    result = await rein.spend(
        SpendOptsTransfer(kind="transfer", recipient="REC", amount=999)
    )
    assert result.ok is False
    assert result.reason == "ErrPerTxCap"
    assert result.stage == "simulate"
    await rein.aclose()


@pytest.mark.asyncio
async def test_spend_x402_happy_path():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "ok": True,
                "content": {"found": True},
                "contentType": "application/json",
                "receipt": {
                    "signature": "SIG",
                    "receiptPda": "PDA",
                    "nonce": "1",
                    "amount": "5000",
                    "policyVersion": 1,
                    "recipient": "PAY",
                },
                "requirement": {
                    "facilitator": "coinbase",
                    "scheme": "exact",
                    "network": "solana-devnet",
                    "asset": "X",
                    "amountMicro": "5000",
                    "recipient": "PAY",
                },
            },
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    rein = Rein(
        vault=VAULT, token=make_token(), service_url="http://api.test", http_client=client
    )
    result = await rein.spend(
        SpendOptsX402(kind="x402", url="http://api/x", max_amount=10_000)
    )
    assert result.ok is True
    assert result.content == {"found": True}
    assert result.content_type == "application/json"
    assert result.amount == 5_000
    await rein.aclose()


@pytest.mark.asyncio
async def test_disposed_client_rejects():
    rein = Rein(vault=VAULT, token=make_token())
    await rein.aclose()
    with pytest.raises(ReinError) as e:
        await rein.spend(SpendOptsTransfer(kind="transfer", recipient="R", amount=1))
    assert e.value.code == "ErrConfig"
    assert "disposed" in (e.value.details or {}).get("reason", "")

import base64
import json

from rein import encode_payment_header
from rein.x402.parser import Requirement


def b64u_decode_to_str(s: str) -> str:
    padding = (-len(s)) % 4
    return base64.urlsafe_b64decode(s + ("=" * padding)).decode("utf-8")


def make_req():
    return Requirement(
        facilitator="coinbase",
        scheme="exact",
        network="solana-devnet",
        asset="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        amount=10_000,
        recipient="A",
        raw={},
    )


def test_produces_valid_b64u_envelope():
    h = encode_payment_header(
        requirement=make_req(), signature="SIGN", receipt_pda="PDA"
    )
    assert "=" not in h
    assert "+" not in h
    assert "/" not in h
    parsed = json.loads(b64u_decode_to_str(h))
    assert parsed["scheme"] == "exact"
    assert parsed["network"] == "solana-devnet"
    assert parsed["payload"]["signature"] == "SIGN"
    assert parsed["payload"]["receiptPda"] == "PDA"


def test_includes_optional_transaction():
    h = encode_payment_header(
        requirement=make_req(), signature="S", transaction_base58="TX"
    )
    parsed = json.loads(b64u_decode_to_str(h))
    assert parsed["payload"]["transaction"] == "TX"
    assert "receiptPda" not in parsed["payload"]


def test_passes_extra_payload_fields():
    h = encode_payment_header(
        requirement=make_req(),
        signature="S",
        extra={"facilitatorHint": "payai"},
    )
    parsed = json.loads(b64u_decode_to_str(h))
    assert parsed["payload"]["facilitatorHint"] == "payai"

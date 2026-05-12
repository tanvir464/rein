"""Build the value of the ``X-Payment`` HTTP header per the x402 spec."""

from __future__ import annotations

import base64
import json
from typing import Any, Optional

from rein.x402.parser import Requirement


def _b64u_encode(s: str) -> str:
    """Encode a UTF-8 string as base64url without padding."""
    return base64.urlsafe_b64encode(s.encode("utf-8")).decode("ascii").rstrip("=")


def encode_payment_header(
    *,
    requirement: Requirement,
    signature: str,
    transaction_base58: Optional[str] = None,
    receipt_pda: Optional[str] = None,
    extra: Optional[dict[str, Any]] = None,
) -> str:
    """Per Coinbase x402 v0.3 envelope:
    ``base64url(JSON({ scheme, network, payload: { signature, transaction?, receiptPda?, ... } }))``.
    """
    payload: dict[str, Any] = {"signature": signature}
    if transaction_base58 is not None:
        payload["transaction"] = transaction_base58
    if receipt_pda is not None:
        payload["receiptPda"] = receipt_pda
    if extra:
        payload.update(extra)

    envelope = {
        "scheme": requirement.scheme,
        "network": requirement.network,
        "payload": payload,
    }
    return _b64u_encode(json.dumps(envelope, separators=(",", ":")))

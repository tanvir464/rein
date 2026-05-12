"""Parse 402 payment requirements from Coinbase / PayAI / Corbits facilitators.

Mirrors ``packages/sdk-ts/src/x402/parser.ts``. Anything that doesn't match
emerges as ``facilitator='unknown'`` so the caller can decide whether to
surface or reject.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal, Optional

Facilitator = Literal["coinbase", "payai", "corbits", "unknown"]


@dataclass(frozen=True)
class Requirement:
    facilitator: str
    scheme: str
    network: str
    asset: str
    amount: int
    recipient: str
    expires_at: Optional[datetime] = None
    description: Optional[str] = None
    raw: Any = None


def _to_int(v: Any) -> Optional[int]:
    if isinstance(v, int) and not isinstance(v, bool):
        return v
    if isinstance(v, float):
        return int(v)
    if isinstance(v, str) and v.isdigit():
        return int(v)
    return None


def _detect_facilitator(envelope: dict[str, Any], entry: dict[str, Any]) -> str:
    extra = entry.get("extra")
    if isinstance(extra, dict):
        f = extra.get("facilitator")
        if isinstance(f, str):
            f_low = f.lower()
            if f_low in {"payai", "corbits", "coinbase"}:
                return f_low

    asset = entry.get("asset", "")
    if isinstance(asset, str) and asset.startswith("corbits:"):
        return "corbits"

    if "x402Version" in envelope:
        return "coinbase"

    return "unknown"


def _parse_entry(envelope: dict[str, Any], entry: dict[str, Any]) -> Optional[Requirement]:
    scheme = entry.get("scheme") if isinstance(entry.get("scheme"), str) else "exact"
    network = entry.get("network") if isinstance(entry.get("network"), str) else None
    asset = entry.get("asset") if isinstance(entry.get("asset"), str) else None
    recipient = (
        entry.get("payTo")
        if isinstance(entry.get("payTo"), str)
        else entry.get("recipient")
        if isinstance(entry.get("recipient"), str)
        else entry.get("payee")
        if isinstance(entry.get("payee"), str)
        else None
    )
    amount = (
        _to_int(entry.get("maxAmountRequired"))
        if entry.get("maxAmountRequired") is not None
        else _to_int(entry.get("amount"))
        if entry.get("amount") is not None
        else _to_int(entry.get("amountMicro"))
    )

    if not network or not asset or not recipient or amount is None:
        return None

    expires_at_raw = entry.get("expiresAt") or entry.get("expires_at")
    expires_at: Optional[datetime] = None
    if isinstance(expires_at_raw, str):
        try:
            # Accept ISO 8601 with 'Z' suffix (Python 3.11+ handles this).
            expires_at = datetime.fromisoformat(expires_at_raw.replace("Z", "+00:00"))
        except ValueError:
            expires_at = None

    description = entry.get("description") if isinstance(entry.get("description"), str) else None

    return Requirement(
        facilitator=_detect_facilitator(envelope, entry),
        scheme=scheme or "exact",
        network=network,
        asset=asset,
        amount=amount,
        recipient=recipient,
        expires_at=expires_at,
        description=description,
        raw=entry,
    )


def parse_payment_requirements(body: Any) -> list[Requirement]:
    """Normalize a 402 body into a list of ``Requirement``s."""
    if not isinstance(body, dict):
        return []

    entries: Optional[list[Any]] = None
    if isinstance(body.get("accepts"), list):
        entries = body["accepts"]
    elif isinstance(body.get("paymentRequirements"), list):
        entries = body["paymentRequirements"]
    elif isinstance(body.get("requirements"), list):
        entries = body["requirements"]

    if entries is None:
        return []

    out: list[Requirement] = []
    for entry in entries:
        if isinstance(entry, dict):
            r = _parse_entry(body, entry)
            if r is not None:
                out.append(r)
    return out

"""Filter + select the cheapest acceptable 402 requirement."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Optional

from rein.x402.parser import Requirement

SUPPORTED_USDC_MINTS: frozenset[str] = frozenset(
    {
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  # mainnet USDC
        "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",  # devnet USDC
    }
)
SUPPORTED_NETWORKS: frozenset[str] = frozenset(
    {"solana-mainnet", "solana-devnet", "solana"}
)


@dataclass(frozen=True)
class SelectFilter:
    max_amount: int
    allowlist: Optional[list[str]] = None
    networks: Optional[frozenset[str]] = None
    assets: Optional[frozenset[str]] = None


def select_acceptable(
    requirements: Iterable[Requirement], filter_: SelectFilter
) -> Optional[Requirement]:
    """Per F16 §7.2: filter to (Solana, USDC, ≤ max_amount, allowlisted), then
    pick the cheapest. Returns ``None`` when the filter pipeline empties.
    """
    networks = filter_.networks or SUPPORTED_NETWORKS
    assets = filter_.assets or SUPPORTED_USDC_MINTS
    allow_set = (
        frozenset(filter_.allowlist) if filter_.allowlist else None
    )
    now = datetime.now(timezone.utc)

    candidates = []
    for r in requirements:
        if r.network not in networks:
            continue
        if r.asset not in assets:
            continue
        if r.amount > filter_.max_amount:
            continue
        if allow_set is not None and r.recipient not in allow_set:
            continue
        if r.expires_at is not None:
            ea = r.expires_at
            if ea.tzinfo is None:
                ea = ea.replace(tzinfo=timezone.utc)
            if ea <= now:
                continue
        candidates.append(r)

    if not candidates:
        return None

    candidates.sort(key=lambda r: r.amount)
    return candidates[0]

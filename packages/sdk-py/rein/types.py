"""Public dataclasses for the Python SDK.

Matches the TypeScript SDK's public type surface. Where TS uses bigint, we use
``int``; where TS uses ``Date``, we use ``datetime``; where TS uses ``PublicKey``,
we use ``str`` (base58).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal, Optional, Union

Cluster = Literal["devnet", "mainnet-beta", "localnet", "testnet"]
Env = Literal["dev", "devnet", "production"]
Scope = Literal["spend", "read", "step_up_approve"]


@dataclass(frozen=True)
class TokenPayload:
    vault: str
    scopes: list[str]
    exp: int
    nonce: str


@dataclass(frozen=True)
class ParsedToken:
    raw: str
    env: str
    kid: str
    payload: TokenPayload
    signature: str


@dataclass(frozen=True)
class Policy:
    version: int
    daily_cap: int
    per_tx_cap: int
    allowlist: list[str]
    step_up_threshold: int
    expiry_ts: int
    paused: bool


@dataclass(frozen=True)
class Receipt:
    id: str
    signature: str
    vault: str
    amount: int
    recipient: str
    ts: datetime
    policy_version: int
    nonce: int
    x402_url_hash: Optional[str]
    disputed: bool


# ─── SpendOpts (discriminated union) ─────────────────────────────────


@dataclass(frozen=True)
class SpendOptsX402:
    kind: Literal["x402"]
    url: str
    max_amount: Optional[int] = None
    method: Optional[Literal["GET", "POST"]] = None
    body: Any = None
    headers: Optional[dict[str, str]] = None
    priority_fee: Optional[bool] = None
    commitment: Optional[Literal["confirmed", "finalized"]] = None
    idempotency_key: Optional[str] = None


@dataclass(frozen=True)
class SpendOptsTransfer:
    kind: Literal["transfer"]
    recipient: str
    amount: int
    memo: Optional[str] = None
    priority_fee: Optional[bool] = None
    commitment: Optional[Literal["confirmed", "finalized"]] = None
    idempotency_key: Optional[str] = None


SpendOpts = Union[SpendOptsX402, SpendOptsTransfer]


# ─── SpendResult (discriminated union) ────────────────────────────────


@dataclass(frozen=True)
class SpendOk:
    ok: Literal[True]
    receipt_id: str
    signature: str
    amount: int
    recipient: str
    policy_version: int
    confirmed_at: datetime
    content: Any = None
    content_type: Optional[str] = None


@dataclass(frozen=True)
class SpendFail:
    ok: Literal[False]
    reason: str
    stage: Optional[str] = None
    details: Optional[str] = None
    suggested_step_up: Optional[dict[str, int]] = None


SpendResult = Union[SpendOk, SpendFail]


# ─── Step-up ────────────────────────────────────────────────────────


@dataclass(frozen=True)
class StepUpOpts:
    amount: int
    recipient: str
    reason: Optional[str] = None
    ttl_secs: Optional[int] = None


@dataclass(frozen=True)
class StepUpResult:
    request_pda: str
    expires_at: datetime
    signature: str


# ─── Simulation ─────────────────────────────────────────────────────


@dataclass(frozen=True)
class SimulationOk:
    ok: Literal[True]
    will_cost: int
    daily_spent_after: int


@dataclass(frozen=True)
class SimulationFail:
    ok: Literal[False]
    reason: str
    suggested_step_up: Optional[dict[str, int]] = None
    details: Optional[str] = None


SimulationOutcome = Union[SimulationOk, SimulationFail]


# ─── Activity events (mirror TS ActivityEvent union) ────────────────


@dataclass(frozen=True)
class ActivityEvent:
    """Generic shape — concrete events are dicts decoded from the WS stream."""

    type: str
    ts: datetime
    payload: dict[str, Any] = field(default_factory=dict)

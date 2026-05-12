"""Off-chain mirror of the F3 ``spend`` instruction handler.

PARITY CONTRACT:
   Must produce the same ``(ok, reason)`` outcome as
   ``packages/sdk-ts/src/policy/simulate.ts`` and the Anchor program for every
   case in ``specs/features/F16-fixtures/policy-cases.json``. The CI parity
   gate enforces this — see ``tests/test_parity.py`` and the TS counterpart.

ASYMMETRY RULE:
   The simulator may reject what the program would accept (extra caution),
   but MUST NEVER accept what the program would reject. Time-based checks
   are approximated to the day boundary; this can only reject earlier than
   the program would, never later.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional, Union

SECONDS_PER_DAY = 86_400

SimReason = Literal[
    "ErrAmountZero",
    "ErrPaused",
    "ErrExpired",
    "ErrPerTxCap",
    "ErrRecipientNotAllowed",
    "ErrRecipientBlocked",
    "ErrStepUpRequired",
    "ErrStepUpExpired",
    "ErrStepUpMismatch",
    "ErrDailyCap",
    "ErrCounterDayMismatch",
]


@dataclass(frozen=True)
class _PolicyState:
    paused: bool
    expiry_ts: int
    per_tx_cap: int
    daily_cap: int
    step_up_threshold: int
    allowlist_len: int
    allowlist: list[str]
    version: int


@dataclass(frozen=True)
class _Blocklist:
    len: int
    entries: list[str]


@dataclass(frozen=True)
class _DailyCounter:
    spent: int


@dataclass(frozen=True)
class _StepUp:
    vault: str
    amount: int
    recipient: str
    nonce: int
    expires_at: int
    approved: bool


@dataclass(frozen=True)
class SimulatorState:
    policy: _PolicyState
    blocklist: _Blocklist
    daily_counter: _DailyCounter
    step_up_request: Optional[_StepUp]
    on_chain_day: int

    @staticmethod
    def make(
        *,
        paused: bool = False,
        expiry_ts: int = 0,
        per_tx_cap: int = 500_000,
        daily_cap: int = 5_000_000,
        step_up_threshold: int = 1_000_000,
        allowlist: Optional[list[str]] = None,
        allowlist_len: Optional[int] = None,
        version: int = 1,
        blocklist: Optional[list[str]] = None,
        blocklist_len: Optional[int] = None,
        spent: int = 0,
        step_up_request: Optional[_StepUp] = None,
        on_chain_day: int = 20212,
    ) -> "SimulatorState":
        allowlist = allowlist or []
        blocklist = blocklist or []
        return SimulatorState(
            policy=_PolicyState(
                paused=paused,
                expiry_ts=expiry_ts,
                per_tx_cap=per_tx_cap,
                daily_cap=daily_cap,
                step_up_threshold=step_up_threshold,
                allowlist_len=allowlist_len if allowlist_len is not None else len(allowlist),
                allowlist=allowlist,
                version=version,
            ),
            blocklist=_Blocklist(
                len=blocklist_len if blocklist_len is not None else len(blocklist),
                entries=blocklist,
            ),
            daily_counter=_DailyCounter(spent=spent),
            step_up_request=step_up_request,
            on_chain_day=on_chain_day,
        )


@dataclass(frozen=True)
class SimulatorRequest:
    amount: int
    recipient: str
    nonce: int
    day: int


@dataclass(frozen=True)
class _Ok:
    ok: Literal[True]
    will_cost: int
    daily_spent_after: int


@dataclass(frozen=True)
class _Fail:
    ok: Literal[False]
    reason: str
    suggested_step_up: Optional[dict[str, int]] = None


SimulationResult = Union[_Ok, _Fail]


def simulate(state: SimulatorState, request: SimulatorRequest) -> SimulationResult:
    """Replicate the F3 ``spend`` handler's check order exactly.

    The order matters — both the TS simulator and the Anchor program report
    the *first* check that trips. Re-ordering would change which
    ``ErrXxx`` callers see in priority cases.
    """
    # 0. day mismatch — program checks this first in the handler
    if request.day != state.on_chain_day:
        return _Fail(False, "ErrCounterDayMismatch")

    # 1. paused
    if state.policy.paused:
        return _Fail(False, "ErrPaused")

    # 2. expiry — approximated to day boundary; fail-closed
    if state.policy.expiry_ts != 0:
        now_sec = state.on_chain_day * SECONDS_PER_DAY
        if now_sec >= state.policy.expiry_ts:
            return _Fail(False, "ErrExpired")

    # 3. per-tx cap (incl. zero check)
    if request.amount <= 0:
        return _Fail(False, "ErrAmountZero")
    if request.amount > state.policy.per_tx_cap:
        return _Fail(False, "ErrPerTxCap")

    # 4. allowlist (empty = wildcard)
    if state.policy.allowlist_len > 0:
        active = state.policy.allowlist[: state.policy.allowlist_len]
        if request.recipient not in active:
            return _Fail(False, "ErrRecipientNotAllowed")

    # 4b. blocklist (overrides allowlist on the deny side)
    if state.blocklist.len > 0:
        active_b = state.blocklist.entries[: state.blocklist.len]
        if request.recipient in active_b:
            return _Fail(False, "ErrRecipientBlocked")

    # 5. step-up
    if (
        state.policy.step_up_threshold > 0
        and request.amount > state.policy.step_up_threshold
    ):
        req = state.step_up_request
        if req is None:
            return _Fail(
                False,
                "ErrStepUpRequired",
                suggested_step_up={
                    "amount": request.amount,
                    "threshold": state.policy.step_up_threshold,
                },
            )
        if (
            req.amount != request.amount
            or req.nonce != request.nonce
            or req.recipient != request.recipient
        ):
            return _Fail(False, "ErrStepUpMismatch")
        if not req.approved:
            return _Fail(False, "ErrStepUpRequired")
        now_sec = state.on_chain_day * SECONDS_PER_DAY
        if now_sec >= req.expires_at:
            return _Fail(False, "ErrStepUpExpired")

    # 6. daily cap
    new_spent = state.daily_counter.spent + request.amount
    if new_spent > state.policy.daily_cap:
        return _Fail(False, "ErrDailyCap")

    return _Ok(True, request.amount, new_spent)

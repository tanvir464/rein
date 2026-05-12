"""Hand-written simulator tests, mirroring the TS Vitest suite.

The bulk of the parity check lives in ``test_parity.py``, which runs the
shared ``policy-cases.json`` fixture. This file exercises the API at a higher
level (constructor helpers, edge cases close to the boundary) for direct
debugging.
"""

from rein import simulate
from rein.policy.simulate import SimulatorRequest, SimulatorState

ALICE = "11111111111111111111111111111112"
BOB = "So11111111111111111111111111111111111111112"
VAULT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"


def base_state(**over):
    defaults = dict(
        per_tx_cap=500_000,
        daily_cap=5_000_000,
        step_up_threshold=1_000_000,
        on_chain_day=20212,
    )
    defaults.update(over)
    return SimulatorState.make(**defaults)


def base_request(**over):
    defaults = dict(amount=300_000, recipient=ALICE, nonce=1, day=20212)
    defaults.update(over)
    return SimulatorRequest(**defaults)


def test_happy_path_within_caps():
    r = simulate(base_state(), base_request())
    assert r.ok is True
    assert r.will_cost == 300_000
    assert r.daily_spent_after == 300_000


def test_paused():
    r = simulate(base_state(paused=True), base_request())
    assert r.ok is False
    assert r.reason == "ErrPaused"


def test_amount_zero():
    r = simulate(base_state(), base_request(amount=0))
    assert r.ok is False
    assert r.reason == "ErrAmountZero"


def test_per_tx_cap_overflow():
    r = simulate(base_state(per_tx_cap=500_000), base_request(amount=600_000))
    assert r.ok is False
    assert r.reason == "ErrPerTxCap"


def test_daily_cap_overflow():
    r = simulate(base_state(daily_cap=5_000_000), base_request(amount=500_000))
    # daily cap not reached
    assert r.ok is True

    r2 = simulate(
        SimulatorState.make(
            per_tx_cap=500_000, daily_cap=5_000_000, step_up_threshold=1_000_000,
            spent=4_800_000, on_chain_day=20212,
        ),
        base_request(amount=500_000),
    )
    assert r2.ok is False
    assert r2.reason == "ErrDailyCap"


def test_allowlist_match():
    r = simulate(
        base_state(allowlist=[ALICE]),
        base_request(recipient=ALICE),
    )
    assert r.ok is True


def test_allowlist_no_match():
    r = simulate(
        base_state(allowlist=[BOB]),
        base_request(recipient=ALICE),
    )
    assert r.ok is False
    assert r.reason == "ErrRecipientNotAllowed"


def test_blocklist_match():
    r = simulate(
        base_state(blocklist=[ALICE]),
        base_request(recipient=ALICE),
    )
    assert r.ok is False
    assert r.reason == "ErrRecipientBlocked"


def test_step_up_required_no_request():
    r = simulate(
        base_state(step_up_threshold=100_000),
        base_request(amount=200_000),
    )
    assert r.ok is False
    assert r.reason == "ErrStepUpRequired"
    assert r.suggested_step_up == {"amount": 200_000, "threshold": 100_000}


def test_day_mismatch():
    r = simulate(base_state(on_chain_day=20212), base_request(day=99_999))
    assert r.ok is False
    assert r.reason == "ErrCounterDayMismatch"


def test_priority_paused_beats_per_tx():
    r = simulate(
        base_state(paused=True),
        base_request(amount=999_999_999),
    )
    assert r.ok is False
    assert r.reason == "ErrPaused"

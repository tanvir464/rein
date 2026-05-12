"""Parity gate — Python simulator vs the shared policy-cases.json fixture.

Same fixture is consumed by:
  - ``packages/sdk-ts/tests/parity/policy-cases.test.ts``
  - This file
  - (planned) ``program/tests/parity_simulator.rs``

If any one of them produces a different ``(ok, reason)`` for any case, CI fails.

To regenerate the fixture (rare):
  ``corepack pnpm -F @rein/sdk exec tsx scripts/gen-policy-cases.ts``
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from rein.policy.simulate import (
    SimulatorRequest,
    SimulatorState,
    _StepUp,
    simulate,
)

FIXTURE = Path(__file__).resolve().parents[3] / "specs" / "features" / "F16-fixtures" / "policy-cases.json"


def _load_bundle():
    with open(FIXTURE, encoding="utf-8") as f:
        bundle = json.load(f)
    assert bundle["schemaVersion"] == 1
    return bundle


def _state_from_wire(w: dict) -> SimulatorState:
    pol = w["policy"]
    bl = w["blocklist"]
    su_w = w.get("stepUpRequest")
    step_up = (
        _StepUp(
            vault=su_w["vault"],
            amount=int(su_w["amount"]),
            recipient=su_w["recipient"],
            nonce=int(su_w["nonce"]),
            expires_at=int(su_w["expiresAt"]),
            approved=bool(su_w["approved"]),
        )
        if su_w
        else None
    )
    return SimulatorState.make(
        paused=pol["paused"],
        expiry_ts=int(pol["expiryTs"]),
        per_tx_cap=int(pol["perTxCap"]),
        daily_cap=int(pol["dailyCap"]),
        step_up_threshold=int(pol["stepUpThreshold"]),
        allowlist=list(pol["allowlist"]),
        allowlist_len=int(pol["allowlistLen"]),
        version=int(pol["version"]),
        blocklist=list(bl["entries"]),
        blocklist_len=int(bl["len"]),
        spent=int(w["dailyCounter"]["spent"]),
        step_up_request=step_up,
        on_chain_day=int(w["onChainDay"]),
    )


def _request_from_wire(w: dict) -> SimulatorRequest:
    return SimulatorRequest(
        amount=int(w["amount"]),
        recipient=w["recipient"],
        nonce=int(w["nonce"]),
        day=int(w["day"]),
    )


_bundle = _load_bundle()
_cases = _bundle["cases"]


def test_fixture_has_at_least_100_cases():
    assert len(_cases) >= 100, f"expected ≥100 cases, got {len(_cases)}"


@pytest.mark.parametrize(
    "case",
    _cases,
    ids=[c["name"] for c in _cases],
)
def test_simulator_parity(case):
    state = _state_from_wire(case["state"])
    request = _request_from_wire(case["request"])
    got = simulate(state, request)
    expected = case["expected"]

    if expected["ok"] is True:
        assert got.ok is True, f"{case['name']}: expected ok, got {got!r}"
        assert str(got.will_cost) == expected["willCost"], case["name"]
        assert str(got.daily_spent_after) == expected["dailySpentAfter"], case["name"]
    else:
        assert got.ok is False, f"{case['name']}: expected reject, got {got!r}"
        assert got.reason == expected["reason"], case["name"]
        if "suggestedStepUp" in expected:
            assert got.suggested_step_up is not None, case["name"]
            assert (
                str(got.suggested_step_up["amount"])
                == expected["suggestedStepUp"]["amount"]
            )
            assert (
                str(got.suggested_step_up["threshold"])
                == expected["suggestedStepUp"]["threshold"]
            )

from datetime import datetime, timedelta, timezone

from rein import SelectFilter, select_acceptable
from rein.x402.parser import Requirement

DEVNET_USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
MAINNET_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"


def req(**over):
    base = dict(
        facilitator="coinbase",
        scheme="exact",
        network="solana-devnet",
        asset=DEVNET_USDC,
        amount=10_000,
        recipient="A",
        raw={},
    )
    base.update(over)
    return Requirement(**base)


def test_returns_none_for_empty():
    assert select_acceptable([], SelectFilter(max_amount=100)) is None


def test_picks_cheapest():
    rs = [
        req(amount=50_000, recipient="A"),
        req(amount=10_000, recipient="B"),
        req(amount=30_000, recipient="C"),
    ]
    r = select_acceptable(rs, SelectFilter(max_amount=100_000))
    assert r is not None and r.recipient == "B" and r.amount == 10_000


def test_filter_max_amount():
    rs = [req(amount=100_000), req(amount=200_000)]
    assert select_acceptable(rs, SelectFilter(max_amount=50_000)) is None


def test_filter_allowlist():
    rs = [req(amount=1_000, recipient="A"), req(amount=500, recipient="B")]
    r = select_acceptable(
        rs, SelectFilter(max_amount=10_000, allowlist=["A"])
    )
    assert r is not None and r.recipient == "A"


def test_filter_network_solana_only():
    rs = [
        req(network="base-mainnet", asset=DEVNET_USDC),
        req(network="solana-mainnet", asset=MAINNET_USDC, amount=5_000),
    ]
    r = select_acceptable(rs, SelectFilter(max_amount=10_000))
    assert r is not None and r.network == "solana-mainnet"


def test_filter_asset_usdc_only():
    rs = [
        req(asset="OtherMint111111111111111111111111111111111"),
        req(asset=DEVNET_USDC, amount=7_000),
    ]
    r = select_acceptable(rs, SelectFilter(max_amount=10_000))
    assert r is not None and r.asset == DEVNET_USDC


def test_rejects_expired():
    past = datetime.now(timezone.utc) - timedelta(seconds=10)
    rs = [req(amount=1, expires_at=past), req(amount=5_000)]
    r = select_acceptable(rs, SelectFilter(max_amount=10_000))
    assert r is not None and r.amount == 5_000

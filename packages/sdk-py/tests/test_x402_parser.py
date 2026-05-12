from rein import parse_payment_requirements


def test_parses_coinbase_envelope():
    body = {
        "x402Version": "0.3",
        "accepts": [{
            "scheme": "exact",
            "network": "solana-devnet",
            "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
            "maxAmountRequired": "50000",
            "payTo": "DAuREczTpcXgnRBdaSp5xDvajT2dVhqzrHpRq3RU2NAt",
        }],
    }
    reqs = parse_payment_requirements(body)
    assert len(reqs) == 1
    r = reqs[0]
    assert r.facilitator == "coinbase"
    assert r.network == "solana-devnet"
    assert r.amount == 50_000
    assert r.recipient == "DAuREczTpcXgnRBdaSp5xDvajT2dVhqzrHpRq3RU2NAt"


def test_parses_payai_via_extra():
    body = {
        "x402Version": "0.3",
        "accepts": [{
            "scheme": "exact",
            "network": "solana-mainnet",
            "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "amount": 100_000,
            "payee": "PayaiVault1111111111111111111111111111111111",
            "extra": {"facilitator": "payai"},
        }],
    }
    reqs = parse_payment_requirements(body)
    assert reqs[0].facilitator == "payai"
    assert reqs[0].amount == 100_000


def test_parses_corbits_via_asset_prefix():
    body = {
        "paymentRequirements": [{
            "scheme": "exact",
            "network": "solana-mainnet",
            "asset": "corbits:USDC",
            "amountMicro": "25000",
            "recipient": "CorbitsRecipient1111111111111111111111111111",
        }],
    }
    reqs = parse_payment_requirements(body)
    assert reqs[0].facilitator == "corbits"
    assert reqs[0].amount == 25_000


def test_returns_empty_for_non_object():
    assert parse_payment_requirements(None) == []
    assert parse_payment_requirements("string") == []
    assert parse_payment_requirements(42) == []


def test_returns_empty_for_no_accepts_list():
    assert parse_payment_requirements({"foo": "bar"}) == []


def test_skips_entries_with_missing_fields():
    body = {
        "accepts": [
            {"scheme": "exact"},  # missing network/asset/amount/recipient
            {
                "scheme": "exact",
                "network": "solana-devnet",
                "asset": "X",
                "maxAmountRequired": "1",
                "payTo": "P",
            },
        ],
    }
    assert len(parse_payment_requirements(body)) == 1

# rein — Python SDK

Trust-gated wallet for AI agents on Solana.

```bash
pip install rein
```

## Quickstart

```python
import asyncio
from rein import Rein

async def main():
    rein = Rein(
        vault="<base58 vault PDA>",
        token="rein_devnet_<kid>.<payload>.<sig>",
    )
    bal = await rein.balance()
    print(bal)

    result = await rein.spend(url="https://api.example.com/x402", max_amount=50_000)
    print(result)

asyncio.run(main())
```

## Surface

| Method | Returns |
|---|---|
| `Rein.balance()` | `{ usdc: int, sol: int, updated_at: datetime }` |
| `Rein.spend(...)` | `SpendResult` |
| `Rein.history(limit=50, before=None)` | `list[Receipt]` |
| `Rein.receipt(id_or_nonce)` | `Receipt | None` |
| `Rein.simulate(recipient, amount)` | `SimulationOutcome` |
| `Rein.request_step_up(amount, recipient, ttl_secs=300)` | `StepUpResult` |

## Parity

The Python policy simulator is parity-tested against [`specs/features/F16-fixtures/policy-cases.json`](../../specs/features/F16-fixtures/policy-cases.json) — the same fixture set that gates the TypeScript SDK. Every case must produce the same outcome in both implementations.

Run the parity gate:

```bash
cd packages/sdk-py
pip install -e ".[test]"
pytest tests/test_parity.py -v
```

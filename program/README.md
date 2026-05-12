# REIN Anchor program

Solana program (Anchor 0.31.1) implementing the on-chain policy + spend engine.

## Toolchain (pinned)

- Rust **1.95.0** (`rust-toolchain.toml`)
- Solana CLI **3.1.14** (Agave)
- Anchor **0.31.1**
- Node **22.x** (any LTS) — only needed to run `anchor test` (TS/mocha runner)

Anchor.toml pins anchor_version + solana_version so `anchor` will refuse to build with a drifted toolchain.

## Build / test (run inside WSL on Windows)

```bash
cd program
anchor build
anchor test                                # spins up local validator, runs tests/*.ts
anchor test --provider.cluster devnet      # against devnet (requires deployed program)
```

If a previous run left a stuck validator: `pkill -9 -f solana-test-validator && rm -rf .anchor`.

After adding/renaming an instruction, force a clean IDL rebuild:
`rm -rf target/idl target/types && anchor build` (Anchor's IDL cache occasionally serves stale).

## Program ID

`2QFW8Xg2mrbrLv6JzUdmnczA1G3RkksH8SKmfXxCuwNj` — same on localnet and devnet (per `Anchor.toml`).

Stored at `target/deploy/rein-keypair.json` after `anchor build`. **Never commit `target/`.**

## Workspace

- `programs/rein/src/` — Rust source. Layout: `state/` (accounts), `instructions/` (one file per ix), `events.rs`, `errors.rs`, `constants.rs`, `lib.rs` entrypoint.
- `tests/rein.ts` — per-feature test suites (F1–F6).
- `tests/property.ts` — F7 property test (random spend sequences, accounting invariants).
- `tests/cu-budgets.ts` — F7 compute-unit capture + regression gate.
- `tests/fixtures/` — shared test helpers (mint, wallets, policy args, PDA derivations).
- `migrations/deploy.ts` — Anchor scaffold default deploy hook.

This directory is **not** part of the pnpm workspace — it has its own `package.json` for the test runner only.

## Errors

Mirrors `programs/rein/src/errors.rs`. Anchor numbers `#[error_code]` variants sequentially from `6000` in declaration order.

| Code | # | Message | Owning F# |
|---|---|---|---|
| `ErrAmountZero` | 6000 | amount must be greater than zero | F1 |
| `ErrNotVaultOwner` | 6001 | vault owner does not match signer | F1 |
| `ErrMintMismatch` | 6002 | usdc mint does not match vault binding | F1 |
| `ErrUnauthorized` | 6003 | signer is not authorized for this policy | F2 |
| `ErrAllowlistTooLong` | 6004 | allowlist exceeds max size of 16 | F2 |
| `ErrInvalidPolicy` | 6005 | policy invariants violated (per_tx_cap > 0; daily_cap >= per_tx_cap) | F2 |
| `ErrVersionOverflow` | 6006 | policy version overflow | F2 |
| `ErrExpired` | 6007 | policy expired or expiry in the past | F2 / F3 |
| `ErrPerTxCap` | 6008 | amount exceeds per-transaction cap | F3 |
| `ErrDailyCap` | 6009 | amount would exceed daily cap | F3 |
| `ErrRecipientNotAllowed` | 6010 | recipient is not in policy allowlist | F3 |
| `ErrPaused` | 6011 | vault is paused | F3 / F6 |
| `ErrStepUpRequired` | 6012 | amount exceeds step-up threshold; owner approval required | F3 / F5 |
| `ErrOverflow` | 6013 | arithmetic overflow | F3 |
| `ErrCounterDayMismatch` | 6014 | daily counter day mismatch | F3 |
| `ErrStepUpNotNeeded` | 6015 | amount is below step-up threshold; request not needed | F5 |
| `ErrStepUpExpired` | 6016 | step-up request expired | F5 |
| `ErrStepUpMismatch` | 6017 | step-up approval does not match this spend (vault/amount/recipient/nonce) | F5 |
| `ErrStepUpTtlInvalid` | 6018 | ttl_secs must be > 0 and <= 86400 | F5 |
| `ErrBlocklistFull` | 6019 | blocklist is full (max 8) | F6 |
| `ErrRecipientBlocked` | 6020 | recipient is blocked by a prior dispute | F6 |
| `ErrNotExpiring` | 6021 | policy has no expiry; cannot force-expire | F6 |
| `ErrNotExpired` | 6022 | policy has not yet reached its expiry | F6 |

This table is a derived snapshot of `errors.rs`. After any change to that file, re-run F7's CU test (which prints the table) and refresh this section.

## Compute budgets

Measured by `tests/cu-budgets.ts` against localnet. Targets carry ~30% headroom over observed values; CI fails if any instruction goes over `target × 1.2`.

| Instruction | Measured (CU) | Target | Margin |
|---|---|---|---|
| `init_vault` | 41396 | 70_000 | +28604 |
| `deposit` | 22345 | 45_000 | +22655 |
| `init_policy` | 21433 | 35_000 | +13567 |
| `update_policy` | 8546 | 15_000 | +6454 |
| `spend` | 38232 | 60_000 | +21768 |
| `request_step_up` | 13071 | 20_000 | +6929 |
| `approve_step_up` | 6120 | 10_000 | +3880 |
| `pause` | 7797 | 12_000 | +4203 |
| `dispute` | 9407 | 15_000 | +5593 |
| `expire_policy` | 7722 | 12_000 | +4278 |

All measurements are well under Solana's default 200 000-CU per-tx budget. `spend` is the heaviest path (4 PDA derivations + Box deserialization for ~10 accounts + CPI to `transfer_checked`); 38 k leaves comfortable room for F5 step-up bypass and F6 blocklist checks already factored in.

## WSL note (Windows hosts)

Rust + BPF builds run inside WSL. Building from `/mnt/e/...` (Windows-mounted FS) works but is slow (~2 min cold build). For tighter dev loops, consider rsyncing `program/` to the WSL home filesystem and developing there, then mirroring back for commits.

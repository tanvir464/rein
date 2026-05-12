# REIN

**Trust-gated wallet for AI agents.** Give your AI agent the rein, but keep the reins.

REIN is a Solana-native policy engine + drop-in agent SDK. Set spending rules once on-chain; your agent can spend autonomously up to those limits — through x402 endpoints, traditional APIs, or any MCP-compatible runtime — but cannot exceed them. Every payment is bounded, auditable, and refundable.

**Hackathon:** Solana 100xDevs Frontier · main submission **2026-05-11** (submitted) · Superteam Earn side-tracks (Umbra, GoldRush) **2026-05-26** · target: Colosseum accelerator interview.
**Status:** Live on Solana devnet — frontend at [rein-hackathon-web.vercel.app](https://rein-hackathon-web.vercel.app), worker at [rein-service-devnet.tanvirahmedabd1.workers.dev](https://rein-service-devnet.tanvirahmedabd1.workers.dev) · 11 on-chain instructions · 20+ worker endpoints · 6 runtime SDKs · 300+ tests · dashboard reads + writes are real on-chain · **private spend (Umbra) and treasury-grade insights (GoldRush) shipped 2026-05**.

---

## The problem (validated)

> *"20M monthly x402 transactions execute with zero trust checks. Nobody has built [trust-gated payments middleware]. This is the highest-leverage opportunity in agent commerce."*
> — [Insignia VC, *When Agents Go Shopping*, April 2026](https://insignia.vc)

Three concrete pains the industry currently routes around:

1. **Owners burn hot keys.** Today, giving an agent a wallet means handing it the whole balance with no rules. The standard advice is "use a fresh wallet with a small balance and refill" — that's not a product, that's a workaround.
2. **No audit trail.** Agent spending is invisible until the wallet is empty. No receipts, no per-task cost breakdown, no refund path when an endpoint serves garbage.
3. **No bridge between crypto and traditional APIs.** Most APIs an agent actually wants (OpenAI, AWS, Anthropic, GitHub Pro) don't accept x402. Owners hand over personal keys with no scoping.

---

## What REIN ships

Five things no existing product does together:

- **On-chain policy enforcement.** A Solana Anchor program holds `daily_cap`, `per_tx_cap`, `step_up_threshold`, `allowlist`, `blocklist`, and `paused`. The `spend` instruction *cannot* be made to bypass them — it's not a Solana "you should check" linter, it's a "the runtime rejects you" hard wall. ([program/](program/))
- **Drop-in SDKs for every agent runtime.** `npx @rein/cli init --runtime mcp` configures Claude Code, Cursor, Claude Desktop, LangChain, OpenAI Functions, Vercel AI SDK, and CrewAI in 30 seconds. ([packages/](packages/))
- **Owner dashboard with real-time receipts.** Web app shows every spend within seconds via WebSocket from a Durable Object, with one-click step-up approve / dispute / pause / policy edit. ([apps/web/](apps/web/))
- 🛡️ **Private spend (REIN × Umbra).** One toggle flips a vault from the public spend path onto Umbra's shielded UTXO pool. On-chain policy enforcement stays public and verifiable via the new `record_private_spend` instruction; amounts and recipients become opaque commitments. The owner decrypts receipts in-browser via a Phantom-derived view key — no key ever crosses the network. Auditors get scoped disclosure. ([apps/docs/sdk/private-spend.mdx](apps/docs/sdk/private-spend.mdx))
- 📊 **Treasury-grade insights (REIN × GoldRush).** USD-denominated totals, week-over-week deltas, real anomaly detection (outlier amounts at mean + 2σ, new-recipient flags), and reputation grading on every allowlist entry. Pastes a pubkey, returns a graded card (known protocol / active / new / unknown) before the owner approves. Cached at the edge in Cloudflare KV. ([apps/docs/sdk/insights.mdx](apps/docs/sdk/insights.mdx))

---

## Live demo

| Surface | URL |
|---|---|
| Landing page | [rein-hackathon-web.vercel.app](https://rein-hackathon-web.vercel.app/) |
| Owner dashboard | [/app](https://rein-hackathon-web.vercel.app/app) |
| Onboarding | [/onboarding](https://rein-hackathon-web.vercel.app/onboarding) |
| USD insights (REIN × GoldRush) | [/app/insights](https://rein-hackathon-web.vercel.app/app/insights) |
| Policy editor + reputation grading | [/app/policy](https://rein-hackathon-web.vercel.app/app/policy) |
| Private activity (REIN × Umbra) | [/app/activity?tab=private](https://rein-hackathon-web.vercel.app/app/activity?tab=private) |
| Pitch deck | [/pitch](https://rein-hackathon-web.vercel.app/pitch) |
| Roadmap | [/roadmap](https://rein-hackathon-web.vercel.app/roadmap) |
| Worker (API) | [rein-service-devnet.tanvirahmedabd1.workers.dev](https://rein-service-devnet.tanvirahmedabd1.workers.dev/health) |
| Docs | [apps/docs](apps/docs/) (Mintlify; locally `pnpm --filter rein-docs dev`) |

All chain reads hit live Solana devnet through the deployed Cloudflare Worker; the Umbra sidecar runs on Fly.io. Connect a fresh Phantom on devnet and run the onboarding flow end-to-end — every step is a real on-chain transaction.

### Smoke-test the deployed worker

```bash
WORKER=https://rein-service-devnet.tanvirahmedabd1.workers.dev

# Worker health
curl -s $WORKER/health | jq

# Public chain config (mint, programId, rpcUrl, sidecar URL, goldrush flag)
curl -s $WORKER/v1/config | jq

# All on-chain vaults via Anchor .all() — no auth required for reads
curl -s $WORKER/v1/vaults | jq

# GoldRush reputation profile for a known protocol (cached in REIN_KV, 24h TTL)
curl -s $WORKER/v1/recipients/JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4/profile | jq

# USD-enriched insights (totals, WoW delta, anomalies)
curl -s "$WORKER/v1/insights?vault=9eeCj662e4QZPbg848BH25ywShj7qvxybCk2cJWR5quc" | jq

# Confidential receipts (commitment-only public read; owner decrypts in-browser)
curl -s "$WORKER/v1/receipts/private?vault=9eeCj662e4QZPbg848BH25ywShj7qvxybCk2cJWR5quc" | jq

# Read a real on-chain receipt (seeded; see program/.devnet-seed.json)
curl -s "$WORKER/v1/receipts/1778280005122?vault=9eeCj662e4QZPbg848BH25ywShj7qvxybCk2cJWR5quc" | jq
```

Swap `WORKER=http://127.0.0.1:8787` to run the same checks against a local `wrangler dev` instance.

---

## Architecture

```
   ┌─────────────────────────┐
   │  Agent runtime          │
   │  (Claude, MCP, CrewAI…) │◀── npx @rein/cli init
   └────────────┬────────────┘
                │ spend({ recipient, amount })   (public OR /spend/private)
                ▼
   ┌─────────────────────────┐                ┌───────────────────────┐
   │  Cloudflare Worker      │ ── delegate ──▶│ Solana program        │
   │  (Hono + Durable Object)│   signs spend  │ (Anchor 0.31.1)       │
   │                         │                │  • init_vault         │
   │  • POST /v1/spend       │                │  • init_policy        │
   │  • POST /v1/spend/private────HMAC───┐   │  • spend (enforces!)  │
   │  • POST /v1/x402/spend  │           │   │  • record_private_spend│
   │  • GET  /v1/recipients/:addr/profile│   │  • request/approve    │
   │  • GET  /v1/insights (USD + WoW)    │   │     step_up           │
   │  • GET  /v1/receipts/private        │   │  • pause / dispute    │
   │  • POST /v1/auth/issue              │   └───────────┬───────────┘
   │  • GET  /v1/activity (WS)           │               │ Helius webhook
   │  • GET  /v1/{vaults,…}              │               ▼
   └────┬───────────────────────┬────────┘   ┌───────────────────────┐
        │ GoldRush REST         │            │  Durable Object       │
        │ (KV-cached, 6h/24h)   │            │  ActivityRoom         │
        ▼                       ▼            │  (5-min ring buffer)  │
   ┌──────────────┐    ┌──────────────────┐  └───────────────────────┘
   │ GoldRush API │    │ Sidecar (Fly.io) │
   │ api.covalent │    │ Umbra SDK +      │
   │  hq.com      │    │ web-zk-prover    │──▶ Umbra program (Solana)
   └──────────────┘    └──────────────────┘    DSuKkyqG…irnuv63m

   ┌─────────────────────────┐
   │  Next.js dashboard      │ ◀── WebSocket: live receipts (broadcast)
   │  (Vercel + Geist polish)│ ◀── view key (browser-only) decrypts private memos
   │  • Owner wallet signs   │
   │    policy/dispute/pause │
   │  • Worker JWT for spend │
   └─────────────────────────┘
```

**Trust boundaries (worth understanding):**

- **Owner key** → signs `init_vault`, `init_policy`, `update_policy`, `pause`, `dispute`, `approve_step_up`. Held by user in Phantom / Backpack / Solflare. **Never leaves the user.**
- **Delegate key** → signs `spend` only. Held in the Cloudflare Worker as `DELEGATE_KEYPAIR_BASE58`. Can spend, **cannot** change policy.
- **Mint authority** → test-USDC faucet only on devnet. Held in `MINT_AUTHORITY_KEYPAIR_BASE58`. Refuses on mainnet.
- **Sidecar key (private path)** → signs Umbra shielded-UTXO creation only. Isolated Fly.io service. Sees commitments, never amounts or recipients.
- **View key (browser-only)** → owner-derived from a one-time signed message. Decrypts confidential receipts client-side; never crosses the network.

### Privacy mode (REIN × Umbra · shipped 2026-05)

When a vault flips on **private spend**, execution leaves the public path and rides Umbra's shielded UTXO pool. Policy still lives on-chain and is enforced atomically — only the amounts, recipients, and tx graph go private.

```
agent ──spend──▶ REIN service ──▶ Sidecar (Fly.io)
                       │              │   builds + signs UTXO
                       │              ▼
                       │         Umbra / Arcium ──▶ Solana
                       │              │   commitment only
                       │              ▼
                       │      encrypted receipt blob
                       ▼              │
                  Policy PDA          ▼
                   (public)    browser ──decrypt──▶ owner sees plaintext
                                    ▲          (view key, owner-derived)
                              wallet signs once
```

- **Sidecar key** signs only Umbra UTXO creation. Cannot edit policy, dispute, or refund.
- **View key** is derived from a one-time wallet signature, held in browser RAM, and used purely to decrypt receipt blobs. Auditors get scoped grants — never the full key.
- If the sidecar is fully compromised, the on-chain Policy PDA still rejects every spend outside the rules. The owner key never moves.

See [`apps/docs/concepts/trust-model.mdx`](apps/docs/concepts/trust-model.mdx) and [`apps/docs/sdk/private-spend.mdx`](apps/docs/sdk/private-spend.mdx) for the full contract.

---

## Workspace layout

```
rein-hackathon/
├── program/              Anchor program (Rust 1.95.0, Solana 3.1.14)
│   ├── programs/rein/    Source — state, instructions, events, errors
│   └── tests/            49 tests (F1–F7) + property test (N=100) + CU regression
│
├── service/              Cloudflare Worker (Hono + TypeScript)
│   ├── src/routes/       auth, spend (public + private), x402, receipts
│   │                     (incl. private + owner-only memo), activity (WS),
│   │                     notifications, faucet, config, data, recipients
│   ├── src/auth/         JWT issue/verify, challenge-response
│   ├── src/spend/        Full pipeline: load → simulate → build → sign → submit
│   ├── src/spend/execute-private.ts   Private-path executor (sidecar HMAC + on-chain record)
│   ├── src/policy/       Off-chain policy simulator (matches on-chain bytecode)
│   ├── src/umbra/        Umbra client, commitment hashing, encrypted memo store
│   ├── src/goldrush/     GoldRush REST client, reputation grading, anomaly compute, KV cache
│   └── src/activity/     Durable Object ring buffer
│
├── services/sidecar/     Fly.io Node service — Umbra @umbra-privacy/sdk + web-zk-prover.
│                         Single endpoint (POST /umbra/create-utxo), HMAC-authed from worker.
│
├── packages/             pnpm workspace
│   ├── sdk-ts            @rein/sdk — IDL, PDA helpers, builders, simulator
│   ├── mcp               @rein/mcp — MCP server (Claude/Cursor/etc.)
│   ├── langchain         @rein/langchain — LangChain tool wrapper
│   ├── openai            @rein/openai — Functions schema export
│   ├── ai                @rein/ai — Vercel AI SDK helpers
│   ├── cli               @rein/cli — rein init (auto-detects runtimes)
│   └── sdk-py            rein — Python SDK (CrewAI/LangGraph/AutoGen)
│
├── apps/
│   ├── web               Next.js 16 + React 19 + Tailwind 4 dashboard
│   ├── docs              Mintlify documentation site
│   └── mobile            (stub, Phase 2)
│
└── tests/cross-runtime   Golden-scenario parity gate across all SDK languages
```

---

## Get running locally

### Prerequisites

| | Version | Notes |
|---|---|---|
| Node.js | ≥20.10.0 | |
| pnpm | 10.x | `corepack enable && corepack prepare pnpm@latest --activate` |
| Solana CLI | 3.1.14 (Agave) | `sh -c "$(curl -sSfL https://release.anza.xyz/v3.1.14/install)"` |
| Rust | 1.95.0 | `rustup` auto-installs from `program/rust-toolchain.toml` |
| Anchor CLI | 0.31.1 | **Build from source on Ubuntu < 24.04:** `cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli --locked` (avm prebuilts require glibc 2.38/2.39) |
| Ubuntu apt prereqs | — | `sudo apt install -y pkg-config build-essential libudev-dev libssl-dev clang` |

### One-time setup

```bash
# Install monorepo
pnpm install

# Generate a devnet wallet + airdrop SOL
solana-keygen new --no-bip39-passphrase
solana config set --url https://api.devnet.solana.com
solana airdrop 2

# Build the on-chain program (generates target/idl + target/types)
cd program && anchor build

# Seed devnet — creates test USDC mint + vault + policy + a real receipt
pnpm seed:devnet
```

### Wire the worker

```bash
cd service

# Update the seeded mint in wrangler.toml
NEW_MINT=$(node -e "console.log(require('../program/.devnet-seed.json').mint)")
sed -i.bak "s|^USDC_MINT = .*|USDC_MINT = \"$NEW_MINT\"|" wrangler.toml

# Local secrets — gitignored, never committed
MINT_AUTH=$(node -e "
  const bs58 = require('bs58').default || require('bs58');
  const fs = require('fs');
  console.log(bs58.encode(Buffer.from(JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/solana/id.json')))));
")
cat > .dev.vars <<EOF
HMAC_SIGNING_KEY=$(openssl rand -hex 32)
MINT_AUTHORITY_KEYPAIR_BASE58=$MINT_AUTH

# Delegate key the worker uses to sign /v1/spend on behalf of the agent.
# Generate with: solana-keygen new --no-bip39-passphrase -o /tmp/delegate.json --silent
# then base58-encode the bytes (see the MINT_AUTH snippet above).
DELEGATE_KEYPAIR_BASE58=

# Strongly recommended — public devnet RPC drops txs under load:
# HELIUS_API_KEY=your_helius_key

# Required for /v1/recipients/:addr/profile + USD-enriched /v1/insights.
# Free key from https://www.covalenthq.com/platform/
GOLDRUSH_API_KEY=

# Umbra sidecar — defaults to local dev (services/sidecar on :8788).
UMBRA_SIDECAR_URL=http://127.0.0.1:8788
SIDECAR_HMAC_KEY=$(openssl rand -hex 32)
EOF

echo ".dev.vars" >> .gitignore
```

### Run the stack

```bash
# Terminal A — Cloudflare Worker
cd service && pnpm dev                          # http://127.0.0.1:8787

# Terminal B — Umbra sidecar (only needed for the private spend path)
cd services/sidecar && pnpm dev                 # http://127.0.0.1:8788

# Terminal C — dashboard
cd apps/web && pnpm dev                         # http://localhost:3000
```

The sidecar reads its config from `services/sidecar/.env` (matching keys: `SIDECAR_HMAC_KEY`, `UMBRA_SIDECAR_KEYPAIR_BASE58`, `SOLANA_RPC_URL`, `SOLANA_RPC_WS_URL`). The `SIDECAR_HMAC_KEY` must match the worker's value.

Then visit `http://localhost:3000/onboarding` with a fresh Phantom wallet on devnet. Run through: **connect → init_vault → faucet 50 USDC + deposit $25 → pick policy preset → (optional) enable private spend → sign in → dashboard.** Each step is a real on-chain transaction.

---

## What's real vs. what's roadmap

### Built and live

- ✅ **Anchor program** (Phase 1) — 11 instructions (incl. `record_private_spend`), 49 + 100-prop tests, CU regression gate. F1–F7 fully shipped.
- ✅ **Cloudflare Worker** (Phase 2) — 20+ endpoints, JWT auth (challenge-response with on-chain owner verification), Helius webhook ingestion, Durable-Object activity stream.
- ✅ **Agent SDKs** (Phase 3) — `@rein/sdk` (TS), `@rein/mcp`, `@rein/langchain`, `@rein/openai`, `@rein/ai`, `@rein/cli`, `rein` (PyPI). Cross-runtime parity gate across all of them.
- ✅ **Owner dashboard** (Phase 4) — every read is on-chain; every write is real:
  - Onboarding: real `init_vault + faucet + deposit + init_policy + JWT sign-in` (5 transactions, 4 wallet signatures) — with an optional "Enable private spend" Umbra-register step.
  - Spend (vault detail page): public path via delegate key; **"Send privately" toggle** routes the same flow through the sidecar + Umbra UTXO pool.
  - Pause/Resume, Policy submit, Step-up approve, Dispute: owner-signed via Phantom.
  - Activity feed: real WebSocket when authed; **Private tab** lists commitment-only rows and decrypts memos in-browser via the view key.
  - Insights (`/app/insights`): USD totals, week-over-week delta with sparkline, top recipients ranked by dollar value, anomalies panel (outlier amounts + new-recipient flags). Powered by GoldRush historical pricing.
  - Policy editor (`/app/policy`): paste a recipient pubkey → graded reputation card (30-day USD volume, top holdings, first-seen, known-protocol name) renders inline before approval.
  - Settings: notification channels live with `PUT/DELETE /v1/notifications/*` + test events; view-key panel (copy / rotate / share-with-auditor).
- ✅ **Side-track: REIN × Umbra** — shielded UTXO execution, on-chain `record_private_spend` ix, sidecar deployed on Fly.io, view-key disclosure for auditors. Live on devnet. ([apps/docs/sdk/private-spend.mdx](apps/docs/sdk/private-spend.mdx))
- ✅ **Side-track: REIN × GoldRush** — `/v1/recipients/:address/profile` reputation, USD-enriched `/v1/insights`, real anomaly detection. Cached in Cloudflare KV (24h profiles, 6h prices). ([apps/docs/sdk/insights.mdx](apps/docs/sdk/insights.mdx))
- ✅ **Brand + landing** (Phase 6) — Geist polish, animated terminal demo, pricing tiers, `/pitch` + `/investors` + `/roadmap` pages.

### Roadmap (post-hackathon)

- **Phase 5 — Key broker.** 2-of-3 Shamir share, encrypted KV blob storage, `rein.proxy()` decrypt-in-memory forward for traditional APIs (the bridge to OpenAI/AWS).
- **Mainnet beta gate (F55).** After audit checklist or RFP-funded audit. Targeted Q3 2026.
- **Anonymous-mode UTXO.** Umbra's stealth-address path on top of the existing shielded flow. Targeted Q3 2026.
- **Compliance grants UI.** View-key sharing built around Umbra's signed disclosure primitives. Targeted Q3 2026.
- **Multi-currency insights.** EUR/GBP/JPY denomination via GoldRush. Targeted Q4 2026.
- **Dead-man's switch.** On-chain `heartbeat` ix + off-chain watcher.
- **Multi-vault per owner.** v1 uses PDA seeds `[b"vault", owner]`; v2 would add `index` for vault families.

Source of truth for surface-by-surface status is the in-app `/roadmap` page.

---

## Testing

```bash
# All workspaces — Vitest where present, idempotent
pnpm test

# On-chain (spins up local validator, ~30s)
cd program && anchor test

# Cross-runtime parity (golden scenarios across MCP/LangChain/OpenAI/AI SDK)
cd tests/cross-runtime && pnpm test

# Worker only
cd service && pnpm test

# Type-check everything
pnpm typecheck
```

---

## Why bet on REIN

- **Real on-chain enforcement, not a wrapper.** Competitors check rules in JS before calling RPC. We check them inside a Solana program — there's no path around it.
- **Universal runtime support, not Claude-only.** Six SDKs covering every agent framework worth shipping in 2026. Cross-runtime parity gate ensures all return identical errors for identical inputs.
- **Production-grade engineering.** 300+ tests, property tests for accounting invariants, CU regression gates, structured logs on every endpoint. The pitch is "boring infra," and the code shows it.
- **Solana-native deliberately.** x402 is exploding *on Solana* ($10M+ devnet volume in 60 days). USDC is the actual settlement layer for agent commerce. We aren't multi-chain; we're the right chain.

---

## Links

- **Live deployment:** [rein-hackathon-web.vercel.app](https://rein-hackathon-web.vercel.app/) (frontend) · [rein-service-devnet.tanvirahmedabd1.workers.dev](https://rein-service-devnet.tanvirahmedabd1.workers.dev/health) (worker)
- **Main submission:** Colosseum portal (2026-05-11, submitted)
- **Side-track submissions:** Superteam Earn — REIN × Umbra, REIN × GoldRush (2026-05-26)
- **Docs:** [apps/docs/introduction.mdx](apps/docs/introduction.mdx) · [private spend SDK](apps/docs/sdk/private-spend.mdx) · [insights SDK](apps/docs/sdk/insights.mdx) · [trust model](apps/docs/concepts/trust-model.mdx)
- **Integrations guides:** [Claude Code](apps/docs/integrations/claude-code.mdx) · [Python](apps/docs/integrations/python.mdx)
- **Source:** [github.com/tanvir464/rein](https://github.com/tanvir464/rein)
- **Side-track screenshots:** [apps/web/public/screenshots/sidetracks/](apps/web/public/screenshots/sidetracks/)

## License

Source-available under the Business Source License (BSL) 1.1 during the hackathon period. Will convert to Apache 2.0 / MIT once mainnet ships.

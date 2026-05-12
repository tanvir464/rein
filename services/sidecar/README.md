# @rein/sidecar

The REIN-Cloak sidecar — a tiny Node/Hono service that owns the Umbra SDK and ZK prover.
Cloudflare Workers can't host the prover (wasm + 150 MB peak), so the Worker proxies its
private-spend requests here via HMAC.

## Routes

- `GET /health` — liveness + Umbra client readiness.
- `POST /umbra/create-utxo` — HMAC-authed. Body `{ destinationAddress, mint, amount, refTag }`. Returns `{ umbraSignature, leafIndex, commitmentHash }`.

## Run locally

```bash
cd services/sidecar
cp .env.example .env
# fill SIDECAR_HMAC_KEY, UMBRA_SIDECAR_KEYPAIR_BASE58, SOLANA_RPC_URL
pnpm install
pnpm dev
```

The service listens on `http://127.0.0.1:8788` by default. Point the Worker at it via
`UMBRA_SIDECAR_URL=http://127.0.0.1:8788` in `service/.dev.vars`.

## First-time wallet setup

The sidecar keypair must be Umbra-registered and have a pre-deposited encrypted balance
before it can create UTXOs:

1. Fund the sidecar's Solana address with devnet SOL (faucet or Helius drop).
2. `register({ confidential: true, anonymous: true })` once.
3. `directDeposit` test-USDC into the encrypted balance — this is the budget the
   sidecar can spend privately. The owner-side dashboard does this in onboarding.

## Deploy (Render — free)

Render's free Web Service tier (512 MB RAM, HTTPS, custom `*.onrender.com`
subdomain) runs the existing Dockerfile unchanged. The service sleeps after 15
minutes of inactivity and cold-starts in ~30–60 s; matches the Fly setup which
also scaled to zero (`min_machines_running = 0`).

1. Generate the two secrets locally:

   ```bash
   # HMAC key (32-byte hex)
   openssl rand -hex 32

   # Sidecar Solana keypair (base58 of 64-byte secret).
   # Requires the Solana CLI; if you don't have it, see
   # https://docs.solana.com/cli/install-solana-cli-tools
   solana-keygen new --no-bip39-passphrase --silent -o /tmp/sidecar.json
   node -e "const fs=require('fs');const bs58=require('bs58').default;\
     console.log(bs58.encode(Buffer.from(JSON.parse(fs.readFileSync('/tmp/sidecar.json')))));"
   rm /tmp/sidecar.json
   ```

   Keep both values in a password manager — Render's UI accepts paste, but
   never commit them.

2. In the Render dashboard (https://dashboard.render.com):
   - **New → Web Service**.
   - Connect the repo. Pick the branch you deploy from.
   - **Name**: `rein-sidecar` (becomes `rein-sidecar.onrender.com`).
   - **Root Directory**: `services/sidecar`.
   - **Runtime**: `Docker`.
   - **Dockerfile Path**: `Dockerfile` (relative to root directory).
   - **Plan**: `Free`.
   - **Health Check Path**: `/health`.
   - **Environment Variables** (add four):
     - `SIDECAR_HMAC_KEY` = the hex string from step 1
     - `UMBRA_SIDECAR_KEYPAIR_BASE58` = the base58 string from step 1
     - `SOLANA_RPC_URL` = `https://devnet.helius-rpc.com/?api-key=<your key>`
     - `PORT` = `8788`
   - **Create Web Service**. First build takes ~3–5 min.

3. Wire the Worker to the deployed sidecar:

   ```bash
   cd service
   wrangler secret put SIDECAR_HMAC_KEY --env devnet   # same hex as Render
   wrangler secret put UMBRA_SIDECAR_URL --env devnet  # https://rein-sidecar.onrender.com
   ```

4. Onboard the sidecar wallet (see *First-time wallet setup* above) — fund with
   devnet SOL, run Umbra `register`, then `directDeposit` test-USDC. Until this
   is done, `POST /umbra/create-utxo` will return an error from the Umbra SDK
   even though the HMAC handshake succeeds.

### Deploy (Fly.io — alternative, paid)

If you have a paid Fly plan, `fly.toml` is still in this directory. Run
`fly launch --no-deploy --copy-config`, `fly secrets set …`, `fly deploy`.

## Secret rotation

1. Generate a new HMAC key: `openssl rand -hex 32`.
2. Update it on the sidecar host (Render dashboard → Environment → edit
   `SIDECAR_HMAC_KEY` → save; Render redeploys automatically).
3. `wrangler secret put SIDECAR_HMAC_KEY --env devnet` with the same value.
4. (Optional) Rotate the sidecar Solana keypair: generate a fresh one, transfer
   the remaining Umbra balance via `directWithdraw` to the owner, then update
   `UMBRA_SIDECAR_KEYPAIR_BASE58` and re-register the new key.

## Threat model

If the sidecar key leaks, the attacker can drain only the encrypted balance the sidecar
already controls (a budget the owner deposited up front). They cannot touch the public
vault, the owner key, or the delegate key. Rotation drains the old balance via
`directWithdraw` and replaces both Solana + HMAC keys.

/**
 * Cloudflare Worker bindings — keep in lockstep with `wrangler.toml`.
 * Add new vars / secrets / KV / DO bindings here so handlers get type safety.
 */
export type Env = {
  // [vars]
  ENVIRONMENT: 'dev' | 'devnet' | 'production';
  SOLANA_CLUSTER: 'devnet' | 'mainnet-beta' | 'localnet';
  SOLANA_RPC_URL: string;
  PROGRAM_ID: string;

  // Test USDC mint (devnet only). Frontend reads via GET /v1/config so it
  // doesn't have to hardcode a pubkey; the seed script's `.devnet-seed.json`
  // is the source of truth in dev.
  USDC_MINT?: string;

  // Secrets (wrangler secret put …) — present at runtime, undefined in unit tests.
  HMAC_SIGNING_KEY?: string;
  HELIUS_API_KEY?: string;
  DELEGATE_KEYPAIR_BASE58?: string;
  TELEGRAM_BOT_TOKEN?: string;
  // Faucet authority for the test USDC mint. Same wallet that ran
  // `seed-devnet.ts` (which created the mint with itself as authority).
  // If unset, POST /v1/faucet returns 503.
  MINT_AUTHORITY_KEYPAIR_BASE58?: string;
  // GoldRush (Covalent) — mainnet-only reputation + historical pricing.
  // `wrangler secret put GOLDRUSH_API_KEY --env devnet` in prod;
  // `service/.dev.vars` for local.
  GOLDRUSH_API_KEY?: string;

  // U2 — Umbra sidecar (Fly.io Node service that hosts the ZK prover).
  UMBRA_SIDECAR_URL?: string;
  SIDECAR_HMAC_KEY?: string;

  // KV
  REIN_KV?: KVNamespace;

  // Durable Objects
  ACTIVITY_ROOM?: DurableObjectNamespace;
};

/**
 * Feature flags. Side-track integrations default on for devnet/dev and
 * off for mainnet/production — gate post-hackathon mainnet rollout.
 */
export function flags(env: Env): { goldrush: boolean; umbra: boolean } {
  const onDevnet = env.SOLANA_CLUSTER !== 'mainnet-beta';
  return {
    goldrush: onDevnet && !!env.GOLDRUSH_API_KEY,
    umbra: onDevnet && !!env.UMBRA_SIDECAR_URL && !!env.SIDECAR_HMAC_KEY,
  };
}

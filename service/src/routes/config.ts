import { Hono } from 'hono';

import type { Env } from '../env';

/**
 * Public config the frontend needs to talk to the chain. The frontend should
 * NOT hardcode the program id, USDC mint, or RPC URL — it asks the Worker so
 * a wrangler.toml change picks up everywhere.
 */
export type ConfigJson = {
  cluster: 'devnet' | 'mainnet-beta' | 'localnet';
  programId: string;
  usdcMint: string | null;
  /** RPC URL the frontend can use directly when bypassing the Worker (e.g.,
   *  to submit owner-signed onboarding txs). Same URL the Worker itself uses
   *  for reads. */
  rpcUrl: string;
  /** Whether POST /v1/faucet is available (depends on MINT_AUTHORITY_KEYPAIR_BASE58). */
  faucetEnabled: boolean;
};

export const configRouter = new Hono<{ Bindings: Env }>();

configRouter.get('/v1/config', (c) => {
  const env = c.env;
  // Prefer Helius RPC when available — frontend gets the same priority-fee
  // benefit the Worker enjoys, no extra config required.
  const rpcUrl =
    env.HELIUS_API_KEY && env.SOLANA_CLUSTER !== 'localnet'
      ? `https://${env.SOLANA_CLUSTER === 'mainnet-beta' ? 'mainnet' : env.SOLANA_CLUSTER}.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`
      : env.SOLANA_RPC_URL;

  const body: ConfigJson = {
    cluster: env.SOLANA_CLUSTER,
    programId: env.PROGRAM_ID,
    usdcMint: env.USDC_MINT ?? null,
    rpcUrl,
    faucetEnabled: !!env.MINT_AUTHORITY_KEYPAIR_BASE58 && !!env.USDC_MINT,
  };
  return c.json(body, 200, { 'cache-control': 'public, max-age=60' });
});

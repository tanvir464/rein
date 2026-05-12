import { Connection, Keypair } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { IDL, type ReinIdl as Rein } from '@rein/sdk';

import type { Env } from '../env';

/**
 * Create a Solana RPC `Connection` from Worker env. Prefers Helius if `HELIUS_API_KEY`
 * is set (better rate limits + priority-fee API); otherwise falls back to the public
 * cluster URL declared in `[vars]`.
 */
export function rpcFromEnv(env: Env): Connection {
  const url =
    env.HELIUS_API_KEY && env.SOLANA_CLUSTER !== 'localnet'
      ? `https://${env.SOLANA_CLUSTER === 'mainnet-beta' ? 'mainnet' : env.SOLANA_CLUSTER}.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`
      : env.SOLANA_RPC_URL;
  return new Connection(url, 'confirmed');
}

/**
 * A read-only Anchor `Program<Rein>` wired to the Worker's RPC. The provider's
 * wallet is a throwaway keypair — it's never used because the service only ever
 * calls `.account.<x>.fetch()` and `.methods(...).instruction()` on this program;
 * actual signing happens in the request handler via the delegate key from KV/secrets.
 */
let cachedProgram: { program: Program<Rein>; rpcUrl: string } | null = null;
export function programFromEnv(env: Env): Program<Rein> {
  const conn = rpcFromEnv(env);
  if (cachedProgram && cachedProgram.rpcUrl === conn.rpcEndpoint) {
    return cachedProgram.program;
  }
  const dummyKp = Keypair.generate();
  const wallet = {
    publicKey: dummyKp.publicKey,
    signTransaction: async <T>(tx: T) => tx,
    signAllTransactions: async <T>(txs: T[]) => txs,
    payer: dummyKp,
  };
  const provider = new AnchorProvider(conn, wallet as any, AnchorProvider.defaultOptions());
  const program = new Program<Rein>(IDL as any, provider);
  cachedProgram = { program, rpcUrl: conn.rpcEndpoint };
  return program;
}

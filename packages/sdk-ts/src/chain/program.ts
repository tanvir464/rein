import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, Keypair } from '@solana/web3.js';

import { IDL, type Rein } from '../idl';
import type { Cluster } from '../types';

export type ProgramOpts = {
  /** Explicit RPC URL — overrides cluster + heliusApiKey if set. */
  rpcUrl?: string;
  /** Cluster label; chooses the default Helius / public RPC. Default: `devnet`. */
  cluster?: Cluster;
  /** If set, prefers `https://<cluster>.helius-rpc.com` for higher rate limits. */
  heliusApiKey?: string;
  /** Default commitment for `Connection`. Default: `confirmed`. */
  commitment?: 'confirmed' | 'finalized' | 'processed';
};

/**
 * Public RPC endpoints — used as the final fallback when no Helius key and no
 * explicit URL are provided. These are rate-limited; production apps should
 * always set `heliusApiKey` or `rpcUrl`.
 */
const PUBLIC_RPC: Record<Cluster, string> = {
  devnet: 'https://api.devnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  testnet: 'https://api.testnet.solana.com',
  localnet: 'http://127.0.0.1:8899',
};

export function resolveRpcUrl(opts: ProgramOpts = {}): string {
  if (opts.rpcUrl) return opts.rpcUrl;
  const cluster = opts.cluster ?? 'devnet';
  if (opts.heliusApiKey && cluster !== 'localnet') {
    const heliusKey = cluster === 'mainnet-beta' ? 'mainnet' : cluster;
    return `https://${heliusKey}.helius-rpc.com/?api-key=${opts.heliusApiKey}`;
  }
  return PUBLIC_RPC[cluster];
}

export function createConnection(opts: ProgramOpts = {}): Connection {
  return new Connection(resolveRpcUrl(opts), opts.commitment ?? 'confirmed');
}

/**
 * Read-only Anchor program client. Wallet is a throwaway because we only call
 * `.account.X.fetch()` (reads) and `.methods(…).instruction()` (returns a raw
 * `TransactionInstruction` without signing). Actual signing happens in the
 * `Rein` client via the configured `Signer`, never here.
 */
export function createProgram(connection: Connection): Program<Rein> {
  const dummyKp = Keypair.generate();
  const wallet = {
    publicKey: dummyKp.publicKey,
    signTransaction: async <T>(tx: T) => tx,
    signAllTransactions: async <T>(txs: T[]) => txs,
    payer: dummyKp,
  };
  const provider = new AnchorProvider(
    connection,
    wallet as never,
    AnchorProvider.defaultOptions(),
  );
  return new Program<Rein>(IDL as never, provider);
}

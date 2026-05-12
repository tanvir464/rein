/**
 * Umbra wiring for the sidecar.
 *
 * The sidecar owns one funded Solana keypair (`UMBRA_SIDECAR_KEYPAIR_BASE58`)
 * that:
 *   1. Has been Umbra-registered (`register({ confidential: true, anonymous: true })`).
 *   2. Holds a pre-deposited encrypted balance (the owner moves a budget into
 *      this account via the dashboard).
 *
 * When the worker calls `/umbra/create-utxo`, we use the SDK's
 * `getPublicBalanceToReceiverClaimableUtxoCreatorFunction` to mint a UTXO
 * addressed to `destinationAddress`. The recipient claims via Umbra's relayer
 * with their own view key — REIN never touches recipient secrets.
 */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import bs58 from 'bs58';

let cachedClient: any = null;

async function getClient() {
  if (cachedClient) return cachedClient;

  const { createSolanaRpc } = await import('@solana/kit');
  const sdk: any = await import('@umbra-privacy/sdk');

  const rpcUrl =
    process.env.SOLANA_RPC_URL ??
    `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY ?? ''}`;
  const rpcWs =
    process.env.SOLANA_RPC_WS_URL ??
    `wss://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY ?? ''}`;
  const indexer =
    process.env.UMBRA_INDEXER_URL ?? 'https://utxo-indexer.api-devnet.umbraprivacy.com';

  const signer = await loadSigner(sdk);

  cachedClient = await sdk.getUmbraClient({
    signer,
    network: (process.env.UMBRA_NETWORK ?? 'devnet') as 'devnet' | 'mainnet',
    rpcUrl,
    rpcSubscriptionsUrl: rpcWs,
    indexerApiEndpoint: indexer,
  });
  return cachedClient;
}

async function loadSigner(sdk: any) {
  if (process.env.UMBRA_SIDECAR_KEYPAIR_BASE58) {
    const raw = bs58.decode(process.env.UMBRA_SIDECAR_KEYPAIR_BASE58);
    if (raw.length === 64) {
      return sdk.createSignerFromPrivateKeyBytes(raw);
    }
    if (raw.length === 32) {
      return sdk.createSignerFromPrivateKeyBytes(raw);
    }
    throw new Error(`UMBRA_SIDECAR_KEYPAIR_BASE58 must decode to 32 or 64 bytes (got ${raw.length})`);
  }
  const idPath = process.env.SIDECAR_KEYPAIR_PATH ?? join(homedir(), '.config', 'solana', 'id.json');
  if (existsSync(idPath)) {
    const arr = JSON.parse(readFileSync(idPath, 'utf8')) as number[];
    return sdk.createSignerFromPrivateKeyBytes(Uint8Array.from(arr));
  }
  return sdk.createInMemorySigner();
}

export async function healthCheck(): Promise<{ ready: boolean; address?: string }> {
  try {
    const client = await getClient();
    const sdk: any = await import('@umbra-privacy/sdk');
    return { ready: true, address: client.signer?.address ?? sdk?.signer?.address };
  } catch (e: any) {
    return { ready: false };
  }
}

export type CreateUtxoInput = {
  destinationAddress: string;
  mint: string;
  amount: string;
  refTag: string;
};

export type CreateUtxoResult = {
  umbraSignature: string;
  leafIndex: number;
  commitmentHash: string;
};

export async function createUtxo(input: CreateUtxoInput): Promise<CreateUtxoResult> {
  const sdk: any = await import('@umbra-privacy/sdk');
  const prover: any = await import('@umbra-privacy/web-zk-prover');
  const client = await getClient();

  const create = sdk.getPublicBalanceToReceiverClaimableUtxoCreatorFunction({
    client,
    deps: { zkProver: prover },
  });

  const result = await create({
    destinationAddress: input.destinationAddress,
    mint: input.mint,
    amount: BigInt(input.amount),
    refTag: input.refTag,
  });

  return {
    umbraSignature: result.signature ?? result.txSignature ?? String(result),
    leafIndex: result.leafIndex ?? -1,
    commitmentHash: result.commitmentHash ?? '',
  };
}

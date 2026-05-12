import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import {
  Connection,
  Keypair,
  MessageV0,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
// SPL Token program id — same value as `@solana/spl-token`'s TOKEN_PROGRAM_ID. Inlined to
// avoid pulling the entire SPL package as a runtime dep just for one constant.
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

import {
  IDL,
  REIN_PROGRAM_ID,
  deriveBlocklistPda,
  deriveCounterPda,
  derivePolicyPda,
  deriveReceiptPda,
  type ReinIdl as Rein,
} from '@rein/sdk';

import { buildComputeBudgetIxs } from './priority-fee';

export type SpendArgsLike = {
  amount: BN;
  nonce: BN;
  x402UrlHash: number[] | Uint8Array;
  day: BN;
};

export type BuildSpendInput = {
  programId?: PublicKey;
  payer: PublicKey;
  vault: PublicKey;
  policy?: PublicKey;
  blocklist?: PublicKey;
  usdcMint: PublicKey;
  vaultUsdcAta: PublicKey;
  recipientUsdcAta: PublicKey;
  stepUpRequest?: PublicKey | null;
  spendArgs: SpendArgsLike;
  computeUnitLimit?: number;
  priorityFeeMicroLamports?: number;
};

export type BuildSpendResult = {
  transaction: VersionedTransaction;
  expectedReceiptPda: PublicKey;
  expectedCounterPda: PublicKey;
  blockhash: string;
  lastValidBlockHeight: number;
  computeUnitLimit: number;
  priorityFeeMicroLamports: number;
};

export type BlockhashSource = Pick<Connection, 'getLatestBlockhash'>;

/**
 * Anchor's Program needs a Provider with a Wallet, but we only call `.instruction()`
 * (never `.rpc()` or `.signAndSend()`) so the wallet never actually signs anything.
 * Using a fresh keypair as a placeholder; Connection is also unused by `.instruction()`.
 */
function dummyProvider(): AnchorProvider {
  const dummyKp = Keypair.generate();
  const conn = { rpcEndpoint: 'http://noop' } as unknown as Connection;
  const wallet = {
    publicKey: dummyKp.publicKey,
    signTransaction: async <T>(tx: T) => tx,
    signAllTransactions: async <T>(txs: T[]) => txs,
    payer: dummyKp,
  };
  return new AnchorProvider(conn, wallet as any, AnchorProvider.defaultOptions());
}

let cachedProgram: Program<Rein> | null = null;
function getProgram(programId: PublicKey): Program<Rein> {
  if (cachedProgram && cachedProgram.programId.equals(programId)) {
    return cachedProgram;
  }
  // The IDL JSON carries its own `address`; Anchor wires the program client to that.
  // For non-default program IDs we'd need to clone+rewrite the IDL, but v1 only ever uses
  // REIN_PROGRAM_ID, so this caching is safe.
  cachedProgram = new Program<Rein>(IDL as any, dummyProvider());
  return cachedProgram;
}

function normalizeUrlHash(h: number[] | Uint8Array): number[] {
  const arr = Array.from(h);
  if (arr.length !== 32) {
    throw new TypeError(
      `x402UrlHash must be exactly 32 bytes, got ${arr.length}`,
    );
  }
  return arr;
}

export async function buildSpendTx(
  input: BuildSpendInput,
  rpc: BlockhashSource,
): Promise<BuildSpendResult> {
  const programId = input.programId ?? REIN_PROGRAM_ID;
  if (!programId.equals(REIN_PROGRAM_ID)) {
    throw new Error(
      `Custom programId not supported in v1 (got ${programId.toBase58()}).`,
    );
  }

  const policy = input.policy ?? derivePolicyPda(input.vault, programId)[0];
  const blocklist = input.blocklist ?? deriveBlocklistPda(input.vault, programId)[0];
  const expectedCounterPda = deriveCounterPda(
    input.vault,
    input.spendArgs.day,
    programId,
  )[0];
  const expectedReceiptPda = deriveReceiptPda(
    input.vault,
    input.spendArgs.nonce,
    programId,
  )[0];

  const program = getProgram(programId);
  const x402UrlHash = normalizeUrlHash(input.spendArgs.x402UrlHash);

  const spendIx: TransactionInstruction = await program.methods
    .spend({
      amount: input.spendArgs.amount,
      nonce: input.spendArgs.nonce,
      x402UrlHash,
      day: input.spendArgs.day,
    } as any)
    .accountsStrict({
      payer: input.payer,
      vault: input.vault,
      policy,
      usdcMint: input.usdcMint,
      vaultUsdcAta: input.vaultUsdcAta,
      recipientUsdcAta: input.recipientUsdcAta,
      dailyCounter: expectedCounterPda,
      receipt: expectedReceiptPda,
      blocklist,
      stepUpRequest: input.stepUpRequest ?? null,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const cb = buildComputeBudgetIxs({
    computeUnitLimit: input.computeUnitLimit,
    priorityFeeMicroLamports: input.priorityFeeMicroLamports,
  });

  const { blockhash, lastValidBlockHeight } = await rpc.getLatestBlockhash('confirmed');

  const message: MessageV0 = new TransactionMessage({
    payerKey: input.payer,
    recentBlockhash: blockhash,
    instructions: [...cb.ixs, spendIx],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);

  return {
    transaction,
    expectedReceiptPda,
    expectedCounterPda,
    blockhash,
    lastValidBlockHeight,
    computeUnitLimit: cb.computeUnitLimit,
    priorityFeeMicroLamports: cb.priorityFeeMicroLamports,
  };
}

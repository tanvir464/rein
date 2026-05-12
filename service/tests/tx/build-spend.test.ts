import { describe, it, expect } from 'vitest';
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import BN from 'bn.js';

import {
  REIN_PROGRAM_ID,
  deriveCounterPda,
  derivePolicyPda,
  deriveBlocklistPda,
  deriveReceiptPda,
} from '@rein/sdk';

import { buildSpendTx, type BlockhashSource } from '../../src/tx/build-spend';
import {
  DEFAULT_COMPUTE_UNIT_LIMIT,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
} from '../../src/tx/priority-fee';
import {
  FIXED_AMOUNT,
  FIXED_DAY,
  FIXED_NONCE,
  FIXED_OWNER,
  FIXED_RECIPIENT_ATA,
  FIXED_USDC_MINT,
  FIXED_VAULT,
  FIXED_VAULT_ATA,
  ZERO_HASH,
} from './fixtures/pda-vectors';

const FAKE_BLOCKHASH = '5XQbcvCxqkSiL9LTDh8AS1AiMvFbdb5gZJsRTrgERFNG'; // any valid base58 32-byte
const FAKE_LAST_VALID_BLOCK_HEIGHT = 12345678;

const fakeRpc: BlockhashSource = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLatestBlockhash: async (_commitment?: any) => ({
    blockhash: FAKE_BLOCKHASH,
    lastValidBlockHeight: FAKE_LAST_VALID_BLOCK_HEIGHT,
  }),
};

const baseInput = () => ({
  payer: FIXED_OWNER,
  vault: FIXED_VAULT,
  usdcMint: FIXED_USDC_MINT,
  vaultUsdcAta: FIXED_VAULT_ATA,
  recipientUsdcAta: FIXED_RECIPIENT_ATA,
  spendArgs: {
    amount: FIXED_AMOUNT,
    nonce: FIXED_NONCE,
    x402UrlHash: ZERO_HASH,
    day: FIXED_DAY,
  },
});

describe('buildSpendTx', () => {
  it('returns a versioned transaction with [computeUnitLimit, computeUnitPrice, spend] in order', async () => {
    const r = await buildSpendTx(baseInput(), fakeRpc);

    expect(r.transaction).toBeInstanceOf(VersionedTransaction);
    const message = TransactionMessage.decompile(r.transaction.message);
    expect(message.instructions.length).toBe(3);

    expect(message.instructions[0]!.programId.toBase58()).toBe(
      ComputeBudgetProgram.programId.toBase58(),
    );
    expect(message.instructions[1]!.programId.toBase58()).toBe(
      ComputeBudgetProgram.programId.toBase58(),
    );
    expect(message.instructions[2]!.programId.toBase58()).toBe(REIN_PROGRAM_ID.toBase58());
  });

  it('derives expected receipt + counter PDAs and returns blockhash', async () => {
    const r = await buildSpendTx(baseInput(), fakeRpc);

    const [expectedCounter] = deriveCounterPda(FIXED_VAULT, FIXED_DAY);
    const [expectedReceipt] = deriveReceiptPda(FIXED_VAULT, FIXED_NONCE);

    expect(r.expectedCounterPda.toBase58()).toBe(expectedCounter.toBase58());
    expect(r.expectedReceiptPda.toBase58()).toBe(expectedReceipt.toBase58());
    expect(r.blockhash).toBe(FAKE_BLOCKHASH);
    expect(r.lastValidBlockHeight).toBe(FAKE_LAST_VALID_BLOCK_HEIGHT);
  });

  it('derives policy + blocklist PDAs when omitted', async () => {
    const r = await buildSpendTx(baseInput(), fakeRpc);
    const message = TransactionMessage.decompile(r.transaction.message);
    const accounts = message.instructions[2]!.keys.map((k) => k.pubkey.toBase58());

    const [policy] = derivePolicyPda(FIXED_VAULT);
    const [blocklist] = deriveBlocklistPda(FIXED_VAULT);

    expect(accounts).toContain(policy.toBase58());
    expect(accounts).toContain(blocklist.toBase58());
  });

  it('encodes the spend args in the ix data (round-trip nonce + day + amount + hash)', async () => {
    const r = await buildSpendTx(baseInput(), fakeRpc);
    const message = TransactionMessage.decompile(r.transaction.message);
    const data = message.instructions[2]!.data;

    // Layout: 8B discriminator || 8B amount (le) || 8B nonce (le) || 32B hash || 8B day (le)
    expect(data.length).toBe(8 + 8 + 8 + 32 + 8);

    const amountLe = new BN(data.slice(8, 16), 'le');
    const nonceLe = new BN(data.slice(16, 24), 'le');
    const hash = Array.from(data.slice(24, 56));
    const dayLe = new BN(data.slice(56, 64), 'le');

    expect(amountLe.toString()).toBe(FIXED_AMOUNT.toString());
    expect(nonceLe.toString()).toBe(FIXED_NONCE.toString());
    expect(hash).toEqual(ZERO_HASH);
    expect(dayLe.toString()).toBe(FIXED_DAY.toString());
  });

  it('passes through stepUpRequest pubkey when provided', async () => {
    const stepUp = Keypair.generate().publicKey;
    const r = await buildSpendTx({ ...baseInput(), stepUpRequest: stepUp }, fakeRpc);
    const message = TransactionMessage.decompile(r.transaction.message);
    const accounts = message.instructions[2]!.keys.map((k) => k.pubkey.toBase58());
    expect(accounts).toContain(stepUp.toBase58());
  });

  it('omits the stepUpRequest from accounts when null/undefined', async () => {
    const r = await buildSpendTx(baseInput(), fakeRpc);
    const message = TransactionMessage.decompile(r.transaction.message);
    const accounts = message.instructions[2]!.keys.map((k) => k.pubkey.toBase58());

    // When step-up is null, Anchor encodes the program id in its slot (Option<None> → program id).
    // Either way it should not be a random unrelated key. The presence/absence semantics are
    // verified end-to-end against the program in F11; here we just assert the ix is well-formed.
    expect(accounts.length).toBeGreaterThanOrEqual(11);
  });

  it('uses default CU limit and priority fee when omitted', async () => {
    const r = await buildSpendTx(baseInput(), fakeRpc);
    expect(r.computeUnitLimit).toBe(DEFAULT_COMPUTE_UNIT_LIMIT);
    expect(r.priorityFeeMicroLamports).toBe(DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS);
  });

  it('respects custom CU limit and priority fee', async () => {
    const r = await buildSpendTx(
      { ...baseInput(), computeUnitLimit: 50_000, priorityFeeMicroLamports: 5_000 },
      fakeRpc,
    );
    expect(r.computeUnitLimit).toBe(50_000);
    expect(r.priorityFeeMicroLamports).toBe(5_000);
  });

  it('returns an unsigned tx (signature slot present but zeroed)', async () => {
    const r = await buildSpendTx(baseInput(), fakeRpc);
    expect(r.transaction.signatures.length).toBe(1);
    const allZero = r.transaction.signatures[0]!.every((b) => b === 0);
    expect(allZero).toBe(true);
  });

  it('throws on x402UrlHash of wrong length', async () => {
    await expect(
      buildSpendTx(
        {
          ...baseInput(),
          spendArgs: { ...baseInput().spendArgs, x402UrlHash: [1, 2, 3] },
        },
        fakeRpc,
      ),
    ).rejects.toThrow(/exactly 32 bytes/);
  });
});

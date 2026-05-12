import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  getAccount,
} from '@solana/spl-token';
import { expect } from 'chai';

import { Rein } from '../target/types/rein';
import {
  currentDayBN,
  deriveCounterPda,
  deriveReceiptPda,
  nextNonce,
  setupSpendBundle,
  ZERO_HASH,
} from './fixtures/spend';
import { dollars } from './fixtures/policy';
import { fundedKeypair } from './fixtures/wallets';

// Deterministic PRNG so failures reproduce. Seed printed at the start of the test.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pickAmountMicro(rng: () => number): BN {
  // Uniform amount in [0.01, 1.50] USDC, expressed in micro-USDC.
  // Half the range is over the per_tx_cap of $1.00 — exercises rejections.
  const dollarsAmt = 0.01 + rng() * 1.49;
  return new BN(Math.round(dollarsAmt * 1_000_000));
}

describe('rein — F7 property: spend accounting invariants', () => {
  let provider: anchor.AnchorProvider;
  let program: Program<Rein>;

  before(() => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    program = anchor.workspace.rein as Program<Rein>;
  });

  it('100 random spends: counter == sum(receipts) == vault delta', async function () {
    this.timeout(600_000); // up to 10 min

    const seed = 0xC0FFEE;
    const rng = makeRng(seed);
    console.log(`[property] seed = 0x${seed.toString(16)}`);

    const PER_TX_CAP = dollars(1);
    const DAILY_CAP = dollars(10);

    const bundle = await setupSpendBundle(provider, program, {
      depositUsdc: 100,
      policy: {
        dailyCap: DAILY_CAP,
        perTxCap: PER_TX_CAP,
        stepUpThreshold: dollars(50), // out of the way; we test caps, not step-up
      },
    });

    // 4 rotating recipients so allowlist-empty wildcard is exercised.
    const recipients: PublicKey[] = [];
    for (let i = 0; i < 4; i++) {
      const w = await fundedKeypair(provider, 1);
      const ata = (
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          bundle.owner,
          bundle.mint,
          w.publicKey,
        )
      ).address;
      recipients.push(ata);
    }

    const vaultBefore = (await getAccount(provider.connection, bundle.vaultAta)).amount;

    type Outcome =
      | { ok: true; nonce: BN; amount: BN; recipient: PublicKey }
      | { ok: false; err: string; amount: BN };

    const outcomes: Outcome[] = [];
    let runningSpent = 0n;

    const N = 100;
    for (let i = 0; i < N; i++) {
      const amount = pickAmountMicro(rng);
      const recipient = recipients[i % recipients.length]!;
      const nonce = nextNonce();
      const day = currentDayBN();

      const [counterPda] = deriveCounterPda(bundle.vault, day, program.programId);
      const [receiptPda] = deriveReceiptPda(bundle.vault, nonce, program.programId);

      try {
        await program.methods
          .spend({
            amount,
            nonce,
            x402UrlHash: ZERO_HASH,
            day,
          } as any)
          .accountsStrict({
            payer: bundle.payer.publicKey,
            vault: bundle.vault,
            policy: bundle.policy,
            usdcMint: bundle.mint,
            vaultUsdcAta: bundle.vaultAta,
            recipientUsdcAta: recipient,
            dailyCounter: counterPda,
            receipt: receiptPda,
            blocklist: bundle.blocklist,
            stepUpRequest: null,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([bundle.payer])
          .rpc();
        outcomes.push({ ok: true, nonce, amount, recipient });
        runningSpent += BigInt(amount.toString());
      } catch (e: any) {
        const code: string =
          e?.error?.errorCode?.code ??
          ((e?.message ?? '') + ' ' + JSON.stringify(e?.logs ?? '')).match(
            /Err[A-Za-z]+/,
          )?.[0] ??
          'Unknown';
        outcomes.push({ ok: false, err: code, amount });
      }
    }

    const successes = outcomes.filter((o): o is Extract<Outcome, { ok: true }> => o.ok);
    const failures = outcomes.filter((o): o is Extract<Outcome, { ok: false }> => !o.ok);
    console.log(`[property] ${successes.length} ok, ${failures.length} rejected`);

    // ── Invariant 1: every successful amount was within per_tx_cap ──
    for (const s of successes) {
      expect(
        s.amount.lte(PER_TX_CAP),
        `success at amount ${s.amount.toString()} exceeded per_tx_cap`,
      ).to.equal(true);
    }

    // ── Invariant 2: every successful spend kept running sum ≤ daily_cap ──
    let acc = 0n;
    for (const s of successes) {
      acc += BigInt(s.amount.toString());
      expect(
        acc <= BigInt(DAILY_CAP.toString()),
        `running sum ${acc} exceeded daily_cap`,
      ).to.equal(true);
    }

    // ── Invariant 3: rejections are explained by caps ──
    for (const f of failures) {
      const overPerTx = f.amount.gt(PER_TX_CAP);
      const matchesCode = ['ErrPerTxCap', 'ErrDailyCap'].includes(f.err);
      expect(
        matchesCode,
        `unexpected error '${f.err}' at amount ${f.amount.toString()} (overPerTx=${overPerTx})`,
      ).to.equal(true);
    }

    // ── Invariant 4: counter == sum(receipts) ──
    const day = currentDayBN();
    const [counterPda] = deriveCounterPda(bundle.vault, day, program.programId);
    const counter = await program.account.dailyCounter.fetch(counterPda);
    const counterSpent = BigInt(counter.spent.toString());

    let receiptSum = 0n;
    for (const s of successes) {
      const [rpda] = deriveReceiptPda(bundle.vault, s.nonce, program.programId);
      const r = await program.account.spendReceipt.fetch(rpda);
      receiptSum += BigInt(r.amount.toString());
    }
    expect(counterSpent).to.equal(receiptSum);

    // ── Invariant 5: vault ATA delta == counter spent ──
    const vaultAfter = (await getAccount(provider.connection, bundle.vaultAta)).amount;
    expect(vaultBefore - vaultAfter).to.equal(counterSpent);

    console.log(
      `[property] all invariants hold. spent=${counterSpent} micro-USDC across ${successes.length} receipts.`,
    );
  });
});

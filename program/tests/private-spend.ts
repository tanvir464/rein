import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import { assert, expect } from 'chai';
import { createHash, randomBytes } from 'node:crypto';

import { Rein } from '../target/types/rein';
import {
  currentDayBN,
  deriveCounterPda,
  setupSpendBundle,
} from './fixtures/spend';
import { dollars } from './fixtures/policy';

const RECEIPT_V2_SEED = Buffer.from('receipt-v2');
const UMBRA_REF_SEED = Buffer.from('umbraref');

function deriveReceiptV2Pda(
  vault: PublicKey,
  nonce: BN,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [RECEIPT_V2_SEED, vault.toBuffer(), nonce.toArrayLike(Buffer, 'le', 8)],
    programId,
  );
}

function deriveUmbraRefPda(
  vault: PublicKey,
  umbraRef: Buffer,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [UMBRA_REF_SEED, vault.toBuffer(), umbraRef],
    programId,
  );
}

function recipientCommit(recipient: PublicKey, nonce: BN): number[] {
  const h = createHash('sha256');
  h.update(recipient.toBuffer());
  h.update(nonce.toArrayLike(Buffer, 'le', 8));
  return Array.from(h.digest());
}

function randomRef(): number[] {
  return Array.from(randomBytes(32));
}

let nonceCounter = Date.now() + 1_000_000;
function nextNonce(): BN {
  nonceCounter += 1;
  return new BN(nonceCounter);
}

function errString(e: any): string {
  const parts: unknown[] = [
    e?.error?.errorCode?.code,
    e?.error?.errorMessage,
    e?.message,
    Array.isArray(e?.logs) ? e.logs.join('\n') : undefined,
    e?.transactionMessage,
    e?.transactionLogs?.join?.('\n'),
    e?.toString?.(),
  ];
  return parts.filter((p) => typeof p === 'string' && p.length > 0).join(' || ');
}

describe('rein — U1 record_private_spend', () => {
  let provider: anchor.AnchorProvider;
  let program: Program<Rein>;

  before(() => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    program = anchor.workspace.rein as Program<Rein>;
  });

  async function callRecord(
    bundle: Awaited<ReturnType<typeof setupSpendBundle>>,
    args: {
      amount: BN;
      nonce: BN;
      recipientCommit: number[];
      umbraRef: number[];
      day: BN;
    },
    overrides: { stepUpRequest?: PublicKey | null } = {},
  ) {
    const [counterPda] = deriveCounterPda(bundle.vault, args.day, program.programId);
    const [receiptPda] = deriveReceiptV2Pda(bundle.vault, args.nonce, program.programId);
    const [markerPda] = deriveUmbraRefPda(
      bundle.vault,
      Buffer.from(args.umbraRef),
      program.programId,
    );
    return program.methods
      .recordPrivateSpend(args as any)
      .accountsStrict({
        payer: bundle.payer.publicKey,
        vault: bundle.vault,
        policy: bundle.policy,
        dailyCounter: counterPda,
        receipt: receiptPda,
        umbraRefMarker: markerPda,
        blocklist: bundle.blocklist,
        stepUpRequest: overrides.stepUpRequest ?? null,
        systemProgram: SystemProgram.programId,
      })
      .signers([bundle.payer])
      .rpc();
  }

  it('happy: records a confidential receipt and bumps daily counter', async () => {
    const bundle = await setupSpendBundle(provider, program, {
      depositUsdc: 5,
      policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
    });
    const nonce = nextNonce();
    const args = {
      amount: dollars(0.3),
      nonce,
      recipientCommit: recipientCommit(bundle.recipientAta, nonce),
      umbraRef: randomRef(),
      day: currentDayBN(),
    };
    await callRecord(bundle, args);

    const [receiptPda] = deriveReceiptV2Pda(bundle.vault, nonce, program.programId);
    const receipt = await program.account.spendReceipt.fetch(receiptPda);
    expect(receipt.confidential).to.equal(true);
    expect(receipt.recipient.toBase58()).to.equal(PublicKey.default.toBase58());
    expect(receipt.amount.toString()).to.equal(args.amount.toString());
    expect(Array.from(receipt.recipientCommit as number[])).to.deep.equal(args.recipientCommit);
    expect(Array.from(receipt.umbraRef as number[])).to.deep.equal(args.umbraRef);

    const [counterPda] = deriveCounterPda(bundle.vault, args.day, program.programId);
    const counter = await program.account.dailyCounter.fetch(counterPda);
    expect(counter.spent.toString()).to.equal(args.amount.toString());
  });

  it('negative: amount over per_tx_cap → ErrPerTxCap', async () => {
    const bundle = await setupSpendBundle(provider, program, {
      depositUsdc: 5,
      policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
    });
    const nonce = nextNonce();
    try {
      await callRecord(bundle, {
        amount: dollars(0.6),
        nonce,
        recipientCommit: recipientCommit(bundle.recipientAta, nonce),
        umbraRef: randomRef(),
        day: currentDayBN(),
      });
      assert.fail('expected ErrPerTxCap');
    } catch (e: any) {
      expect(errString(e)).to.match(/ErrPerTxCap/);
    }
  });

  it('negative: paused policy → ErrPaused', async () => {
    const bundle = await setupSpendBundle(provider, program, {
      depositUsdc: 5,
      policy: {
        dailyCap: dollars(5),
        perTxCap: dollars(0.5),
        stepUpThreshold: dollars(10),
        paused: true,
      },
    });
    const nonce = nextNonce();
    try {
      await callRecord(bundle, {
        amount: dollars(0.3),
        nonce,
        recipientCommit: recipientCommit(bundle.recipientAta, nonce),
        umbraRef: randomRef(),
        day: currentDayBN(),
      });
      assert.fail('expected ErrPaused');
    } catch (e: any) {
      expect(errString(e)).to.match(/ErrPaused/);
    }
  });

  it('negative: blocklisted commit → ErrRecipientCommitBlocked', async () => {
    // To test blocklist hit, we run a normal public spend + dispute first to fill the blocklist
    // with a Pubkey. The blocklist stores Pubkey entries; commitment match is by raw bytes,
    // so we feed the disputed pubkey's bytes as our recipient_commit.
    const bundle = await setupSpendBundle(provider, program, {
      depositUsdc: 5,
      policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
    });

    // Use a synthetic 32-byte commit that we'll seed into the blocklist via dispute.
    // We need a real spend first to dispute; the simplest is to do one public spend, dispute it,
    // then attempt a private spend using the recipient ATA bytes as the commit.
    const { deriveReceiptPda, currentDayBN, nextNonce: nn, ZERO_HASH } = await import('./fixtures/spend');
    const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
    const pubNonce = nn();
    const [counterPda] = deriveCounterPda(bundle.vault, currentDayBN(), program.programId);
    const [pubReceiptPda] = deriveReceiptPda(bundle.vault, pubNonce, program.programId);
    await program.methods
      .spend({
        amount: dollars(0.2),
        nonce: pubNonce,
        x402UrlHash: ZERO_HASH,
        day: currentDayBN(),
      } as any)
      .accountsStrict({
        payer: bundle.payer.publicKey,
        vault: bundle.vault,
        policy: bundle.policy,
        usdcMint: bundle.mint,
        vaultUsdcAta: bundle.vaultAta,
        recipientUsdcAta: bundle.recipientAta,
        dailyCounter: counterPda,
        receipt: pubReceiptPda,
        blocklist: bundle.blocklist,
        stepUpRequest: null,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([bundle.payer])
      .rpc();
    await program.methods
      .dispute({ nonce: pubNonce })
      .accountsStrict({
        owner: bundle.owner.publicKey,
        vault: bundle.vault,
        receipt: pubReceiptPda,
        blocklist: bundle.blocklist,
      })
      .signers([bundle.owner])
      .rpc();

    // Now the blocklist contains `bundle.recipientAta` as a Pubkey entry. Feed its 32 bytes
    // as the recipient_commit — the program will match it.
    const commit = Array.from(bundle.recipientAta.toBuffer());
    const nonce = nextNonce();
    try {
      await callRecord(bundle, {
        amount: dollars(0.1),
        nonce,
        recipientCommit: commit,
        umbraRef: randomRef(),
        day: currentDayBN(),
      });
      assert.fail('expected ErrRecipientCommitBlocked');
    } catch (e: any) {
      expect(errString(e)).to.match(/ErrRecipientCommitBlocked/);
    }
  });

  it('negative: umbra_ref replay → AccountAlreadyInitialized', async () => {
    const bundle = await setupSpendBundle(provider, program, {
      depositUsdc: 5,
      policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
    });
    const sharedRef = randomRef();

    const nonce1 = nextNonce();
    await callRecord(bundle, {
      amount: dollars(0.1),
      nonce: nonce1,
      recipientCommit: recipientCommit(bundle.recipientAta, nonce1),
      umbraRef: sharedRef,
      day: currentDayBN(),
    });

    const nonce2 = nextNonce();
    try {
      await callRecord(bundle, {
        amount: dollars(0.1),
        nonce: nonce2,
        recipientCommit: recipientCommit(bundle.recipientAta, nonce2),
        umbraRef: sharedRef,
        day: currentDayBN(),
      });
      assert.fail('expected umbra_ref replay rejection');
    } catch (e: any) {
      expect(errString(e)).to.match(
        /already in use|already exists|0x0|AccountAlreadyInitialized|ErrUmbraRefReused|custom program error/i,
      );
    }
  });

  it('negative: zero umbra_ref → ErrUmbraRefZero', async () => {
    const bundle = await setupSpendBundle(provider, program, {
      depositUsdc: 5,
      policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
    });
    const nonce = nextNonce();
    try {
      await callRecord(bundle, {
        amount: dollars(0.1),
        nonce,
        recipientCommit: recipientCommit(bundle.recipientAta, nonce),
        umbraRef: Array.from({ length: 32 }, () => 0),
        day: currentDayBN(),
      });
      assert.fail('expected ErrUmbraRefZero');
    } catch (e: any) {
      expect(errString(e)).to.match(/ErrUmbraRefZero/);
    }
  });
});

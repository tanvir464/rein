import { describe, it, expect } from 'vitest';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

import { DelegateSigner, OwnerSigner } from '../../src';

const DUMMY_BLOCKHASH = '11111111111111111111111111111111';

describe('DelegateSigner', () => {
  it('exposes the keypair public key', () => {
    const kp = Keypair.generate();
    const s = new DelegateSigner(kp);
    expect(s.publicKey.toBase58()).toBe(kp.publicKey.toBase58());
  });

  it('signs a legacy Transaction', async () => {
    const kp = Keypair.generate();
    const s = new DelegateSigner(kp);
    const tx = new Transaction();
    tx.feePayer = kp.publicKey;
    tx.recentBlockhash = DUMMY_BLOCKHASH;
    tx.add(
      SystemProgram.transfer({
        fromPubkey: kp.publicKey,
        toPubkey: PublicKey.default,
        lamports: 1,
      }),
    );
    const signed = await s.signTransaction(tx);
    const sig = signed.signatures.find((sg) =>
      sg.publicKey.equals(kp.publicKey),
    );
    expect(sig?.signature).not.toBeNull();
  });

  it('signs a VersionedTransaction', async () => {
    const kp = Keypair.generate();
    const s = new DelegateSigner(kp);
    const ix = SystemProgram.transfer({
      fromPubkey: kp.publicKey,
      toPubkey: PublicKey.default,
      lamports: 1,
    });
    const message = new TransactionMessage({
      payerKey: kp.publicKey,
      recentBlockhash: DUMMY_BLOCKHASH,
      instructions: [ix],
    }).compileToV0Message();
    const vtx = new VersionedTransaction(message);
    const signed = await s.signTransaction(vtx);
    expect(signed.signatures[0]).not.toEqual(new Uint8Array(64));
  });

  it('signAllTransactions signs each in turn', async () => {
    const kp = Keypair.generate();
    const s = new DelegateSigner(kp);
    const t1 = new Transaction();
    t1.feePayer = kp.publicKey;
    t1.recentBlockhash = DUMMY_BLOCKHASH;
    t1.add(
      SystemProgram.transfer({
        fromPubkey: kp.publicKey,
        toPubkey: PublicKey.default,
        lamports: 1,
      }),
    );
    const t2 = new Transaction();
    t2.feePayer = kp.publicKey;
    t2.recentBlockhash = DUMMY_BLOCKHASH;
    t2.add(
      SystemProgram.transfer({
        fromPubkey: kp.publicKey,
        toPubkey: PublicKey.default,
        lamports: 2,
      }),
    );
    const out = await s.signAllTransactions([t1, t2]);
    expect(out).toHaveLength(2);
    for (const tx of out) {
      const sig = tx.signatures.find((sg) => sg.publicKey.equals(kp.publicKey));
      expect(sig?.signature).not.toBeNull();
    }
  });
});

describe('OwnerSigner', () => {
  it('forwards signTransaction to the impl', async () => {
    const kp = Keypair.generate();
    let calls = 0;
    const s = new OwnerSigner(kp.publicKey, {
      signTransaction: async (tx) => {
        calls++;
        return tx;
      },
    });
    expect(s.publicKey.equals(kp.publicKey)).toBe(true);
    await s.signTransaction(new Transaction());
    expect(calls).toBe(1);
  });

  it('uses impl.signAllTransactions when present', async () => {
    const kp = Keypair.generate();
    let usedAll = false;
    const s = new OwnerSigner(kp.publicKey, {
      signTransaction: async (tx) => tx,
      signAllTransactions: async (txs) => {
        usedAll = true;
        return txs;
      },
    });
    await s.signAllTransactions([new Transaction(), new Transaction()]);
    expect(usedAll).toBe(true);
  });

  it('falls back to mapping signTransaction when impl.signAllTransactions is absent', async () => {
    const kp = Keypair.generate();
    let count = 0;
    const s = new OwnerSigner(kp.publicKey, {
      signTransaction: async (tx) => {
        count++;
        return tx;
      },
    });
    await s.signAllTransactions([new Transaction(), new Transaction()]);
    expect(count).toBe(2);
  });
});

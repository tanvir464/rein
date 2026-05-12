import { describe, it, expect } from 'vitest';
import { Keypair } from '@solana/web3.js';

import { verifyReceipt, deriveReceiptPda, type Receipt } from '../../src';
import BN from 'bn.js';

function mkReceipt(over: Partial<Receipt> = {}): Receipt {
  const vault = Keypair.generate().publicKey;
  const recipient = Keypair.generate().publicKey;
  const nonce = 1234n;
  const [pda] = deriveReceiptPda(vault, new BN(nonce.toString()));
  return {
    id: pda.toBase58(),
    signature: 'someSig',
    vault: vault.toBase58(),
    amount: 1_000n,
    recipient: recipient.toBase58(),
    ts: new Date(),
    policyVersion: 1,
    nonce,
    disputed: false,
    ...over,
  };
}

describe('verifyReceipt — pure (no Connection)', () => {
  it('returns valid when PDA matches the receipt', async () => {
    const r = mkReceipt();
    const result = await verifyReceipt(r);
    expect(result.valid).toBe(true);
  });

  it('rejects PDA mismatch (tampered nonce)', async () => {
    const r = mkReceipt();
    const tampered: Receipt = { ...r, nonce: 9999n };
    const result = await verifyReceipt(tampered);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toMatch(/PDA mismatch/);
    }
  });

  it('rejects bad vault base58', async () => {
    const r = mkReceipt({ vault: 'not-base58!!' });
    const result = await verifyReceipt(r);
    expect(result.valid).toBe(false);
  });

  it('passes when signature is empty (no RPC step)', async () => {
    const r = mkReceipt({ signature: '' });
    const result = await verifyReceipt(r);
    expect(result.valid).toBe(true);
  });
});

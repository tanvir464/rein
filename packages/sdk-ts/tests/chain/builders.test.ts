import { describe, it, expect } from 'vitest';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import {
  REIN_PROGRAM_ID,
  buildInitVaultIx,
  buildDepositIx,
  buildInitPolicyIx,
  buildUpdatePolicyIx,
  buildRequestStepUpIx,
  buildApproveStepUpIx,
  buildPauseIx,
  buildDisputeIx,
  buildExpirePolicyIx,
  buildSpendIx,
  deriveVaultPda,
  derivePolicyPda,
  deriveBlocklistPda,
  deriveReceiptPda,
  deriveStepUpPda,
} from '../../src';
import BN from 'bn.js';

const owner = Keypair.generate().publicKey;
const usdcMint = Keypair.generate().publicKey;
const recipient = Keypair.generate().publicKey;

function uniqueAccountKeys(keys: { pubkey: PublicKey }[]): string[] {
  return [...new Set(keys.map((k) => k.pubkey.toBase58()))];
}

describe('buildInitVaultIx', () => {
  it('returns ix with correct programId, vault PDA, and accounts', async () => {
    const { ix, vault, vaultUsdcAta } = await buildInitVaultIx({ owner, usdcMint });
    expect(ix.programId.toBase58()).toBe(REIN_PROGRAM_ID.toBase58());
    expect(vault.toBase58()).toBe(deriveVaultPda(owner)[0].toBase58());
    expect(vaultUsdcAta).toBeInstanceOf(PublicKey);
    const accountKeys = uniqueAccountKeys(ix.keys);
    expect(accountKeys).toContain(owner.toBase58());
    expect(accountKeys).toContain(vault.toBase58());
    expect(accountKeys).toContain(usdcMint.toBase58());
    expect(ix.data.length).toBeGreaterThan(0);
  });
});

describe('buildDepositIx', () => {
  it('returns ix with deposit-amount data', async () => {
    const [vault] = deriveVaultPda(owner);
    const ownerAta = Keypair.generate().publicKey;
    const vaultAta = Keypair.generate().publicKey;
    const ix = await buildDepositIx({
      owner,
      vault,
      usdcMint,
      ownerUsdcAta: ownerAta,
      vaultUsdcAta: vaultAta,
      amount: 1_000_000n,
    });
    expect(ix.programId.toBase58()).toBe(REIN_PROGRAM_ID.toBase58());
    expect(ix.keys.find((k) => k.pubkey.equals(owner))?.isSigner).toBe(true);
    expect(ix.keys.find((k) => k.pubkey.equals(TOKEN_PROGRAM_ID))).toBeDefined();
  });
});

describe('buildInitPolicyIx / buildUpdatePolicyIx', () => {
  it('initPolicy includes blocklist PDA and is gated on owner signature', async () => {
    const [vault] = deriveVaultPda(owner);
    const args = {
      dailyCap: 5_000_000n,
      perTxCap: 500_000n,
      stepUpThreshold: 1_000_000n,
      expiryTs: 0n,
      paused: false,
      allowlist: [],
    };
    const { ix, policy, blocklist } = await buildInitPolicyIx({ owner, vault, args });
    expect(policy.toBase58()).toBe(derivePolicyPda(vault)[0].toBase58());
    expect(blocklist.toBase58()).toBe(deriveBlocklistPda(vault)[0].toBase58());
    expect(ix.keys.find((k) => k.pubkey.equals(owner))?.isSigner).toBe(true);
    expect(ix.keys.find((k) => k.pubkey.equals(SystemProgram.programId))).toBeDefined();
  });

  it('updatePolicy does not include blocklist (already initialized)', async () => {
    const [vault] = deriveVaultPda(owner);
    const args = {
      dailyCap: 5_000_000n,
      perTxCap: 500_000n,
      stepUpThreshold: 1_000_000n,
      expiryTs: 0n,
      paused: false,
      allowlist: [recipient],
    };
    const ix = await buildUpdatePolicyIx({ owner, vault, args });
    const blocklist = deriveBlocklistPda(vault)[0];
    expect(ix.keys.find((k) => k.pubkey.equals(blocklist))).toBeUndefined();
  });

  it('rejects allowlist > 16', async () => {
    const [vault] = deriveVaultPda(owner);
    const tooMany = Array.from({ length: 17 }, () => Keypair.generate().publicKey);
    await expect(
      buildInitPolicyIx({
        owner,
        vault,
        args: {
          dailyCap: 1n,
          perTxCap: 1n,
          stepUpThreshold: 0n,
          expiryTs: 0n,
          paused: false,
          allowlist: tooMany,
        },
      }),
    ).rejects.toThrow(/allowlist > 16/);
  });
});

describe('buildRequestStepUpIx / buildApproveStepUpIx', () => {
  it('requestStepUp derives the right StepUpRequest PDA', async () => {
    const [vault] = deriveVaultPda(owner);
    const payer = Keypair.generate().publicKey;
    const { ix, stepUpRequest } = await buildRequestStepUpIx({
      payer,
      vault,
      args: {
        amount: 2_000_000n,
        recipient,
        nonce: 99n,
        ttlSecs: 300n,
      },
    });
    expect(stepUpRequest.toBase58()).toBe(
      deriveStepUpPda(vault, new BN(99))[0].toBase58(),
    );
    expect(ix.keys.find((k) => k.pubkey.equals(payer))?.isSigner).toBe(true);
  });

  it('approveStepUp requires owner signature', async () => {
    const [vault] = deriveVaultPda(owner);
    const stepUpRequest = Keypair.generate().publicKey;
    const ix = await buildApproveStepUpIx({ owner, vault, stepUpRequest });
    expect(ix.keys.find((k) => k.pubkey.equals(owner))?.isSigner).toBe(true);
  });
});

describe('buildPauseIx / buildDisputeIx / buildExpirePolicyIx', () => {
  it('pause requires owner', async () => {
    const [vault] = deriveVaultPda(owner);
    const ix = await buildPauseIx({ owner, vault, paused: true });
    expect(ix.keys.find((k) => k.pubkey.equals(owner))?.isSigner).toBe(true);
  });

  it('dispute targets the right SpendReceipt + Blocklist PDA', async () => {
    const [vault] = deriveVaultPda(owner);
    const ix = await buildDisputeIx({ owner, vault, nonce: 7n });
    const receipt = deriveReceiptPda(vault, new BN(7))[0];
    const blocklist = deriveBlocklistPda(vault)[0];
    expect(ix.keys.find((k) => k.pubkey.equals(receipt))).toBeDefined();
    expect(ix.keys.find((k) => k.pubkey.equals(blocklist))).toBeDefined();
  });

  it('expirePolicy is permissionless (caller signs, no owner check)', async () => {
    const [vault] = deriveVaultPda(owner);
    const caller = Keypair.generate().publicKey;
    const ix = await buildExpirePolicyIx({ caller, vault });
    expect(ix.keys.find((k) => k.pubkey.equals(caller))?.isSigner).toBe(true);
  });
});

describe('buildSpendIx', () => {
  it('returns ix with correct receipt + counter PDAs and 32-byte hash', async () => {
    const [vault] = deriveVaultPda(owner);
    const vaultAta = Keypair.generate().publicKey;
    const recipientAta = Keypair.generate().publicKey;
    const day = 20212n;
    const nonce = 12345n;
    const { ix, receipt, counter } = await buildSpendIx({
      payer: owner,
      vault,
      usdcMint,
      vaultUsdcAta: vaultAta,
      recipientUsdcAta: recipientAta,
      args: {
        amount: 100_000n,
        nonce,
        x402UrlHash: new Array(32).fill(0),
        day,
      },
    });
    expect(receipt.toBase58()).toBe(deriveReceiptPda(vault, new BN(nonce.toString()))[0].toBase58());
    expect(counter).toBeDefined();
    expect(ix.programId.toBase58()).toBe(REIN_PROGRAM_ID.toBase58());
  });

  it('rejects non-32-byte hash', async () => {
    const [vault] = deriveVaultPda(owner);
    await expect(
      buildSpendIx({
        payer: owner,
        vault,
        usdcMint,
        vaultUsdcAta: Keypair.generate().publicKey,
        recipientUsdcAta: Keypair.generate().publicKey,
        args: {
          amount: 1n,
          nonce: 1n,
          x402UrlHash: new Array(31).fill(0),
          day: 0n,
        },
      }),
    ).rejects.toThrow(/expected 32 bytes/);
  });
});

import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';

import { Rein } from '../../target/types/rein';
import { createUsdcFixture } from './usdc-mint';
import { fundedKeypair } from './wallets';
import { defaultPolicyArgs, PolicyArgsLike } from './policy';
import { deriveBlocklistPda } from './blocklist';

const VAULT_SEED = Buffer.from('vault');
const POLICY_SEED = Buffer.from('policy');
const COUNTER_SEED = Buffer.from('counter');
const RECEIPT_SEED = Buffer.from('receipt');

export const SECONDS_PER_DAY = 86_400;

export function deriveVaultPda(owner: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([VAULT_SEED, owner.toBuffer()], programId);
}

export function derivePolicyPda(vault: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([POLICY_SEED, vault.toBuffer()], programId);
}

export function deriveCounterPda(
  vault: PublicKey,
  day: BN,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [COUNTER_SEED, vault.toBuffer(), day.toArrayLike(Buffer, 'le', 8)],
    programId,
  );
}

export function deriveReceiptPda(
  vault: PublicKey,
  nonce: BN,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [RECEIPT_SEED, vault.toBuffer(), nonce.toArrayLike(Buffer, 'le', 8)],
    programId,
  );
}

export function currentDayBN(): BN {
  return new BN(Math.floor(Date.now() / 1000 / SECONDS_PER_DAY));
}

let nonceCounter = Date.now();
export function nextNonce(): BN {
  // Monotonic, unique across tests in one process. Avoid Date.now() collision in tight loops.
  nonceCounter += 1;
  return new BN(nonceCounter);
}

export const ZERO_HASH: number[] = Array.from({ length: 32 }, () => 0);

export type SpendBundle = {
  owner: Keypair;
  payer: Keypair;
  recipientWallet: Keypair;
  recipientAta: PublicKey;
  mint: PublicKey;
  vault: PublicKey;
  vaultBump: number;
  vaultAta: PublicKey;
  policy: PublicKey;
  blocklist: PublicKey;
};

/**
 * One-shot fixture: funded owner + vault initialized + policy initialized + recipient ATA ready.
 * The vault is pre-funded with `depositUsdc` USDC.
 */
export async function setupSpendBundle(
  provider: anchor.AnchorProvider,
  program: Program<Rein>,
  opts: {
    depositUsdc: number;
    policy?: Partial<PolicyArgsLike>;
  },
): Promise<SpendBundle> {
  const owner = await fundedKeypair(provider, 5);
  const payer = owner; // simplest path — one signer

  const fixture = await createUsdcFixture(provider, owner, opts.depositUsdc);
  const mint = fixture.mint;

  const [vault, vaultBump] = deriveVaultPda(owner.publicKey, program.programId);
  const vaultAta = await getAssociatedTokenAddress(mint, vault, true);

  await program.methods
    .initVault()
    .accountsStrict({
      owner: owner.publicKey,
      vault,
      usdcMint: mint,
      vaultUsdcAta: vaultAta,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([owner])
    .rpc();

  // Move the deposit into the vault.
  if (opts.depositUsdc > 0) {
    await program.methods
      .deposit(new BN(opts.depositUsdc).mul(new BN(1_000_000)))
      .accountsStrict({
        owner: owner.publicKey,
        vault,
        usdcMint: mint,
        ownerUsdcAta: fixture.payerAta.address,
        vaultUsdcAta: vaultAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();
  }

  const [policy] = derivePolicyPda(vault, program.programId);
  const [blocklist] = deriveBlocklistPda(vault, program.programId);
  await program.methods
    .initPolicy(defaultPolicyArgs(opts.policy ?? {}) as any)
    .accountsStrict({
      owner: owner.publicKey,
      vault,
      policy,
      blocklist,
      systemProgram: SystemProgram.programId,
    })
    .signers([owner])
    .rpc();

  // Recipient: a fresh wallet with a USDC ATA.
  const recipientWallet = await fundedKeypair(provider, 1);
  const recipientAta = (
    await getOrCreateAssociatedTokenAccount(
      provider.connection,
      owner,
      mint,
      recipientWallet.publicKey,
    )
  ).address;

  return {
    owner,
    payer,
    recipientWallet,
    recipientAta,
    mint,
    vault,
    vaultBump,
    vaultAta,
    policy,
    blocklist,
  };
}

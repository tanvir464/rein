import * as anchor from '@coral-xyz/anchor';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  Account as TokenAccount,
} from '@solana/spl-token';
import { Keypair, PublicKey } from '@solana/web3.js';

export const USDC_DECIMALS = 6;

export async function createUsdcFixture(
  provider: anchor.AnchorProvider,
  payer: Keypair,
  initialAmountUsdc: number,
  recipient?: PublicKey,
): Promise<{ mint: PublicKey; payerAta: TokenAccount }> {
  const mint = await createMint(
    provider.connection,
    payer,
    payer.publicKey,
    null,
    USDC_DECIMALS,
  );

  const target = recipient ?? payer.publicKey;
  const payerAta = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer,
    mint,
    target,
  );

  if (initialAmountUsdc > 0) {
    await mintTo(
      provider.connection,
      payer,
      mint,
      payerAta.address,
      payer,
      BigInt(initialAmountUsdc) * BigInt(10 ** USDC_DECIMALS),
    );
  }

  return { mint, payerAta };
}

export const toMicroUsdc = (n: number | bigint): bigint =>
  BigInt(n) * BigInt(10 ** USDC_DECIMALS);

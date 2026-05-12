import * as anchor from '@coral-xyz/anchor';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

export async function fundedKeypair(
  provider: anchor.AnchorProvider,
  sol = 5,
): Promise<Keypair> {
  const kp = Keypair.generate();
  const sig = await provider.connection.requestAirdrop(kp.publicKey, sol * LAMPORTS_PER_SOL);
  const latest = await provider.connection.getLatestBlockhash();
  await provider.connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
  return kp;
}

/** Find the right test recipient ATA for spend testing.
 *  - Reads the vault on-chain to get its owner.
 *  - Derives the owner's USDC ATA for the test mint.
 *  - Prints both as a sanity check. */
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { IDL } from '@rein/sdk';

const VAULT = new PublicKey('9gcGE9yz3zAavQLCXP5yBPEn9n7NmRiupwVG5mKGfc4v');
const MINT = new PublicKey('5KdxeDZXVupi7FN7ipox7SV2P4Hqjn4HVUUcGS7f4xB6');
const RPC = process.env.ANCHOR_PROVIDER_URL ?? process.env.HELIUS_RPC_URL ?? 'https://api.devnet.solana.com';

(async () => {
  const conn = new Connection(RPC, 'confirmed');
  const dummy = Keypair.generate();
  const wallet = {
    publicKey: dummy.publicKey,
    signTransaction: async <T>(tx: T) => tx,
    signAllTransactions: async <T>(txs: T[]) => txs,
    payer: dummy,
  };
  const provider = new AnchorProvider(conn, wallet as never, AnchorProvider.defaultOptions());
  const program = new Program(IDL as never, provider);

  const v = await (program.account as never)['vault'].fetch(VAULT);
  const owner = (v.owner as PublicKey).toBase58();
  const ownerAta = getAssociatedTokenAddressSync(MINT, new PublicKey(owner));

  console.log('vault owner:    ', owner);
  console.log('vault USDC ATA: ', getAssociatedTokenAddressSync(MINT, VAULT, true).toBase58());
  console.log('owner USDC ATA: ', ownerAta.toBase58(), '   ← use this as STUB_RECIPIENT');

  // Confirm the owner ATA actually exists on-chain
  const acc = await conn.getAccountInfo(ownerAta);
  console.log('owner ATA exists on-chain:', !!acc);
})().catch((e) => {
  console.error('error:', e);
  process.exit(1);
});

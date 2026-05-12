/**
 * Seed devnet with a real REIN vault + policy + deposit + spend so the service
 * has something to query against. Idempotent-ish: skips init steps if the vault
 * already exists. Prints the curl command at the end.
 *
 * Run via:
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *   ANCHOR_WALLET=$HOME/.config/solana/id.json \
 *   npx ts-node --esm program/scripts/seed-devnet.ts
 *
 * Or simpler from inside `program/`:
 *   anchor run seed-devnet     (after we wire it into Anchor.toml [scripts])
 */
import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js';

import type { Rein } from '../target/types/rein';

const VAULT_SEED = Buffer.from('vault');
const POLICY_SEED = Buffer.from('policy');
const BLOCKLIST_SEED = Buffer.from('blocklist');
const COUNTER_SEED = Buffer.from('counter');
const RECEIPT_SEED = Buffer.from('receipt');

function pda(seeds: (Buffer | Uint8Array)[], programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

const dollars = (n: number) => new BN(Math.round(n * 1_000_000));

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.rein as Program<Rein>;

  const owner = (provider.wallet as anchor.Wallet).payer;
  console.log('owner:    ', owner.publicKey.toBase58());
  console.log('cluster:  ', provider.connection.rpcEndpoint);

  const balLamports = await provider.connection.getBalance(owner.publicKey);
  console.log('balance:  ', balLamports / LAMPORTS_PER_SOL, 'SOL');
  if (balLamports < 0.5 * LAMPORTS_PER_SOL) {
    throw new Error(`owner has < 0.5 SOL on this cluster — top up with \`solana airdrop 2\``);
  }

  // ── 1. Test USDC mint (we own; reusable across seeds via cache file) ──
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const cachePath = path.resolve(here, '..', '.devnet-seed.json');
  let cache: { mint?: string; vault?: string } = {};
  if (fs.existsSync(cachePath)) {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }

  let mint: PublicKey;
  if (cache.mint) {
    mint = new PublicKey(cache.mint);
    console.log('mint (cached):', mint.toBase58());
  } else {
    console.log('creating REIN test USDC mint…');
    mint = await createMint(provider.connection, owner, owner.publicKey, null, 6);
    console.log('mint (new):   ', mint.toBase58());
    cache.mint = mint.toBase58();
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  }

  // Owner's USDC ATA + mint $100 if low
  const ownerAta = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    owner,
    mint,
    owner.publicKey,
  );
  const ownerBal = (await getAccount(provider.connection, ownerAta.address)).amount;
  if (ownerBal < BigInt(50 * 1_000_000)) {
    console.log('minting $100 USDC to owner…');
    await mintTo(
      provider.connection,
      owner,
      mint,
      ownerAta.address,
      owner,
      BigInt(100 * 1_000_000),
    );
  }

  // ── 2. Vault PDA ──
  const [vault, vaultBump] = pda([VAULT_SEED, owner.publicKey.toBuffer()], program.programId);
  console.log('vault:    ', vault.toBase58(), `(bump ${vaultBump})`);

  const vaultExists = await provider.connection.getAccountInfo(vault);
  const vaultAta = await getAssociatedTokenAddress(mint, vault, true);

  if (!vaultExists) {
    console.log('init_vault…');
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
  } else {
    console.log('vault already initialized');
  }
  cache.vault = vault.toBase58();
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

  // ── 3. Policy + Blocklist (atomic via init_policy) ──
  const [policy] = pda([POLICY_SEED, vault.toBuffer()], program.programId);
  const [blocklist] = pda([BLOCKLIST_SEED, vault.toBuffer()], program.programId);
  const policyExists = await provider.connection.getAccountInfo(policy);
  if (!policyExists) {
    console.log('init_policy…');
    await program.methods
      .initPolicy({
        dailyCap: dollars(5),
        perTxCap: dollars(0.5),
        stepUpThreshold: dollars(1),
        expiryTs: new BN(0),
        paused: false,
        allowlist: [],
      } as any)
      .accountsStrict({
        owner: owner.publicKey,
        vault,
        policy,
        blocklist,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();
  } else {
    console.log('policy already initialized');
  }

  // ── 4. Deposit $10 USDC into vault ──
  const vaultAtaInfo = await getAccount(provider.connection, vaultAta);
  if (vaultAtaInfo.amount < BigInt(5 * 1_000_000)) {
    console.log('deposit $10 → vault…');
    await program.methods
      .deposit(new BN(10 * 1_000_000))
      .accountsStrict({
        owner: owner.publicKey,
        vault,
        usdcMint: mint,
        ownerUsdcAta: ownerAta.address,
        vaultUsdcAta: vaultAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();
  }

  // ── 5. Make a real spend → real Receipt PDA ──
  // Recipient: a fresh wallet with a USDC ATA so we don't pollute owner state.
  const recipientWallet = Keypair.generate();
  const recipientAta = (
    await getOrCreateAssociatedTokenAccount(
      provider.connection,
      owner,
      mint,
      recipientWallet.publicKey,
    )
  ).address;

  const day = new BN(Math.floor(Date.now() / 1000 / 86_400));
  const nonce = new BN(Date.now()); // monotonic, unique per script run
  const [counterPda] = pda(
    [COUNTER_SEED, vault.toBuffer(), day.toArrayLike(Buffer, 'le', 8)],
    program.programId,
  );
  const [receiptPda] = pda(
    [RECEIPT_SEED, vault.toBuffer(), nonce.toArrayLike(Buffer, 'le', 8)],
    program.programId,
  );

  console.log('spend $0.30 → recipient…');
  const sig = await program.methods
    .spend({
      amount: new BN(300_000),
      nonce,
      x402UrlHash: Array(32).fill(0),
      day,
    } as any)
    .accountsStrict({
      payer: owner.publicKey,
      vault,
      policy,
      usdcMint: mint,
      vaultUsdcAta: vaultAta,
      recipientUsdcAta: recipientAta,
      dailyCounter: counterPda,
      receipt: receiptPda,
      blocklist,
      stepUpRequest: null,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([owner])
    .rpc();
  console.log('spend signature:', sig);

  // ── 6. Print the curl ──
  console.log('\n──────────────────────────────────────────────────────────────');
  console.log('SEED COMPLETE.');
  console.log('mint:      ', mint.toBase58());
  console.log('vault:     ', vault.toBase58());
  console.log('policy:    ', policy.toBase58());
  console.log('blocklist: ', blocklist.toBase58());
  console.log('receipt:   ', receiptPda.toBase58());
  console.log('nonce:     ', nonce.toString());
  console.log('day:       ', day.toString());
  console.log('\nQuery the receipt:');
  console.log(
    `  curl "http://127.0.0.1:8787/v1/receipts/${nonce.toString()}?vault=${vault.toBase58()}"`,
  );
  console.log('\nView on Solana Explorer:');
  console.log(
    `  https://explorer.solana.com/address/${receiptPda.toBase58()}?cluster=devnet`,
  );
  console.log('──────────────────────────────────────────────────────────────\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

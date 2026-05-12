import { AnchorProvider, Program } from '@coral-xyz/anchor';
import BN from 'bn.js';
import { createHash } from 'node:crypto';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';

import { IDL, type Rein } from '../idl';
import {
  deriveBlocklistPda,
  deriveCounterPda,
  derivePolicyPda,
  deriveReceiptPda,
  deriveReceiptV2Pda,
  deriveStepUpPda,
  deriveUmbraRefMarkerPda,
  deriveVaultPda,
} from '../pdas';
import { REIN_PROGRAM_ID } from '../program-id';

/**
 * Owner- and delegate-side instruction builders for every program ix except
 * `spend` (which lives in the service today and is invoked through
 * `Rein.spend()`). Returns raw `TransactionInstruction`s; the caller composes
 * them into a `Transaction` / `VersionedTransaction` and signs.
 *
 * All builders use Anchor's typed `.methods(…).accountsStrict(…).instruction()`
 * so missing accounts surface at compile time, not on devnet.
 */

let cachedProgram: Program<Rein> | null = null;
function getReadonlyProgram(): Program<Rein> {
  if (cachedProgram) return cachedProgram;
  // Anchor needs a Provider with a Wallet, but `.instruction()` doesn't actually
  // sign or send anything — the wallet is a placeholder.
  const dummyKp = Keypair.generate();
  const conn = { rpcEndpoint: 'http://noop' } as unknown as Connection;
  const wallet = {
    publicKey: dummyKp.publicKey,
    signTransaction: async <T>(tx: T) => tx,
    signAllTransactions: async <T>(txs: T[]) => txs,
    payer: dummyKp,
  };
  const provider = new AnchorProvider(
    conn,
    wallet as never,
    AnchorProvider.defaultOptions(),
  );
  cachedProgram = new Program<Rein>(IDL as never, provider);
  return cachedProgram;
}

function normalize32(h: number[] | Uint8Array): number[] {
  const arr = Array.from(h);
  if (arr.length !== 32) {
    throw new TypeError(`expected 32 bytes, got ${arr.length}`);
  }
  return arr;
}

// ─── F1: init_vault ───────────────────────────────────────────────────
export type InitVaultInput = {
  owner: PublicKey;
  usdcMint: PublicKey;
  programId?: PublicKey;
};

export async function buildInitVaultIx(input: InitVaultInput): Promise<{
  ix: TransactionInstruction;
  vault: PublicKey;
  vaultUsdcAta: PublicKey;
}> {
  const programId = input.programId ?? REIN_PROGRAM_ID;
  const [vault] = deriveVaultPda(input.owner, programId);
  const vaultUsdcAta = getAssociatedTokenAddressSync(
    input.usdcMint,
    vault,
    true,
  );
  const ix = await getReadonlyProgram()
    .methods.initVault()
    .accountsStrict({
      owner: input.owner,
      vault,
      usdcMint: input.usdcMint,
      vaultUsdcAta,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: new PublicKey('SysvarRent111111111111111111111111111111111'),
    })
    .instruction();
  return { ix, vault, vaultUsdcAta };
}

// ─── F1: deposit ──────────────────────────────────────────────────────
export type DepositInput = {
  owner: PublicKey;
  vault: PublicKey;
  usdcMint: PublicKey;
  ownerUsdcAta: PublicKey;
  vaultUsdcAta: PublicKey;
  amount: bigint;
};

export async function buildDepositIx(
  input: DepositInput,
): Promise<TransactionInstruction> {
  return getReadonlyProgram()
    .methods.deposit(new BN(input.amount.toString()))
    .accountsStrict({
      owner: input.owner,
      vault: input.vault,
      usdcMint: input.usdcMint,
      ownerUsdcAta: input.ownerUsdcAta,
      vaultUsdcAta: input.vaultUsdcAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .instruction();
}

// ─── F2: init_policy + update_policy ─────────────────────────────────
export type PolicyArgsInput = {
  dailyCap: bigint;
  perTxCap: bigint;
  stepUpThreshold: bigint;
  expiryTs: bigint;
  paused: boolean;
  allowlist: PublicKey[];
};

function policyArgsToBn(args: PolicyArgsInput): {
  dailyCap: BN;
  perTxCap: BN;
  stepUpThreshold: BN;
  expiryTs: BN;
  paused: boolean;
  allowlist: PublicKey[];
} {
  if (args.allowlist.length > 16) {
    throw new RangeError('allowlist > 16 entries (program rejects)');
  }
  return {
    dailyCap: new BN(args.dailyCap.toString()),
    perTxCap: new BN(args.perTxCap.toString()),
    stepUpThreshold: new BN(args.stepUpThreshold.toString()),
    expiryTs: new BN(args.expiryTs.toString()),
    paused: args.paused,
    allowlist: args.allowlist,
  };
}

export async function buildInitPolicyIx(input: {
  owner: PublicKey;
  vault: PublicKey;
  args: PolicyArgsInput;
  programId?: PublicKey;
}): Promise<{
  ix: TransactionInstruction;
  policy: PublicKey;
  blocklist: PublicKey;
}> {
  const programId = input.programId ?? REIN_PROGRAM_ID;
  const [policy] = derivePolicyPda(input.vault, programId);
  const [blocklist] = deriveBlocklistPda(input.vault, programId);
  const ix = await getReadonlyProgram()
    .methods.initPolicy(policyArgsToBn(input.args))
    .accountsStrict({
      owner: input.owner,
      vault: input.vault,
      policy,
      blocklist,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  return { ix, policy, blocklist };
}

export async function buildUpdatePolicyIx(input: {
  owner: PublicKey;
  vault: PublicKey;
  args: PolicyArgsInput;
  programId?: PublicKey;
}): Promise<TransactionInstruction> {
  const programId = input.programId ?? REIN_PROGRAM_ID;
  const [policy] = derivePolicyPda(input.vault, programId);
  return getReadonlyProgram()
    .methods.updatePolicy(policyArgsToBn(input.args))
    .accountsStrict({
      owner: input.owner,
      vault: input.vault,
      policy,
    })
    .instruction();
}

// ─── F5: request_step_up + approve_step_up ───────────────────────────
export type StepUpRequestArgsInput = {
  amount: bigint;
  recipient: PublicKey;
  nonce: bigint;
  ttlSecs: bigint;
};

export async function buildRequestStepUpIx(input: {
  payer: PublicKey;
  vault: PublicKey;
  args: StepUpRequestArgsInput;
  programId?: PublicKey;
}): Promise<{ ix: TransactionInstruction; stepUpRequest: PublicKey }> {
  const programId = input.programId ?? REIN_PROGRAM_ID;
  const [policy] = derivePolicyPda(input.vault, programId);
  const [stepUpRequest] = deriveStepUpPda(
    input.vault,
    new BN(input.args.nonce.toString()),
    programId,
  );
  const ix = await getReadonlyProgram()
    .methods.requestStepUp({
      amount: new BN(input.args.amount.toString()),
      recipient: input.args.recipient,
      nonce: new BN(input.args.nonce.toString()),
      ttlSecs: new BN(input.args.ttlSecs.toString()),
    })
    .accountsStrict({
      payer: input.payer,
      vault: input.vault,
      policy,
      stepUpRequest,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  return { ix, stepUpRequest };
}

export async function buildApproveStepUpIx(input: {
  owner: PublicKey;
  vault: PublicKey;
  stepUpRequest: PublicKey;
}): Promise<TransactionInstruction> {
  return getReadonlyProgram()
    .methods.approveStepUp()
    .accountsStrict({
      owner: input.owner,
      vault: input.vault,
      stepUpRequest: input.stepUpRequest,
    })
    .instruction();
}

// ─── F6: pause / dispute / expire_policy ──────────────────────────────
export async function buildPauseIx(input: {
  owner: PublicKey;
  vault: PublicKey;
  paused: boolean;
  programId?: PublicKey;
}): Promise<TransactionInstruction> {
  const programId = input.programId ?? REIN_PROGRAM_ID;
  const [policy] = derivePolicyPda(input.vault, programId);
  return getReadonlyProgram()
    .methods.pause({ paused: input.paused })
    .accountsStrict({
      owner: input.owner,
      vault: input.vault,
      policy,
    })
    .instruction();
}

export async function buildDisputeIx(input: {
  owner: PublicKey;
  vault: PublicKey;
  nonce: bigint;
  programId?: PublicKey;
}): Promise<TransactionInstruction> {
  const programId = input.programId ?? REIN_PROGRAM_ID;
  const nonceBn = new BN(input.nonce.toString());
  const [receipt] = deriveReceiptPda(input.vault, nonceBn, programId);
  const [blocklist] = deriveBlocklistPda(input.vault, programId);
  return getReadonlyProgram()
    .methods.dispute({ nonce: nonceBn })
    .accountsStrict({
      owner: input.owner,
      vault: input.vault,
      receipt,
      blocklist,
    })
    .instruction();
}

export async function buildExpirePolicyIx(input: {
  caller: PublicKey;
  vault: PublicKey;
  programId?: PublicKey;
}): Promise<TransactionInstruction> {
  const programId = input.programId ?? REIN_PROGRAM_ID;
  const [policy] = derivePolicyPda(input.vault, programId);
  return getReadonlyProgram()
    .methods.expirePolicy()
    .accountsStrict({
      caller: input.caller,
      vault: input.vault,
      policy,
    })
    .instruction();
}

// ─── F3: spend (reusable for direct-mode signing; used by `Rein.spendDirect`) ─
export type SpendArgsInput = {
  amount: bigint;
  nonce: bigint;
  x402UrlHash: number[] | Uint8Array;
  day: bigint;
};

export async function buildSpendIx(input: {
  payer: PublicKey;
  vault: PublicKey;
  usdcMint: PublicKey;
  vaultUsdcAta: PublicKey;
  recipientUsdcAta: PublicKey;
  stepUpRequest?: PublicKey | null;
  args: SpendArgsInput;
  programId?: PublicKey;
}): Promise<{
  ix: TransactionInstruction;
  receipt: PublicKey;
  counter: PublicKey;
}> {
  const programId = input.programId ?? REIN_PROGRAM_ID;
  const [policy] = derivePolicyPda(input.vault, programId);
  const [blocklist] = deriveBlocklistPda(input.vault, programId);
  const nonceBn = new BN(input.args.nonce.toString());
  const dayBn = new BN(input.args.day.toString());
  const [receipt] = deriveReceiptPda(input.vault, nonceBn, programId);
  const [counter] = deriveCounterPda(input.vault, dayBn, programId);

  const ix = await getReadonlyProgram()
    .methods.spend({
      amount: new BN(input.args.amount.toString()),
      nonce: nonceBn,
      x402UrlHash: normalize32(input.args.x402UrlHash),
      day: dayBn,
    } as never)
    .accountsStrict({
      payer: input.payer,
      vault: input.vault,
      policy,
      usdcMint: input.usdcMint,
      vaultUsdcAta: input.vaultUsdcAta,
      recipientUsdcAta: input.recipientUsdcAta,
      dailyCounter: counter,
      receipt,
      blocklist,
      stepUpRequest: input.stepUpRequest ?? null,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
  return { ix, receipt, counter };
}

// ─── U1: record_private_spend ─────────────────────────────────────────
//
// Anchor instruction data is encoded manually here because the IDL was generated
// before this ix existed. Discriminator = sha256("global:record_private_spend")[..8];
// args layout follows Borsh: u64 amount, u64 nonce, [u8;32] recipient_commit,
// [u8;32] umbra_ref, u64 day.
export type RecordPrivateSpendArgsInput = {
  amount: bigint;
  nonce: bigint;
  recipientCommit: Uint8Array | number[];
  umbraRef: Uint8Array | number[];
  day: bigint;
};

function anchorDiscriminator(ixName: string): Buffer {
  return createHash('sha256').update(`global:${ixName}`).digest().subarray(0, 8);
}

function u64LeBuf(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n, 0);
  return b;
}

function encodeRecordPrivateSpendArgs(args: RecordPrivateSpendArgsInput): Buffer {
  const recipientCommit = Buffer.from(args.recipientCommit);
  const umbraRef = Buffer.from(args.umbraRef);
  if (recipientCommit.length !== 32) {
    throw new RangeError(`recipientCommit must be 32 bytes, got ${recipientCommit.length}`);
  }
  if (umbraRef.length !== 32) {
    throw new RangeError(`umbraRef must be 32 bytes, got ${umbraRef.length}`);
  }
  return Buffer.concat([
    anchorDiscriminator('record_private_spend'),
    u64LeBuf(args.amount),
    u64LeBuf(args.nonce),
    recipientCommit,
    umbraRef,
    u64LeBuf(args.day),
  ]);
}

export async function buildRecordPrivateSpendIx(input: {
  payer: PublicKey;
  vault: PublicKey;
  stepUpRequest?: PublicKey | null;
  args: RecordPrivateSpendArgsInput;
  programId?: PublicKey;
}): Promise<{
  ix: TransactionInstruction;
  receipt: PublicKey;
  counter: PublicKey;
  umbraRefMarker: PublicKey;
}> {
  const programId = input.programId ?? REIN_PROGRAM_ID;
  const [policy] = derivePolicyPda(input.vault, programId);
  const [blocklist] = deriveBlocklistPda(input.vault, programId);
  const nonceBn = new BN(input.args.nonce.toString());
  const dayBn = new BN(input.args.day.toString());
  const [receipt] = deriveReceiptV2Pda(input.vault, nonceBn, programId);
  const [counter] = deriveCounterPda(input.vault, dayBn, programId);
  const [umbraRefMarker] = deriveUmbraRefMarkerPda(input.vault, input.args.umbraRef, programId);

  const data = encodeRecordPrivateSpendArgs(input.args);

  const keys = [
    { pubkey: input.payer, isSigner: true, isWritable: true },
    { pubkey: input.vault, isSigner: false, isWritable: false },
    { pubkey: policy, isSigner: false, isWritable: false },
    { pubkey: counter, isSigner: false, isWritable: true },
    { pubkey: receipt, isSigner: false, isWritable: true },
    { pubkey: umbraRefMarker, isSigner: false, isWritable: true },
    { pubkey: blocklist, isSigner: false, isWritable: false },
    // Optional step_up_request: Anchor encodes Option<Account> by including the
    // account when Some(pubkey) is passed or the program_id sentinel when None.
    {
      pubkey: input.stepUpRequest ?? programId,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const ix = new TransactionInstruction({ programId, keys, data });
  return { ix, receipt, counter, umbraRefMarker };
}

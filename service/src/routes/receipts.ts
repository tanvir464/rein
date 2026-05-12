import { Hono } from 'hono';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import { deriveReceiptPda } from '@rein/sdk';
import type { Env } from '../env';
import type { AuthedContext } from '../auth/middleware';
import { requireAuth } from '../auth/middleware';
import { programFromEnv } from '../solana/rpc';
import { memoKvKey } from '../umbra/memo';
import { logLine } from '../log';

export type ReceiptJson = {
  id: string;            // PDA address
  vault: string;
  amount: string;        // micro-USDC, string-encoded for BigInt safety
  recipient: string;     // token account address
  ts: number;            // unix seconds
  policyVersion: number;
  nonce: string;         // u64, string-encoded
  x402UrlHash: string;   // hex-encoded 32 bytes
  disputed: boolean;
};

function bytesToHex(b: number[] | Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}

function isPositiveIntStr(s: string): boolean {
  return /^[1-9]\d*$/.test(s) || s === '0';
}

function tryPubkey(s: string): PublicKey | null {
  try {
    return new PublicKey(s);
  } catch {
    return null;
  }
}

export const receiptsRouter = new Hono<AuthedContext>();

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/receipts/private?vault=...
//   Public read — returns confidential receipts only. Recipient and memo
//   are omitted; the dashboard decrypts the memo client-side via view key
//   through GET /v1/receipts/private/:nonce/memo.
// ─────────────────────────────────────────────────────────────────────────
//
// We decode SpendReceipt v2 manually rather than via Anchor's IDL decoder
// because the IDL on disk lags the on-chain layout by these three fields
// (added in U1; IDL regen requires `anchor build` from WSL). Layout matches
// `program/programs/rein/src/state/receipt.rs` byte-for-byte.
function decodeReceiptV2(data: Buffer): {
  vault: PublicKey;
  amount: bigint;
  recipient: PublicKey;
  ts: number;
  policyVersion: number;
  nonce: bigint;
  x402UrlHash: Buffer;
  bump: number;
  disputed: boolean;
  confidential: boolean;
  recipientCommit: Buffer;
  umbraRef: Buffer;
} | null {
  if (data.length < 8 + 32 + 8 + 32 + 8 + 4 + 8 + 32 + 1 + 1 + 1 + 32 + 32) return null;
  let o = 8; // skip discriminator
  const vault = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const amount = data.readBigUInt64LE(o); o += 8;
  const recipient = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const ts = Number(data.readBigInt64LE(o)); o += 8;
  const policyVersion = data.readUInt32LE(o); o += 4;
  const nonce = data.readBigUInt64LE(o); o += 8;
  const x402UrlHash = Buffer.from(data.subarray(o, o + 32)); o += 32;
  const bump = data.readUInt8(o); o += 1;
  const disputed = data.readUInt8(o) !== 0; o += 1;
  const confidential = data.readUInt8(o) !== 0; o += 1;
  const recipientCommit = Buffer.from(data.subarray(o, o + 32)); o += 32;
  const umbraRef = Buffer.from(data.subarray(o, o + 32)); o += 32;
  return {
    vault,
    amount,
    recipient,
    ts,
    policyVersion,
    nonce,
    x402UrlHash,
    bump,
    disputed,
    confidential,
    recipientCommit,
    umbraRef,
  };
}

receiptsRouter.get('/v1/receipts/private', async (c: any) => {
  const start = Date.now();
  const env: Env = c.env;
  const vaultStr = c.req.query('vault');
  if (!vaultStr) {
    return c.json({ error: 'missing required query param: vault' }, 400);
  }
  const vault = tryPubkey(vaultStr);
  if (!vault) {
    return c.json({ error: 'vault is not a valid base58 pubkey' }, 400);
  }

  const program = programFromEnv(env);
  try {
    const conn = program.provider.connection;
    const accounts = await conn.getProgramAccounts(program.programId, {
      filters: [
        { dataSize: 230 },
        { memcmp: { offset: 8, bytes: vault.toBase58() } },
      ],
    });
    const out: any[] = [];
    for (const a of accounts) {
      const decoded = decodeReceiptV2(a.account.data as Buffer);
      if (!decoded || !decoded.confidential) continue;
      out.push({
        id: a.pubkey.toBase58(),
        vault: decoded.vault.toBase58(),
        amount: decoded.amount.toString(),
        ts: decoded.ts,
        policyVersion: decoded.policyVersion,
        nonce: decoded.nonce.toString(),
        recipientCommit: decoded.recipientCommit.toString('hex'),
        umbraRef: decoded.umbraRef.toString('hex'),
        confidential: true,
        disputed: decoded.disputed,
      });
    }
    out.sort((x, y) => y.ts - x.ts);

    logLine({
      route: 'GET /v1/receipts/private',
      vault: vaultStr,
      count: out.length,
      latency_ms: Date.now() - start,
      outcome: 'ok',
    });
    return c.json({ vault: vaultStr, items: out }, 200, {
      'cache-control': 'public, max-age=15',
    });
  } catch (e: any) {
    return c.json({ error: 'internal error', detail: e?.message ?? String(e) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/receipts/private/:nonce/memo
//   JWT-required. Returns the encrypted memo blob from KV. The owner
//   decrypts in-browser using their view key; the worker never sees plaintext.
// ─────────────────────────────────────────────────────────────────────────
receiptsRouter.get('/v1/receipts/private/:nonce/memo', requireAuth('spend'), async (c: any) => {
  const env: Env = c.env;
  const nonce = c.req.param('nonce');
  if (!/^[1-9]\d*$/.test(nonce) && nonce !== '0') {
    return c.json({ error: 'nonce must be a non-negative integer' }, 400);
  }
  if (!env.REIN_KV) {
    return c.json({ error: 'memo storage unavailable: REIN_KV not bound' }, 503);
  }
  const raw = await env.REIN_KV.get(memoKvKey(nonce));
  if (!raw) {
    return c.json({ error: 'memo not found' }, 404);
  }
  try {
    const memo = JSON.parse(raw);
    return c.json({ nonce, memo }, 200);
  } catch {
    return c.json({ error: 'corrupt memo entry' }, 500);
  }
});

receiptsRouter.get('/v1/receipts/:nonce', async (c) => {
  const start = Date.now();
  const env = c.env;
  const nonceStr = c.req.param('nonce');
  const vaultStr = c.req.query('vault');

  if (!vaultStr) {
    return c.json({ error: 'missing required query param: vault' }, 400);
  }
  if (!isPositiveIntStr(nonceStr)) {
    return c.json({ error: 'nonce must be a non-negative integer' }, 400);
  }
  const vault = tryPubkey(vaultStr);
  if (!vault) {
    return c.json({ error: 'vault is not a valid base58 pubkey' }, 400);
  }

  const nonce = new BN(nonceStr);
  const program = programFromEnv(env);
  const [receiptPda] = deriveReceiptPda(vault, nonce, program.programId);

  try {
    const receipt = await program.account.spendReceipt.fetch(receiptPda);
    const body: ReceiptJson = {
      id: receiptPda.toBase58(),
      vault: (receipt.vault as PublicKey).toBase58(),
      amount: (receipt.amount as BN).toString(),
      recipient: (receipt.recipient as PublicKey).toBase58(),
      ts: (receipt.ts as BN).toNumber(),
      policyVersion: receipt.policyVersion as number,
      nonce: (receipt.nonce as BN).toString(),
      x402UrlHash: bytesToHex(receipt.x402UrlHash as number[] | Uint8Array),
      disputed: receipt.disputed as boolean,
    };
    logLine({
      route: 'GET /v1/receipts/:nonce',
      vault: vaultStr,
      nonce: nonceStr,
      latency_ms: Date.now() - start,
      outcome: 'ok',
    });
    return c.json(body, 200, { 'cache-control': 'public, max-age=30' });
  } catch (e: any) {
    const msg: string = e?.message ?? String(e);
    if (/Account does not exist|could not find/.test(msg)) {
      logLine({
        route: 'GET /v1/receipts/:nonce',
        vault: vaultStr,
        nonce: nonceStr,
        latency_ms: Date.now() - start,
        outcome: '404',
      });
      return c.json({ error: 'receipt not found' }, 404);
    }
    logLine({
      route: 'GET /v1/receipts/:nonce',
      vault: vaultStr,
      nonce: nonceStr,
      latency_ms: Date.now() - start,
      outcome: 'error',
      err: msg,
    });
    return c.json({ error: 'internal error', detail: msg }, 500);
  }
});

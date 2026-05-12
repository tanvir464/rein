import { Hono } from 'hono';
import {
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import bs58 from 'bs58';

import type { Env } from '../env';
import { rpcFromEnv } from '../solana/rpc';
import { logLine } from '../log';

/**
 * Devnet test-USDC faucet. Drops a fixed amount to the recipient's USDC ATA,
 * creating the ATA if it doesn't exist. Idempotency-by-rate-limit: a single
 * recipient can only faucet once every 60s (KV-tracked). Returns 429 otherwise.
 *
 * Disabled in production — `MINT_AUTHORITY_KEYPAIR_BASE58` should never be set
 * there. The endpoint also rejects on mainnet for safety.
 */

const FAUCET_AMOUNT_USDC_UI = 50;
const RATE_LIMIT_SECS = 60;
const KV_PREFIX = 'faucet:cooldown:';

function tryPubkey(s: string | undefined | null): PublicKey | null {
  if (!s) return null;
  try {
    return new PublicKey(s);
  } catch {
    return null;
  }
}

function loadAuthority(secret: string): Keypair | null {
  try {
    const bytes = bs58.decode(secret);
    if (bytes.length !== 64) return null;
    return Keypair.fromSecretKey(bytes);
  } catch {
    return null;
  }
}

export const faucetRouter = new Hono<{ Bindings: Env }>();

faucetRouter.post('/v1/faucet', async (c) => {
  const start = Date.now();
  const env = c.env;

  // ── Guards ──────────────────────────────────────────────────────────
  if (env.SOLANA_CLUSTER === 'mainnet-beta') {
    return c.json({ error: 'faucet disabled on mainnet' }, 403);
  }
  if (!env.USDC_MINT) {
    return c.json(
      { error: 'USDC_MINT not configured', hint: 'set USDC_MINT in wrangler.toml [vars]' },
      503,
    );
  }
  if (!env.MINT_AUTHORITY_KEYPAIR_BASE58) {
    return c.json(
      {
        error: 'faucet disabled (no mint authority configured)',
        hint:
          'wrangler secret put MINT_AUTHORITY_KEYPAIR_BASE58 — use the wallet keypair that ran seed-devnet.ts',
      },
      503,
    );
  }
  if (!env.REIN_KV) {
    return c.json({ error: 'REIN_KV not configured' }, 503);
  }

  // ── Parse body ──────────────────────────────────────────────────────
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'body must be JSON' }, 400);
  }
  const ownerStr: string | undefined = body.owner;
  const owner = tryPubkey(ownerStr);
  if (!owner) {
    return c.json({ error: 'owner is required and must be a valid base58 pubkey' }, 400);
  }

  // ── Rate-limit (per owner pubkey) ───────────────────────────────────
  const cooldownKey = `${KV_PREFIX}${owner.toBase58()}`;
  const cooldown = await env.REIN_KV.get(cooldownKey);
  if (cooldown) {
    return c.json({ error: 'rate-limited', retryAfterSecs: RATE_LIMIT_SECS }, 429);
  }

  // ── Build + sign + submit mintTo ────────────────────────────────────
  const authority = loadAuthority(env.MINT_AUTHORITY_KEYPAIR_BASE58);
  if (!authority) {
    return c.json({ error: 'MINT_AUTHORITY_KEYPAIR_BASE58 is malformed' }, 500);
  }

  const mint = tryPubkey(env.USDC_MINT)!;
  const ownerAta = getAssociatedTokenAddressSync(mint, owner);
  const conn = rpcFromEnv(env);

  try {
    const ataInfo = await conn.getAccountInfo(ownerAta);
    const tx = new Transaction();

    if (!ataInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          authority.publicKey, // payer (we cover ATA rent so onboarding doesn't need extra SOL)
          ownerAta,
          owner,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
    }

    tx.add(
      createMintToInstruction(
        mint,
        ownerAta,
        authority.publicKey,
        BigInt(FAUCET_AMOUNT_USDC_UI * 1_000_000),
      ),
    );

    const { blockhash } = await conn.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = authority.publicKey;
    tx.sign(authority);
    const rawTx = tx.serialize();

    // First send WITH preflight — surfaces sim errors (wrong authority,
    // insufficient SOL, etc.) instead of letting them silently disappear.
    // Re-sends inside the poll loop skip preflight (the cluster has already
    // validated this exact signature).
    const signature = await conn.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 0,
    });
    logLine({
      route: 'POST /v1/faucet',
      owner: owner.toBase58(),
      sig: signature,
      stage: 'sent',
      latency_ms: Date.now() - start,
      outcome: 'progress',
    });

    // Deterministic poll-and-rebroadcast: every 1.5s, check if the signature
    // landed; if not, re-broadcast. Same signature → cluster dedupes.
    const POLL_INTERVAL_MS = 1500;
    const TIMEOUT_MS = 45_000;
    const pollStart = Date.now();
    let attempts = 0;
    let landed = false;
    while (Date.now() - pollStart < TIMEOUT_MS) {
      const status = await conn.getSignatureStatus(signature, {
        searchTransactionHistory: false,
      });
      const conf = status.value?.confirmationStatus;
      if (conf === 'confirmed' || conf === 'finalized') {
        if (status.value?.err) {
          throw new Error(`tx landed with error: ${JSON.stringify(status.value.err)}`);
        }
        landed = true;
        break;
      }
      attempts += 1;
      try {
        await conn.sendRawTransaction(rawTx, { skipPreflight: true, maxRetries: 0 });
      } catch {
        // already landed or pre-empted; let the next poll resolve
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    if (!landed) {
      throw new Error(
        `tx not confirmed after ${attempts} re-broadcasts in ${TIMEOUT_MS}ms — devnet RPC dropped it`,
      );
    }

    // Set cooldown only on success — failed attempts don't burn the user's quota.
    await env.REIN_KV.put(cooldownKey, '1', { expirationTtl: RATE_LIMIT_SECS });

    logLine({
      route: 'POST /v1/faucet',
      owner: owner.toBase58(),
      ata: ownerAta.toBase58(),
      amount: FAUCET_AMOUNT_USDC_UI,
      sig: signature,
      latency_ms: Date.now() - start,
      outcome: 'ok',
    });

    return c.json(
      {
        ok: true,
        signature,
        ownerUsdcAta: ownerAta.toBase58(),
        amount: String(FAUCET_AMOUNT_USDC_UI * 1_000_000), // micro-USDC string for BigInt safety
        amountUi: FAUCET_AMOUNT_USDC_UI,
        mint: mint.toBase58(),
      },
      200,
    );
  } catch (e: any) {
    const msg: string = e?.message ?? String(e);
    logLine({
      route: 'POST /v1/faucet',
      owner: owner.toBase58(),
      latency_ms: Date.now() - start,
      outcome: 'error',
      err: msg,
    });
    return c.json({ error: 'faucet failed', detail: msg }, 500);
  }
});

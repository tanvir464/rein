import { Hono } from 'hono';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import BN from 'bn.js';

import {
  derivePolicyPda,
  deriveCounterPda,
  deriveStepUpPda,
} from '@rein/sdk';
import type { Env } from '../env';
import { flags } from '../env';
import { programFromEnv, rpcFromEnv } from '../solana/rpc';
import { logLine } from '../log';
import { fetchHistoricalPrice, KNOWN_MINTS, GoldRushError } from '../goldrush/client';
import { getOrFetch, priceKey, PRICE_TTL } from '../goldrush/cache';
import { detect as detectAnomalies, type SpendInput, type Anomaly } from '../goldrush/anomaly';

// ─── Response shapes (mirror apps/web/lib/mock-data.ts so the frontend
//     can swap mocks for these without changing component code). ─────────

export type VaultJson = {
  id: string;            // vault pubkey, base58
  pubkey: string;        // alias of id
  owner: string;
  usdcMint: string;
  name: string;          // synthetic ("Vault " + first 4 chars of pubkey)
  balanceUsdc: number;   // from vault USDC ATA, ui units
  balanceSol: number;    // from vault account lamports
  spend24h: number;      // from DailyCounter for today, ui units
  cap24h: number;        // from Policy.dailyCap, ui units
  status: 'active' | 'paused' | 'expired';
  policyVersion: number;
  spark: number[];       // last N receipts by amount (ui units), oldest first
  createdAt: string;     // ISO
};

export type ReceiptJson = {
  nonce: string;
  vaultId: string;
  recipient: string;
  recipientLabel?: string;
  amountUsdc: number;
  taskId: string;
  txSig: string;
  status: 'settled' | 'pending' | 'disputed' | 'blocked';
  createdAt: string;
  endpoint?: string;
  runtime?: 'mcp' | 'langchain' | 'openai' | 'vercel-ai' | 'python' | 'cli';
};

export type PolicyJson = {
  vaultId: string;
  version: number;
  dailyCapUsdc: number;
  perTxCapUsdc: number;
  stepUpThresholdUsdc: number;
  allowlist: string[];
  blocklist: string[];
  expiresAt?: string;
  pausedAt?: string;
};

export type StepUpJson = {
  id: string;
  vaultId: string;
  recipient: string;
  recipientLabel?: string;
  amountUsdc: number;
  taskId: string;
  reason: string;
  expiresAt: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
};

export type InsightsJson = {
  totalSpend7d: number;
  totalSpendPrev7d: number;
  txCount7d: number;
  txCountPrev7d: number;
  avgCostPerTask: number;
  topRecipients: { label: string; usdc: number; share: number; amountUsd?: number }[];
  anomalies: { id: string; label: string; detail: string; severity: 'info' | 'warning' | 'critical'; at: string }[];
  // GoldRush-derived USD fields (additive — present only when goldrush flag enabled).
  totalUsd?: number;
  prevWeekTotalUsd?: number;
  wowDeltaUsd?: number;
  wowDeltaPct?: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────

const MICRO = 1_000_000;

function microToUi(amount: BN | bigint | number): number {
  const n = typeof amount === 'number' ? amount : Number(amount.toString());
  return Math.round((n / MICRO) * 100) / 100;
}

function tryPubkey(s: string | undefined | null): PublicKey | null {
  if (!s) return null;
  try {
    return new PublicKey(s);
  } catch {
    return null;
  }
}

function shortName(pk: string): string {
  return `Vault ${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

function dayFromTs(unixSecs: number): BN {
  return new BN(Math.floor(unixSecs / 86_400));
}

// ─── Router ──────────────────────────────────────────────────────────────

export const dataRouter = new Hono<{ Bindings: Env }>();

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/vaults?owner=<pubkey>
//   Lists vaults. If owner is provided, filters to vaults owned by that key.
//   Otherwise returns ALL vaults via getProgramAccounts (use sparingly).
//   Public endpoint — vault state is on-chain and public anyway.
// ─────────────────────────────────────────────────────────────────────────
dataRouter.get('/v1/vaults', async (c) => {
  const start = Date.now();
  const env = c.env;
  const ownerStr = c.req.query('owner');

  let ownerFilter: PublicKey | null = null;
  if (ownerStr) {
    ownerFilter = tryPubkey(ownerStr);
    if (!ownerFilter) {
      return c.json({ error: 'owner is not a valid base58 pubkey' }, 400);
    }
  }

  const program = programFromEnv(env);
  const conn = rpcFromEnv(env);

  try {
    // Anchor's `.all()` filters by account discriminator and optional memcmp.
    // The Vault struct starts with `owner: pubkey` at offset 8 (after discriminator).
    const filters = ownerFilter
      ? [{ memcmp: { offset: 8, bytes: ownerFilter.toBase58() } }]
      : [];
    const accounts = await program.account.vault.all(filters);

    const today = dayFromTs(Math.floor(Date.now() / 1000));

    const vaults: VaultJson[] = await Promise.all(
      accounts.map(async (acc) => {
        const vaultPk = acc.publicKey;
        const vaultPkStr = vaultPk.toBase58();
        const a: any = acc.account;

        // Derive policy + counter PDAs and fetch in parallel.
        const [policyPda] = derivePolicyPda(vaultPk, program.programId);
        const [counterPda] = deriveCounterPda(vaultPk, today, program.programId);

        // Vault USDC ATA — vault PDA is off-curve, so allowOwnerOffCurve=true.
        // Returns 0 when the ATA hasn't been created yet (deposit not run).
        const vaultUsdcAta = getAssociatedTokenAddressSync(
          a.usdcMint as PublicKey,
          vaultPk,
          true,
        );

        const [policyRes, counterRes, lamportsRes, balanceRes] = await Promise.allSettled([
          program.account.policy.fetch(policyPda),
          program.account.dailyCounter.fetch(counterPda),
          conn.getBalance(vaultPk),
          conn.getTokenAccountBalance(vaultUsdcAta),
        ]);

        const policy = policyRes.status === 'fulfilled' ? (policyRes.value as any) : null;
        const counter = counterRes.status === 'fulfilled' ? (counterRes.value as any) : null;
        const lamports = lamportsRes.status === 'fulfilled' ? lamportsRes.value : 0;
        const balanceUsdc =
          balanceRes.status === 'fulfilled'
            ? microToUi(BigInt(balanceRes.value.value.amount))
            : 0;

        const cap24h = policy ? microToUi(policy.dailyCap as BN) : 0;
        const spend24h = counter ? microToUi(counter.spent as BN) : 0;
        const policyVersion = policy ? Number(policy.version) : 0;

        let status: VaultJson['status'] = 'active';
        if (policy?.paused) {
          status = 'paused';
        } else if (policy?.expiryTs && (policy.expiryTs as BN).toNumber() > 0
          && (policy.expiryTs as BN).toNumber() < Math.floor(Date.now() / 1000)) {
          status = 'expired';
        }

        const createdAt = a.createdAt
          ? new Date((a.createdAt as BN).toNumber() * 1000).toISOString()
          : new Date(0).toISOString();

        return {
          id: vaultPkStr,
          pubkey: vaultPkStr,
          owner: (a.owner as PublicKey).toBase58(),
          usdcMint: (a.usdcMint as PublicKey).toBase58(),
          name: shortName(vaultPkStr),
          balanceUsdc,
          balanceSol: lamports / 1_000_000_000,
          spend24h,
          cap24h,
          status,
          policyVersion,
          spark: [],
          createdAt,
        };
      }),
    );

    logLine({
      route: 'GET /v1/vaults',
      owner: ownerStr ?? 'all',
      count: vaults.length,
      latency_ms: Date.now() - start,
      outcome: 'ok',
    });
    return c.json(vaults, 200);
  } catch (e: any) {
    const msg: string = e?.message ?? String(e);
    logLine({ route: 'GET /v1/vaults', outcome: 'error', err: msg });
    return c.json({ error: 'failed to list vaults', detail: msg }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/policies/:vault
//   Fetches the Policy account for a vault. Returns 404 if not initialized.
// ─────────────────────────────────────────────────────────────────────────
dataRouter.get('/v1/policies/:vault', async (c) => {
  const env = c.env;
  const vaultStr = c.req.param('vault');
  const vault = tryPubkey(vaultStr);
  if (!vault) return c.json({ error: 'vault is not a valid base58 pubkey' }, 400);

  const program = programFromEnv(env);
  const [policyPda] = derivePolicyPda(vault, program.programId);

  try {
    const p: any = await program.account.policy.fetch(policyPda);
    const allowlistLen = Number(p.allowlistLen ?? 0);
    const allowlistArr: PublicKey[] = (p.allowlist as PublicKey[]) ?? [];
    const allowlist = allowlistArr
      .slice(0, allowlistLen)
      .map((k) => k.toBase58());

    const expiryTs = (p.expiryTs as BN).toNumber();
    const result: PolicyJson = {
      vaultId: vaultStr,
      version: Number(p.version),
      dailyCapUsdc: microToUi(p.dailyCap as BN),
      perTxCapUsdc: microToUi(p.perTxCap as BN),
      stepUpThresholdUsdc: microToUi(p.stepUpThreshold as BN),
      allowlist,
      blocklist: [], // separate Blocklist account; could fetch but rarely populated
      expiresAt: expiryTs > 0 ? new Date(expiryTs * 1000).toISOString() : undefined,
      pausedAt: p.paused ? new Date((p.updatedAt as BN).toNumber() * 1000).toISOString() : undefined,
    };
    return c.json(result, 200);
  } catch (e: any) {
    const msg: string = e?.message ?? String(e);
    if (/Account does not exist|could not find/.test(msg)) {
      return c.json({ error: 'policy not found for vault' }, 404);
    }
    return c.json({ error: 'failed to fetch policy', detail: msg }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/receipts?vault=<pubkey>&limit=<n>
//   Lists receipts for a vault, newest first. Filters via memcmp on the
//   `vault` field at offset 8 in SpendReceipt.
// ─────────────────────────────────────────────────────────────────────────
dataRouter.get('/v1/receipts', async (c) => {
  const start = Date.now();
  const env = c.env;
  const vaultStr = c.req.query('vault');
  const limitStr = c.req.query('limit') ?? '50';
  const limit = Math.min(200, Math.max(1, parseInt(limitStr, 10) || 50));

  if (!vaultStr) {
    return c.json({ error: 'missing required query param: vault' }, 400);
  }
  const vault = tryPubkey(vaultStr);
  if (!vault) {
    return c.json({ error: 'vault is not a valid base58 pubkey' }, 400);
  }

  const program = programFromEnv(env);

  try {
    const accounts = await program.account.spendReceipt.all([
      { memcmp: { offset: 8, bytes: vault.toBase58() } },
    ]);

    const receipts: ReceiptJson[] = accounts
      .map((acc) => {
        const a: any = acc.account;
        const ts = (a.ts as BN).toNumber();
        const nonce = (a.nonce as BN).toString();
        return {
          nonce,
          vaultId: vaultStr,
          recipient: (a.recipient as PublicKey).toBase58(),
          recipientLabel: undefined,
          amountUsdc: microToUi(a.amount as BN),
          taskId: `task_${nonce}`,
          txSig: '',
          status: (a.disputed as boolean) ? 'disputed' : 'settled',
          createdAt: new Date(ts * 1000).toISOString(),
          endpoint: undefined,
          runtime: undefined,
          _ts: ts,
        } as ReceiptJson & { _ts: number };
      })
      .sort((a, b) => b._ts - a._ts)
      .slice(0, limit)
      .map(({ _ts, ...rest }) => rest);

    logLine({
      route: 'GET /v1/receipts',
      vault: vaultStr,
      count: receipts.length,
      latency_ms: Date.now() - start,
      outcome: 'ok',
    });
    return c.json(receipts, 200);
  } catch (e: any) {
    const msg: string = e?.message ?? String(e);
    logLine({ route: 'GET /v1/receipts', vault: vaultStr, outcome: 'error', err: msg });
    return c.json({ error: 'failed to list receipts', detail: msg }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/step-ups?vault=<pubkey>
//   Lists step-up requests for a vault. Each StepUpRequest is a separate
//   PDA per nonce; filter via memcmp on `vault` field.
// ─────────────────────────────────────────────────────────────────────────
dataRouter.get('/v1/step-ups', async (c) => {
  const env = c.env;
  const vaultStr = c.req.query('vault');
  if (!vaultStr) return c.json({ error: 'missing required query param: vault' }, 400);
  const vault = tryPubkey(vaultStr);
  if (!vault) return c.json({ error: 'vault is not a valid base58 pubkey' }, 400);

  const program = programFromEnv(env);

  try {
    const accounts = await program.account.stepUpRequest.all([
      { memcmp: { offset: 8, bytes: vault.toBase58() } },
    ]);

    const now = Math.floor(Date.now() / 1000);
    const stepUps: StepUpJson[] = accounts.map((acc) => {
      const a: any = acc.account;
      const expiresAt = (a.expiresAt as BN).toNumber();
      const createdAt = (a.createdAt as BN).toNumber();
      const nonce = (a.nonce as BN).toString();

      let status: StepUpJson['status'] = 'pending';
      if (a.approved) status = 'approved';
      else if (expiresAt > 0 && expiresAt < now) status = 'expired';

      return {
        id: acc.publicKey.toBase58(),
        vaultId: vaultStr,
        recipient: (a.recipient as PublicKey).toBase58(),
        recipientLabel: undefined,
        amountUsdc: microToUi(a.amount as BN),
        taskId: `task_${nonce}`,
        reason: 'over policy threshold',
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        createdAt: new Date(createdAt * 1000).toISOString(),
        status,
      };
    });

    return c.json(stepUps, 200);
  } catch (e: any) {
    const msg: string = e?.message ?? String(e);
    return c.json({ error: 'failed to list step-ups', detail: msg }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/insights?vault=<pubkey>
//   Aggregates last 14 days of receipts into 7d / prev-7d totals + top
//   recipients. Anomalies are intentionally empty (real anomaly detection
//   would warrant its own pipeline).
// ─────────────────────────────────────────────────────────────────────────
dataRouter.get('/v1/insights', async (c) => {
  const env = c.env;
  const vaultStr = c.req.query('vault');
  if (!vaultStr) return c.json({ error: 'missing required query param: vault' }, 400);
  const vault = tryPubkey(vaultStr);
  if (!vault) return c.json({ error: 'vault is not a valid base58 pubkey' }, 400);

  const program = programFromEnv(env);

  try {
    const accounts = await program.account.spendReceipt.all([
      { memcmp: { offset: 8, bytes: vault.toBase58() } },
    ]);

    const now = Math.floor(Date.now() / 1000);
    const D7 = 7 * 86_400;
    const D14 = 14 * 86_400;

    let total7 = 0;
    let totalPrev7 = 0;
    let count7 = 0;
    let countPrev7 = 0;
    const byRecipient = new Map<string, number>();

    // Decoded receipts kept around for USD enrichment + anomaly detection.
    interface DecodedReceipt {
      nonce: string;
      recipient: string;
      amount: number;        // ui units (treated as USDC-equivalent — REIN's USDC test mint maps 1:1 USD)
      ts: number;
      policyVersion: number;
    }
    const decoded: DecodedReceipt[] = [];

    for (const acc of accounts) {
      const a: any = acc.account;
      const ts = (a.ts as BN).toNumber();
      const usd = microToUi(a.amount as BN);
      const recipient = (a.recipient as PublicKey).toBase58();
      decoded.push({
        nonce: (a.nonce as BN).toString(),
        recipient,
        amount: usd,
        ts,
        policyVersion: Number(a.policyVersion ?? 0),
      });

      if (ts >= now - D7) {
        total7 += usd;
        count7 += 1;
        byRecipient.set(recipient, (byRecipient.get(recipient) ?? 0) + usd);
      } else if (ts >= now - D14) {
        totalPrev7 += usd;
        countPrev7 += 1;
      }
    }

    const sortedRecipients = [...byRecipient.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topShare = total7 > 0 ? total7 : 1;

    // ─── GoldRush USD enrichment (best-effort; flag-gated) ───
    const goldrushOn = flags(env).goldrush;
    const usdcMint = KNOWN_MINTS.USDC;

    // Map<YYYY-MM-DD, price USD> for USDC. USDC ≈ $1 so we use it as the
    // base; if GoldRush returns ~1.0 we trust it, else we fall back to 1.
    async function priceAt(dateIso: string): Promise<number> {
      if (!goldrushOn) return 1;
      try {
        const r = await getOrFetch(
          env.REIN_KV,
          priceKey(usdcMint, dateIso),
          PRICE_TTL,
          () => fetchHistoricalPrice(usdcMint, dateIso, env.GOLDRUSH_API_KEY),
        );
        const p = r.value;
        return typeof p === 'number' && p > 0 ? p : 1;
      } catch (e) {
        if (!(e instanceof GoldRushError)) throw e;
        return 1; // graceful fallback — never break insights on upstream hiccup
      }
    }

    function dateOf(ts: number): string {
      return new Date(ts * 1000).toISOString().slice(0, 10);
    }

    // Build a price cache for each unique receipt-day we need.
    const priceByDate = new Map<string, number>();
    const uniqueDates = Array.from(new Set(decoded.map((d) => dateOf(d.ts))));
    if (goldrushOn) {
      await Promise.all(
        uniqueDates.map(async (d) => {
          priceByDate.set(d, await priceAt(d));
        }),
      );
    }
    const usdFor = (amount: number, ts: number): number =>
      amount * (priceByDate.get(dateOf(ts)) ?? 1);

    const usdByRecipient = new Map<string, number>();
    let totalUsd = 0;
    let prevTotalUsd = 0;
    for (const r of decoded) {
      const u = usdFor(r.amount, r.ts);
      if (r.ts >= now - D7) {
        totalUsd += u;
        usdByRecipient.set(r.recipient, (usdByRecipient.get(r.recipient) ?? 0) + u);
      } else if (r.ts >= now - D14) {
        prevTotalUsd += u;
      }
    }
    totalUsd = Math.round(totalUsd * 100) / 100;
    prevTotalUsd = Math.round(prevTotalUsd * 100) / 100;
    const wowDeltaUsd = Math.round((totalUsd - prevTotalUsd) * 100) / 100;
    const wowDeltaPct =
      prevTotalUsd > 0 ? Math.round(((totalUsd / prevTotalUsd - 1) * 100) * 100) / 100 : 0;

    const topRecipients = sortedRecipients.map(([recipient, usdc]) => ({
      label: `${recipient.slice(0, 6)}…${recipient.slice(-4)}`,
      usdc: Math.round(usdc * 100) / 100,
      share: Math.round((usdc / topShare) * 100) / 100,
      amountUsd: Math.round((usdByRecipient.get(recipient) ?? usdc) * 100) / 100,
    }));

    // ─── Anomaly detection (pure function over decoded receipts) ───
    const spendInputs: SpendInput[] = decoded.map((d) => ({
      nonce: d.nonce,
      vault: vaultStr,
      recipient: d.recipient,
      amount: d.amount,
      amountUsd: usdFor(d.amount, d.ts),
      ts: d.ts,
      policyVersion: d.policyVersion,
    }));
    const rawAnomalies: Anomaly[] = detectAnomalies(spendInputs, { now });
    const anomalies = rawAnomalies.map((a) => ({
      id: `${a.type}:${a.nonce}`,
      label:
        a.type === 'new_recipient'
          ? `New recipient: ${a.recipient.slice(0, 6)}…${a.recipient.slice(-4)}`
          : `Outlier amount: $${a.amountUsd.toFixed(2)}`,
      detail: a.detail,
      severity: (a.severity === 'alert' ? 'critical' : 'warning') as 'info' | 'warning' | 'critical',
      at: new Date(a.ts * 1000).toISOString(),
    }));

    const result: InsightsJson = {
      totalSpend7d: Math.round(total7 * 100) / 100,
      totalSpendPrev7d: Math.round(totalPrev7 * 100) / 100,
      txCount7d: count7,
      txCountPrev7d: countPrev7,
      avgCostPerTask: count7 > 0 ? Math.round((total7 / count7) * 100) / 100 : 0,
      topRecipients,
      anomalies,
      ...(goldrushOn
        ? {
            totalUsd,
            prevWeekTotalUsd: prevTotalUsd,
            wowDeltaUsd,
            wowDeltaPct,
          }
        : {}),
    };

    return c.json(result, 200);
  } catch (e: any) {
    const msg: string = e?.message ?? String(e);
    return c.json({ error: 'failed to compute insights', detail: msg }, 500);
  }
});

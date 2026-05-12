/**
 * Typed client for the REIN Worker API.
 *
 * Read endpoints (vaults/policies/receipts/step-ups/insights) are public —
 * no auth header needed. Write endpoints (spend, etc.) and the WebSocket
 * activity feed require a JWT issued via POST /v1/auth/issue.
 *
 * Configure with NEXT_PUBLIC_API_URL; defaults to local wrangler dev.
 */

import type { Vault, Receipt, Policy, StepUp } from './types';
export type { Vault, VaultStatus, Receipt, Policy, StepUp } from './types';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:8787';

export type Insights = {
  totalSpend7d: number;
  totalSpendPrev7d: number;
  txCount7d: number;
  txCountPrev7d: number;
  avgCostPerTask: number;
  topRecipients: { label: string; usdc: number; share: number; amountUsd?: number }[];
  anomalies: {
    id: string;
    label: string;
    detail: string;
    severity: 'info' | 'warning' | 'critical';
    at: string;
  }[];
  // F74 augmentations (additive)
  totalUsd?: number;
  prevWeekTotalUsd?: number;
  wowDeltaUsd?: number;
  wowDeltaPct?: number;
};

// ─── F73 Reputation profile ──────────────────────────────────────────────

export type RecipientRating = 'known' | 'active' | 'new' | 'unknown';

export type RecipientProfile = {
  address: string;
  knownName: string | null;
  firstSeenTs: number | null;
  totalVolumeUsd: number;
  topHoldings: { symbol: string; name: string; usdValue: number; logoUrl: string | null }[];
  rating: RecipientRating;
  fetchedAt: number;
};

export function getRecipientProfile(
  address: string,
  opts?: FetchOpts,
): Promise<RecipientProfile | null> {
  return safeOne<RecipientProfile>(
    `/v1/recipients/${encodeURIComponent(address)}/profile`,
    { revalidate: 600, ...opts },
  );
}

// ─── F72 Private receipts ────────────────────────────────────────────────

export type PrivateReceipt = {
  id: string;
  vault: string;
  amount: string;
  ts: number;
  policyVersion: number;
  nonce: string;
  recipientCommit: string; // hex 32
  umbraRef: string;        // hex 32
  confidential: true;
  disputed: boolean;
};

export async function listPrivateReceipts(
  vault: string,
  opts?: FetchOpts,
): Promise<PrivateReceipt[]> {
  try {
    const body = await getJson<{ vault: string; items: PrivateReceipt[] }>(
      `/v1/receipts/private?vault=${encodeURIComponent(vault)}`,
      { revalidate: 5, ...opts },
    );
    return body.items ?? [];
  } catch (err) {
    if (typeof console !== 'undefined' && console.debug)
      console.debug('[api] /v1/receipts/private:', err);
    return [];
  }
}

export type EncryptedMemo = {
  algo: 'aes-256-gcm';
  iv: string;   // base64
  ct: string;   // base64
  tag: string;  // base64
};

export async function getPrivateMemo(
  nonce: string,
  token: string,
  opts?: Omit<FetchOpts, 'token'>,
): Promise<{ ok: true; memo: EncryptedMemo } | { ok: false; error: string }> {
  try {
    const body = await getJson<{ nonce: string; memo: EncryptedMemo }>(
      `/v1/receipts/private/${encodeURIComponent(nonce)}/memo`,
      { ...opts, token },
    );
    return { ok: true, memo: body.memo };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type PrivateSpendInput = {
  recipientPubkey: string;
  mint: string;
  amountBase: string;
  nonce?: string;
  viewKeyPub?: string; // hex; required for owner memo decrypt
};

export type PrivateSpendOk = {
  ok: true;
  nonce: string;
  receiptPda: string;
  umbraSignature: string;
  recordSignature: string;
  recipientCommit: string;
  umbraRef: string;
  amount: string;
  policyVersion: number;
};

export type PrivateSpendErr = {
  ok: false;
  stage: 'load' | 'simulate' | 'sidecar' | 'build' | 'sign' | 'submit' | 'confirm' | 'config';
  reason: string;
  details?: string;
};

export function postSpendPrivate(
  input: PrivateSpendInput,
  token: string,
  opts?: Omit<FetchOpts, 'token'>,
): Promise<PrivateSpendOk | PrivateSpendErr> {
  return postJson<PrivateSpendOk | PrivateSpendErr>('/v1/spend/private', input, {
    ...opts,
    token,
  });
}

type FetchOpts = { signal?: AbortSignal; revalidate?: number; token?: string };

function authHeaders(token?: string): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function getJson<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    signal: opts.signal,
    headers: { accept: 'application/json', ...authHeaders(opts.token) },
    next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET ${path} → ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }
  return (await res.json()) as T;
}

async function postJson<T>(path: string, body: unknown, opts: FetchOpts = {}): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    signal: opts.signal,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...authHeaders(opts.token),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`POST ${path} → ${res.status}${text ? `: ${text.slice(0, 300)}` : ''}`);
  }
  return (await res.json()) as T;
}

/** Returns [] on transport/RPC failure so pages render an empty state instead of crashing.
 *  Logs at debug level — these are *expected* fallbacks when a vault has no policy yet,
 *  the service is offline, etc. They're not errors the user needs to see in the console. */
async function safeList<T>(path: string, opts?: FetchOpts): Promise<T[]> {
  try {
    return await getJson<T[]>(path, opts);
  } catch (err) {
    if (typeof console !== 'undefined' && console.debug) console.debug(`[api] ${path}:`, err);
    return [];
  }
}

/** Returns null on transport/RPC failure or 404. */
async function safeOne<T>(path: string, opts?: FetchOpts): Promise<T | null> {
  try {
    return await getJson<T>(path, opts);
  } catch (err) {
    if (typeof console !== 'undefined' && console.debug) console.debug(`[api] ${path}:`, err);
    return null;
  }
}

// ─── Read endpoints (public, no auth) ────────────────────────────────────

export function listVaults(owner?: string, opts?: FetchOpts): Promise<Vault[]> {
  const q = owner ? `?owner=${encodeURIComponent(owner)}` : '';
  // No fetch cache: balance/spend24h/status update on every on-chain tx, so a
  // 15s stale window confuses users who just funded or spent. Dashboard polls
  // every 30s on its own; server-component pages get fresh data every render.
  return safeList<Vault>(`/v1/vaults${q}`, { revalidate: 0, ...opts });
}

export function getPolicy(vaultId: string, opts?: FetchOpts): Promise<Policy | null> {
  return safeOne<Policy>(`/v1/policies/${encodeURIComponent(vaultId)}`, {
    revalidate: 30,
    ...opts,
  });
}

export function listReceipts(
  vaultId: string,
  limit = 50,
  opts?: FetchOpts,
): Promise<Receipt[]> {
  const q = `?vault=${encodeURIComponent(vaultId)}&limit=${limit}`;
  return safeList<Receipt>(`/v1/receipts${q}`, { revalidate: 5, ...opts });
}

export function listStepUps(vaultId: string, opts?: FetchOpts): Promise<StepUp[]> {
  const q = `?vault=${encodeURIComponent(vaultId)}`;
  return safeList<StepUp>(`/v1/step-ups${q}`, { revalidate: 5, ...opts });
}

export function getInsights(vaultId: string, opts?: FetchOpts): Promise<Insights | null> {
  const q = `?vault=${encodeURIComponent(vaultId)}`;
  return safeOne<Insights>(`/v1/insights${q}`, { revalidate: 30, ...opts });
}

// ─── Cross-vault aggregations ────────────────────────────────────────────

export async function listReceiptsForVaults(
  vaultIds: string[],
  perVaultLimit = 20,
  opts?: FetchOpts,
): Promise<Receipt[]> {
  const all = await Promise.all(vaultIds.map((id) => listReceipts(id, perVaultLimit, opts)));
  return all.flat();
}

export async function listStepUpsForVaults(
  vaultIds: string[],
  opts?: FetchOpts,
): Promise<StepUp[]> {
  const all = await Promise.all(vaultIds.map((id) => listStepUps(id, opts)));
  return all.flat();
}

// ─── Config + faucet (onboarding) ────────────────────────────────────────

export type Config = {
  cluster: 'devnet' | 'mainnet-beta' | 'localnet';
  programId: string;
  usdcMint: string | null;
  rpcUrl: string;
  faucetEnabled: boolean;
};

export function getConfig(opts?: FetchOpts): Promise<Config | null> {
  return safeOne<Config>('/v1/config', { revalidate: 60, ...opts });
}

export type FaucetResult = {
  ok: true;
  signature: string;
  ownerUsdcAta: string;
  amount: string;     // micro-USDC string
  amountUi: number;
  mint: string;
};

export type FaucetError = {
  error: string;
  hint?: string;
  retryAfterSecs?: number;
};

/** POST /v1/faucet — drops devnet test USDC into the caller's owner ATA. */
export async function postFaucet(
  owner: string,
  opts?: FetchOpts,
): Promise<FaucetResult | FaucetError> {
  const url = `${API_URL}/v1/faucet`;
  const res = await fetch(url, {
    method: 'POST',
    signal: opts?.signal,
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ owner }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      error: typeof body.error === 'string' ? body.error : `faucet failed (${res.status})`,
      hint: typeof body.hint === 'string' ? body.hint : undefined,
      retryAfterSecs:
        typeof body.retryAfterSecs === 'number' ? body.retryAfterSecs : undefined,
    };
  }
  return body as unknown as FaucetResult;
}

// ─── Write endpoints (require JWT) ───────────────────────────────────────

export type SpendInput = {
  /** Recipient USDC token account, base58. */
  recipient: string;
  /** Amount in micro-USDC, as a string to avoid BigInt JSON issues. */
  amount: string;
  /** Optional caller-supplied nonce; service generates one if omitted. */
  nonce?: string;
};

export type SpendOk = {
  ok: true;
  signature: string;
  receiptPda: string;
  amount: string;
  recipient: string;
  policyVersion: number;
};

export type SpendErr = {
  ok: false;
  stage: 'load' | 'simulate' | 'build' | 'sign' | 'submit' | 'confirm';
  reason: string;
  details?: string;
};

/** POST /v1/spend — requires JWT with `spend` scope. */
export function postSpend(
  input: SpendInput,
  token: string,
  opts?: Omit<FetchOpts, 'token'>,
): Promise<SpendOk | SpendErr> {
  return postJson<SpendOk | SpendErr>('/v1/spend', input, { ...opts, token });
}

/** Builds a `wss://…/v1/activity?vault=…&token=…&since=…` URL. */
export function buildActivityWsUrl(vault: string, token: string, since?: number): string {
  const base = API_URL.replace(/^http/, 'ws');
  const u = new URL(`${base}/v1/activity`);
  u.searchParams.set('vault', vault);
  u.searchParams.set('token', token);
  if (since !== undefined) u.searchParams.set('since', String(since));
  return u.toString();
}

// ─── Notifications (require JWT, scope: read) ────────────────────────────

export type NotificationSubscribers = {
  webhook: { url: string; hasSecret: boolean } | null;
  telegram: { chatId: string } | null;
};

export async function getNotificationSubscribers(
  token: string,
  opts?: Omit<FetchOpts, 'token'>,
): Promise<NotificationSubscribers | null> {
  try {
    return await getJson<NotificationSubscribers>('/v1/notifications/subscribers', {
      ...opts,
      token,
    });
  } catch (err) {
    console.error('[api] /v1/notifications/subscribers:', err);
    return null;
  }
}

async function jsonRequest<T>(
  method: 'PUT' | 'DELETE' | 'POST',
  path: string,
  body: unknown | undefined,
  token: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        accept: 'application/json',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...authHeaders(token),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        error: typeof json.error === 'string' ? json.error : `${method} ${path} → ${res.status}`,
      };
    }
    return { ok: true, data: json as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function putNotificationWebhook(
  body: { url: string; secret?: string },
  token: string,
) {
  return jsonRequest<{ ok: true }>('PUT', '/v1/notifications/webhook', body, token);
}

export function putNotificationTelegram(chatId: string, token: string) {
  return jsonRequest<{ ok: true }>('PUT', '/v1/notifications/telegram', { chatId }, token);
}

export function deleteNotificationChannel(
  channel: 'webhook' | 'telegram',
  token: string,
) {
  return jsonRequest<{ ok: true }>('DELETE', `/v1/notifications/${channel}`, undefined, token);
}

export function postTestNotification(
  type: 'spend.completed' | 'spend.rejected' | 'step_up.requested' | 'step_up.approved',
  token: string,
) {
  return jsonRequest<{
    event: Record<string, unknown>;
    results: Record<string, { ok: boolean; status?: number; error?: string }>;
  }>('POST', '/v1/notifications/test', { type }, token);
}

// ─── Auth revoke ────────────────────────────────────────────────────────

export function postAuthRevoke(token: string) {
  return jsonRequest<{ ok: boolean }>('POST', '/v1/auth/revoke', undefined, token);
}

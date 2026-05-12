/**
 * KV cache wrapper for GoldRush calls. Free tier has limited credits —
 * every outbound call goes through here. Two TTL classes:
 *   - recipient: 24h (profile changes slowly)
 *   - price:      6h (historical prices are immutable once committed)
 *
 * Stale-while-revalidate: if a cached entry is past TTL but still present,
 * the caller may choose to return it immediately and refresh in the
 * background. Here we expose the raw helpers; callers schedule revalidation
 * with `ctx.waitUntil` if they have one.
 */

export const RECIPIENT_TTL = 24 * 3600;
export const PRICE_TTL = 6 * 3600;

const RECIPIENT_PREFIX = 'recipient:';
const PRICE_PREFIX = 'price:';

interface Envelope<T> {
  v: T;
  storedAt: number; // unix seconds
}

async function readEnvelope<T>(
  kv: KVNamespace | undefined,
  key: string,
): Promise<Envelope<T> | null> {
  if (!kv) return null;
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Envelope<T>;
  } catch {
    return null;
  }
}

async function writeEnvelope<T>(
  kv: KVNamespace | undefined,
  key: string,
  value: T,
  ttlSecs: number,
): Promise<void> {
  if (!kv) return;
  const env: Envelope<T> = { v: value, storedAt: Math.floor(Date.now() / 1000) };
  // Set a hard expiration ~2x TTL so SWR has stale data available for a window.
  await kv.put(key, JSON.stringify(env), { expirationTtl: ttlSecs * 2 });
}

export interface CacheResult<T> {
  value: T;
  fresh: boolean;
  storedAt: number;
}

export async function getOrFetch<T>(
  kv: KVNamespace | undefined,
  key: string,
  ttlSecs: number,
  loader: () => Promise<T>,
): Promise<CacheResult<T>> {
  const now = Math.floor(Date.now() / 1000);
  const cached = await readEnvelope<T>(kv, key);
  if (cached && now - cached.storedAt < ttlSecs) {
    return { value: cached.v, fresh: true, storedAt: cached.storedAt };
  }
  // Stale or missing — fetch synchronously. (SWR background-refresh would
  // require a waitUntil handle; callers can layer that on if they have one.)
  try {
    const value = await loader();
    await writeEnvelope(kv, key, value, ttlSecs);
    return { value, fresh: true, storedAt: now };
  } catch (err) {
    if (cached) {
      // Loader failed but we have stale data — serve it rather than 500.
      return { value: cached.v, fresh: false, storedAt: cached.storedAt };
    }
    throw err;
  }
}

export const recipientKey = (address: string) => `${RECIPIENT_PREFIX}${address}`;
export const priceKey = (contract: string, dateIso: string) =>
  `${PRICE_PREFIX}${contract}:${dateIso}`;

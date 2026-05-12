/**
 * Parse the body of an HTTP `402 Payment Required` response into a normalized
 * `Requirement[]`. Supports the dominant facilitators on Solana today:
 *
 *  - Coinbase  — `{ x402Version, accepts: [...] }` shape
 *  - PayAI     — Coinbase-compatible with minor field-naming variance
 *  - Corbits   — partial fixture as of 2026-05; falls through to `unknown`
 *
 * Anything that doesn't match emerges as `facilitator: 'unknown'` so the
 * caller can decide whether to surface or reject.
 */

export type Facilitator = 'coinbase' | 'payai' | 'corbits' | 'unknown';

export type Requirement = {
  facilitator: Facilitator;
  scheme: string;
  network: string;             // 'solana-mainnet' | 'solana-devnet' | 'base-mainnet' | …
  asset: string;               // SPL mint or ERC-20 address
  amount: bigint;              // smallest unit (micro-USDC for SPL USDC, wei for ERC-20)
  recipient: string;           // base58 (Solana) or hex (EVM)
  expiresAt?: Date;
  description?: string;
  /** Original entry — preserved so the encoder can echo any facilitator-specific fields. */
  raw: unknown;
};

type AcceptEntry = Record<string, unknown>;

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function toBigint(v: unknown): bigint | undefined {
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return BigInt(Math.trunc(v));
  if (typeof v === 'string' && /^\d+$/.test(v)) return BigInt(v);
  return undefined;
}

/**
 * Detect the facilitator from a top-level response shape.
 *
 * Heuristics:
 *  - Coinbase emits `{ x402Version, accepts: [{ scheme, network, … }] }`.
 *  - PayAI emits the same envelope but lists `extra.facilitator === 'payai'` or
 *    a known PayAI host in `payTo`.
 *  - Corbits prefixes the asset with `corbits:`.
 */
function detectFacilitator(envelope: unknown, entry: AcceptEntry): Facilitator {
  const env = envelope as Record<string, unknown> | null | undefined;
  const facilitator = (entry?.['extra'] as Record<string, unknown> | undefined)?.['facilitator'];
  if (typeof facilitator === 'string') {
    const f = facilitator.toLowerCase();
    if (f === 'payai') return 'payai';
    if (f === 'corbits') return 'corbits';
    if (f === 'coinbase') return 'coinbase';
  }
  const asset = asString(entry?.['asset']) ?? '';
  if (asset.startsWith('corbits:')) return 'corbits';
  if (env && typeof env['x402Version'] !== 'undefined') return 'coinbase';
  return 'unknown';
}

function parseEntry(envelope: unknown, entry: AcceptEntry): Requirement | null {
  const scheme = asString(entry['scheme']) ?? 'exact';
  const network = asString(entry['network']) ?? '';
  const asset = asString(entry['asset']) ?? '';
  const recipient =
    asString(entry['payTo']) ??
    asString(entry['recipient']) ??
    asString(entry['payee']) ??
    '';
  const amount =
    toBigint(entry['maxAmountRequired']) ??
    toBigint(entry['amount']) ??
    toBigint(entry['amountMicro']);

  if (!network || !asset || !recipient || amount === undefined) {
    return null;
  }

  const expiresAtRaw =
    asString(entry['expiresAt']) ?? asString(entry['expires_at']);
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : undefined;

  return {
    facilitator: detectFacilitator(envelope, entry),
    scheme,
    network,
    asset,
    amount,
    recipient,
    expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : undefined,
    description: asString(entry['description']),
    raw: entry,
  };
}

/**
 * Parse a 402 body into a normalized `Requirement[]`.
 *
 * Returns an empty array when the body has no recognizable accepts list (the
 * caller should surface `ErrPaymentRequirementsInvalid` in that case).
 */
export function parsePaymentRequirements(body: unknown): Requirement[] {
  if (!body || typeof body !== 'object') return [];

  const obj = body as Record<string, unknown>;

  // Coinbase / PayAI / most facilitators: `{ accepts: [...] }`.
  let entries: AcceptEntry[] | null = null;
  if (Array.isArray(obj['accepts'])) {
    entries = obj['accepts'] as AcceptEntry[];
  } else if (Array.isArray(obj['paymentRequirements'])) {
    entries = obj['paymentRequirements'] as AcceptEntry[];
  } else if (Array.isArray(obj['requirements'])) {
    entries = obj['requirements'] as AcceptEntry[];
  }

  if (!entries) return [];
  const out: Requirement[] = [];
  for (const entry of entries) {
    if (entry && typeof entry === 'object') {
      const r = parseEntry(obj, entry);
      if (r) out.push(r);
    }
  }
  return out;
}

/**
 * Pure-function anomaly detector. No I/O — callers supply lookup functions.
 *
 * Definitions (matches specs/sidetracks-architecture.md):
 *   - new_recipient: recipient was first seen < 24h before the spend.
 *     With `firstSeenTs` typed as nullable (GoldRush balances_v2 doesn't
 *     return one), this flag fires when `firstSeenTs != null && spendTs - firstSeenTs < 24h`.
 *   - outlier_amount: amountUsd > mean + 2σ over 30 days for the same recipient.
 *     Mean and σ are computed over all spends to that recipient in the
 *     past 30d (excluding the spend under evaluation). Requires ≥3 prior
 *     spends to that recipient to be meaningful; below that, skipped.
 *
 * Severity:
 *   - alert: > mean + 3σ, or new_recipient + amountUsd > $500
 *   - warn:  otherwise
 */

export interface SpendInput {
  nonce: string;
  vault: string;
  recipient: string;
  amount: number;        // ui units (e.g. USDC)
  amountUsd: number;     // already converted at receipt timestamp
  ts: number;            // unix seconds
  policyVersion: number;
}

export interface Anomaly {
  type: 'new_recipient' | 'outlier_amount';
  severity: 'warn' | 'alert';
  nonce: string;
  recipient: string;
  amountUsd: number;
  ts: number;
  detail: string;
}

export interface RecipientFirstSeenLookup {
  (recipient: string): number | null;
}

export interface AnomalyDetectOptions {
  /** Lookup for recipient first-seen unix-seconds. Null = unknown. */
  firstSeen?: RecipientFirstSeenLookup;
  /** Reference time. Defaults to max(receipts.ts). */
  now?: number;
}

const D30 = 30 * 86400;
const NEW_RECIPIENT_WINDOW = 24 * 3600;

function meanStd(xs: number[]): { mean: number; std: number } {
  if (xs.length === 0) return { mean: 0, std: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance =
    xs.reduce((acc, x) => acc + (x - mean) * (x - mean), 0) / xs.length;
  return { mean, std: Math.sqrt(variance) };
}

export function detect(
  receipts: SpendInput[],
  opts: AnomalyDetectOptions = {},
): Anomaly[] {
  const out: Anomaly[] = [];
  if (receipts.length === 0) return out;

  const firstSeen = opts.firstSeen ?? (() => null);
  const now =
    opts.now ??
    (receipts.reduce((m, r) => Math.max(m, r.ts), 0) || Math.floor(Date.now() / 1000));

  // Pre-bucket by recipient for outlier comparison.
  const byRecipient = new Map<string, SpendInput[]>();
  for (const r of receipts) {
    const list = byRecipient.get(r.recipient) ?? [];
    list.push(r);
    byRecipient.set(r.recipient, list);
  }

  for (const r of receipts) {
    // Outlier check
    const peers = (byRecipient.get(r.recipient) ?? []).filter(
      (p) => p.nonce !== r.nonce && p.ts >= r.ts - D30 && p.ts <= r.ts,
    );
    if (peers.length >= 3) {
      const { mean, std } = meanStd(peers.map((p) => p.amountUsd));
      if (std > 0 && r.amountUsd > mean + 2 * std) {
        const sigmas = (r.amountUsd - mean) / std;
        out.push({
          type: 'outlier_amount',
          severity: sigmas > 3 ? 'alert' : 'warn',
          nonce: r.nonce,
          recipient: r.recipient,
          amountUsd: r.amountUsd,
          ts: r.ts,
          detail: `$${r.amountUsd.toFixed(2)} is ${sigmas.toFixed(1)}σ above 30d mean ($${mean.toFixed(2)}) for this recipient`,
        });
      }
    }

    // New-recipient check
    const seen = firstSeen(r.recipient);
    if (seen !== null && r.ts - seen < NEW_RECIPIENT_WINDOW && r.ts >= seen) {
      out.push({
        type: 'new_recipient',
        severity: r.amountUsd > 500 ? 'alert' : 'warn',
        nonce: r.nonce,
        recipient: r.recipient,
        amountUsd: r.amountUsd,
        ts: r.ts,
        detail: `Recipient first seen ${Math.round((r.ts - seen) / 3600)}h before this spend`,
      });
    }
  }

  // Suppress `now` lint when callers don't pass `firstSeen`.
  void now;
  return out;
}

import type { Requirement } from './parser';

/**
 * USDC SPL mint (devnet + mainnet). Used as the default asset filter.
 * Mainnet USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
 * Devnet USDC:  `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
 */
export const SUPPORTED_USDC_MINTS = new Set<string>([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
]);

export const SUPPORTED_NETWORKS = new Set<string>([
  'solana-mainnet',
  'solana-devnet',
  'solana',
]);

export type SelectFilter = {
  /** Caller's max-spend in micro-USDC. Required. */
  maxAmount: bigint;
  /** Optional allowlist of recipient ATAs (base58). Empty/absent = wildcard. */
  allowlist?: string[];
  /** Optional override of the supported networks set (defaults to Solana only). */
  networks?: Set<string>;
  /** Optional override of accepted SPL mints (defaults to mainnet+devnet USDC). */
  assets?: Set<string>;
};

/**
 * Per F16 §7.2: filter to (Solana, USDC, ≤ maxAmount, allowlisted), then pick
 * the cheapest. Returns `null` when the filter pipeline empties.
 */
export function selectAcceptable(
  requirements: Requirement[],
  filter: SelectFilter,
): Requirement | null {
  const networks = filter.networks ?? SUPPORTED_NETWORKS;
  const assets = filter.assets ?? SUPPORTED_USDC_MINTS;
  const allowSet =
    filter.allowlist && filter.allowlist.length > 0
      ? new Set(filter.allowlist)
      : null;

  const candidates = requirements
    .filter((r) => networks.has(r.network))
    .filter((r) => assets.has(r.asset))
    .filter((r) => r.amount <= filter.maxAmount)
    .filter((r) => (allowSet ? allowSet.has(r.recipient) : true))
    .filter((r) => !r.expiresAt || r.expiresAt.getTime() > Date.now())
    .sort((a, b) => (a.amount < b.amount ? -1 : a.amount > b.amount ? 1 : 0));

  return candidates[0] ?? null;
}

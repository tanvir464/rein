/**
 * Parses 402 Payment Required JSON bodies from x402-spec endpoints.
 * Coinbase's facilitator format is the v1 default; PayAI / Corbits / others
 * fall through to a normalized shape (we still try to extract amount + recipient).
 *
 * x402 spec:
 *   {
 *     x402Version: 1,
 *     accepts: [{ scheme, network, maxAmountRequired, asset, payTo, ... }, ...],
 *     ...
 *   }
 */

export type Facilitator = 'coinbase' | 'payai' | 'corbits' | 'unknown';
export type SupportedNetwork = 'solana' | 'solana-mainnet' | 'solana-devnet' | string;

export type Requirement = {
  facilitator: Facilitator;
  scheme: string;             // e.g. 'exact' or 'spl-transfer'
  network: SupportedNetwork;
  asset: string;              // token mint (Solana) or contract address (EVM)
  amountMicro: bigint;        // micro-USDC if asset is USDC
  recipient: string;          // base58 token account on Solana
  expiresAt?: Date;
  raw: unknown;               // original parsed JSON
};

const KNOWN_USDC_MINTS = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mainnet
  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // USDC devnet (Circle)
]);

function detectFacilitator(o: any): Facilitator {
  // Heuristics — facilitator is sometimes echoed as a top-level field.
  const fac = (o.facilitator ?? o.x402Facilitator ?? '').toString().toLowerCase();
  if (fac.includes('coinbase')) return 'coinbase';
  if (fac.includes('payai')) return 'payai';
  if (fac.includes('corbits')) return 'corbits';
  return 'unknown';
}

function toBigInt(x: unknown): bigint {
  if (typeof x === 'bigint') return x;
  if (typeof x === 'number') return BigInt(Math.floor(x));
  if (typeof x === 'string' && /^\d+$/.test(x)) return BigInt(x);
  throw new TypeError(`cannot convert to bigint: ${String(x)}`);
}

export function parsePaymentRequirements(body: any): Requirement[] {
  const facilitator = detectFacilitator(body);
  const accepts: any[] = Array.isArray(body?.accepts)
    ? body.accepts
    : Array.isArray(body?.payment?.accepts)
    ? body.payment.accepts
    : [];

  const reqs: Requirement[] = [];
  for (const a of accepts) {
    const scheme: string = a.scheme ?? a.kind ?? 'exact';
    const network: string = a.network ?? a.chain ?? 'unknown';
    const asset: string = a.asset ?? a.token ?? a.mint ?? '';
    const recipient: string = a.payTo ?? a.recipient ?? a.payeeAddress ?? '';
    const amount = a.maxAmountRequired ?? a.amount ?? a.maxAmount ?? a.price;
    let amountMicro: bigint;
    try {
      amountMicro = toBigInt(amount);
    } catch {
      continue;
    }
    if (!asset || !recipient) continue;
    reqs.push({
      facilitator,
      scheme,
      network,
      asset,
      amountMicro,
      recipient,
      expiresAt: a.expiresAt ? new Date(a.expiresAt) : undefined,
      raw: a,
    });
  }

  return reqs;
}

export function selectAcceptable(
  reqs: Requirement[],
  opts: { maxAmountMicro: bigint; vaultMint?: string },
): Requirement | null {
  // If the caller knows the vault's bound mint, filter to that exact mint —
  // the program will reject anything else anyway. Otherwise fall back to the
  // canonical USDC list + a soft suffix match.
  const candidates = reqs
    .filter((r) => /^solana/.test(r.network))
    .filter((r) =>
      opts.vaultMint
        ? r.asset === opts.vaultMint
        : KNOWN_USDC_MINTS.has(r.asset) || r.asset.endsWith('USDC'),
    )
    .filter((r) => r.amountMicro <= opts.maxAmountMicro)
    .sort((a, b) => (a.amountMicro < b.amountMicro ? -1 : 1));
  return candidates[0] ?? null;
}

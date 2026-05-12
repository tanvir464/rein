/**
 * GoldRush (Covalent) REST client.
 *
 * Mainnet-only on Solana — `chainName = "solana-mainnet"`. We use it for
 * recipient reputation lookups (against real on-chain merchants) and
 * historical SOL/USDC pricing for receipt USD enrichment.
 */
const BASE = 'https://api.covalenthq.com/v1';
const CHAIN = 'solana-mainnet';

// Canonical SPL mint addresses (Solana mainnet) — used by the historical
// price endpoint. GoldRush keys prices by contract address per chain.
export const KNOWN_MINTS = {
  // Wrapped SOL
  SOL: 'So11111111111111111111111111111111111111112',
  // Circle USDC (mainnet)
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  // Tether USDT (mainnet)
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
} as const;

export interface BalanceItem {
  contract_ticker_symbol: string | null;
  contract_name: string | null;
  contract_address: string | null;
  balance: string;
  quote: number | null;
  quote_rate: number | null;
  type: string;
  logo_url?: string | null;
}

export interface BalancesResponse {
  data: {
    address: string;
    chain_id: number;
    chain_name: string;
    quote_currency: string;
    items: BalanceItem[];
    next_update_at?: string;
    updated_at?: string;
  };
  error: boolean;
  error_message: string | null;
  error_code: number | null;
}

export interface HistoricalPricePoint {
  date: string;       // YYYY-MM-DD
  price: number;      // USD
}

export interface HistoricalPriceResponse {
  data: Array<{
    contract_address: string;
    contract_name: string | null;
    contract_ticker_symbol: string | null;
    contract_decimals: number;
    quote_currency: string;
    prices: Array<{
      contract_metadata: unknown;
      date: string;
      price: number;
    }>;
  }>;
  error: boolean;
  error_message: string | null;
  error_code: number | null;
}

export class GoldRushError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string, message?: string) {
    super(message ?? `GoldRush ${status}: ${body.slice(0, 200)}`);
    this.name = 'GoldRushError';
    this.status = status;
    this.body = body;
  }
}

function requireKey(apiKey: string | undefined): string {
  if (!apiKey) {
    throw new GoldRushError(0, '', 'GOLDRUSH_API_KEY not configured');
  }
  return apiKey;
}

async function callJson<T>(url: string, apiKey: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new GoldRushError(res.status, body);
  }
  return (await res.json()) as T;
}

export async function fetchBalances(
  wallet: string,
  apiKey: string | undefined,
): Promise<BalancesResponse> {
  const key = requireKey(apiKey);
  const url = `${BASE}/${CHAIN}/address/${wallet}/balances_v2/?quote-currency=USD&nft=false&no-spam=true`;
  const body = await callJson<BalancesResponse>(url, key);
  if (body.error) {
    throw new GoldRushError(
      body.error_code ?? 500,
      body.error_message ?? 'unknown',
      `GoldRush balances error: ${body.error_message}`,
    );
  }
  return body;
}

/**
 * Historical USD price for a token by contract address.
 * `dateIso` is a YYYY-MM-DD date string; the API returns the closing price
 * for that day. We query a 1-day window so the response has at most one point.
 */
export async function fetchHistoricalPrice(
  contract: string,
  dateIso: string,
  apiKey: string | undefined,
): Promise<number | null> {
  const key = requireKey(apiKey);
  // Single-day window; covalent expects YYYY-MM-DD for both from and to.
  const url =
    `${BASE}/pricing/historical_by_addresses_v2/${CHAIN}/USD/${contract}/` +
    `?from=${dateIso}&to=${dateIso}`;
  const body = await callJson<HistoricalPriceResponse>(url, key);
  if (body.error) {
    throw new GoldRushError(
      body.error_code ?? 500,
      body.error_message ?? 'unknown',
      `GoldRush price error: ${body.error_message}`,
    );
  }
  const series = body.data?.[0]?.prices;
  if (!series || series.length === 0) return null;
  // Take the point closest to (or equal to) the requested date.
  const exact = series.find((p) => p.date === dateIso);
  return exact ? exact.price : series[0].price;
}

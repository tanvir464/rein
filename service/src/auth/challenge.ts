import { ed25519 } from '@noble/curves/ed25519';
import { PublicKey } from '@solana/web3.js';

/**
 * Auth challenge format. The owner of a vault signs this exact string with
 * their wallet to prove ownership, then POSTs the (vault, message, signature)
 * to /v1/auth/issue. The service verifies and mints a token.
 *
 *   rein-auth:v1:<vault>:<unix_ts>:<nonce_hex>
 *
 * - `unix_ts` must be within ±5 minutes of server time (replay window).
 * - `nonce_hex` is 16 hex chars (caller-supplied; helps audit-log dedupe).
 */
const CHALLENGE_RE = /^rein-auth:v1:([1-9A-HJ-NP-Za-km-z]{32,44}):(\d{10}):([0-9a-f]{16})$/;
const CHALLENGE_SKEW_SECS = 300;

export type ParsedChallenge = {
  vault: string;
  ts: number;
  nonce: string;
};

export function parseChallenge(message: string): ParsedChallenge | null {
  const m = message.match(CHALLENGE_RE);
  if (!m) return null;
  return { vault: m[1]!, ts: parseInt(m[2]!, 10), nonce: m[3]! };
}

export function buildChallenge(vault: string, ts?: number): string {
  const t = ts ?? Math.floor(Date.now() / 1000);
  // 16 hex chars = 8 random bytes
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  const nonce = Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
  return `rein-auth:v1:${vault}:${t}:${nonce}`;
}

export type ChallengeFailure =
  | 'malformed'
  | 'vault_mismatch'
  | 'expired'
  | 'bad_signature';

export type VerifyChallengeResult =
  | { ok: true; ownerPubkey: PublicKey; vault: string; ts: number; nonce: string }
  | { ok: false; reason: ChallengeFailure };

/**
 * @param message       — exact UTF-8 string the wallet signed
 * @param signatureB58  — base58 ed25519 signature (web3.js convention)
 * @param ownerPubkey   — the wallet that should match `vault.owner`
 *                        (caller fetches this off-chain via `program.account.vault.fetch(vault)`)
 * @param expectedVault — vault claimed in the request body; must match parsed
 */
export function verifyChallenge(
  message: string,
  signatureB58: string,
  ownerPubkey: PublicKey,
  expectedVault: string,
): VerifyChallengeResult {
  const parsed = parseChallenge(message);
  if (!parsed) return { ok: false, reason: 'malformed' };
  if (parsed.vault !== expectedVault) return { ok: false, reason: 'vault_mismatch' };

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.ts) > CHALLENGE_SKEW_SECS) {
    return { ok: false, reason: 'expired' };
  }

  let sigBytes: Uint8Array;
  try {
    // base58 → bytes via PublicKey constructor would be wrong; ed25519 signatures
    // are 64 bytes. Solana signs in base58 in the explorer, but @solana/web3.js
    // produces Uint8Array. Accept either: try as base58 (32-byte aligned to 64).
    sigBytes = base58Decode(signatureB58);
  } catch {
    return { ok: false, reason: 'bad_signature' };
  }
  if (sigBytes.length !== 64) return { ok: false, reason: 'bad_signature' };

  const ok = ed25519.verify(sigBytes, new TextEncoder().encode(message), ownerPubkey.toBytes());
  if (!ok) return { ok: false, reason: 'bad_signature' };

  return { ok: true, ownerPubkey, vault: parsed.vault, ts: parsed.ts, nonce: parsed.nonce };
}

// ── tiny base58 decoder (Bitcoin alphabet — same as Solana) ──
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) BASE_MAP[ALPHABET[i]!] = i;

function base58Decode(s: string): Uint8Array {
  if (s.length === 0) return new Uint8Array(0);
  // count leading 1's (zero bytes)
  let zeros = 0;
  while (zeros < s.length && s[zeros] === '1') zeros++;
  // process the rest
  const b256 = new Uint8Array((s.length - zeros) * 733 / 1000 + 1);
  let length = 0;
  for (let i = zeros; i < s.length; i++) {
    const ch = s[i]!;
    if (!(ch in BASE_MAP)) throw new Error(`invalid base58 char: ${ch}`);
    let carry = BASE_MAP[ch]!;
    let j = 0;
    for (let k = b256.length - 1; (carry !== 0 || j < length) && k >= 0; k--, j++) {
      carry += 58 * b256[k]!;
      b256[k] = carry % 256;
      carry = Math.floor(carry / 256);
    }
    length = j;
  }
  // skip leading zeros in b256
  let it = b256.length - length;
  while (it < b256.length && b256[it] === 0) it++;
  const out = new Uint8Array(zeros + (b256.length - it));
  for (let k = 0; k < zeros; k++) out[k] = 0;
  let p = zeros;
  while (it < b256.length) out[p++] = b256[it++]!;
  return out;
}

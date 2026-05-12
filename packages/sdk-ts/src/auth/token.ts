import { ReinError } from '../errors';
import type { Env, ParsedToken, Scope, TokenPayload } from '../types';

const TOKEN_PREFIX = 'rein_';
const VALID_ENVS = new Set<Env>(['dev', 'devnet', 'production']);
const KID_RE = /^[0-9a-f]{8}$/i;

/**
 * Parse a wire-format runtime token: `rein_<env>_<kid>.<payload_b64u>.<sig_b64u>`.
 *
 * The SDK never has the per-kid HMAC secret, so it cannot verify the signature
 * locally — only the structure, the env/kid, the payload shape, and `exp`. The
 * server always re-verifies on every request.
 */
export function parseToken(
  raw: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): ParsedToken {
  if (typeof raw !== 'string' || !raw.startsWith(TOKEN_PREFIX)) {
    throw new ReinError('ErrTokenInvalid', { reason: 'missing rein_ prefix' });
  }
  const firstDot = raw.indexOf('.');
  if (firstDot === -1) {
    throw new ReinError('ErrTokenInvalid', { reason: 'no payload section' });
  }
  const head = raw.slice(0, firstDot);
  const tail = raw.slice(firstDot + 1);

  const headParts = head.split('_');
  if (headParts.length !== 3) {
    throw new ReinError('ErrTokenInvalid', { reason: 'malformed prefix' });
  }
  const env = headParts[1] ?? '';
  const kid = headParts[2] ?? '';
  if (!VALID_ENVS.has(env as Env)) {
    throw new ReinError('ErrTokenInvalid', { reason: `unknown env: ${env}` });
  }
  if (!KID_RE.test(kid)) {
    throw new ReinError('ErrTokenInvalid', { reason: 'kid must be 8 hex chars' });
  }

  const tailParts = tail.split('.');
  if (tailParts.length !== 2) {
    throw new ReinError('ErrTokenInvalid', { reason: 'malformed body' });
  }
  const payloadB64u = tailParts[0] ?? '';
  const sigB64u = tailParts[1] ?? '';
  if (!payloadB64u || !sigB64u) {
    throw new ReinError('ErrTokenInvalid', { reason: 'empty payload or signature' });
  }

  let payload: TokenPayload;
  try {
    const json = b64uDecodeToString(payloadB64u);
    payload = JSON.parse(json) as TokenPayload;
  } catch {
    throw new ReinError('ErrTokenInvalid', { reason: 'payload not valid base64url JSON' });
  }
  if (
    typeof payload?.vault !== 'string' ||
    !Array.isArray(payload?.scopes) ||
    typeof payload?.exp !== 'number' ||
    typeof payload?.nonce !== 'string'
  ) {
    throw new ReinError('ErrTokenInvalid', { reason: 'payload missing required fields' });
  }

  if (payload.exp <= nowSec) {
    throw new ReinError('ErrTokenExpired', { exp: payload.exp, now: nowSec });
  }

  return {
    raw,
    env: env as Env,
    kid: kid.toLowerCase(),
    payload,
    signature: sigB64u,
  };
}

/** True if the token's `exp` is within `windowSec` seconds (default 60) of now. */
export function tokenNearingExpiry(
  tok: ParsedToken,
  windowSec: number = 60,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  return tok.payload.exp - nowSec < windowSec;
}

/** Token-format-aware redactor; safe to apply to arbitrary strings. */
export function redactToken(s: string): string {
  return s.replace(
    /rein_(dev|devnet|production)_[0-9a-f]{8}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    (m) => `${m.slice(0, 24)}…<redacted>`,
  );
}

export function hasScope(tok: ParsedToken, scope: Scope): boolean {
  return tok.payload.scopes.includes(scope);
}

function b64uDecodeToString(b64u: string): string {
  const base64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  if (typeof globalThis.atob === 'function') {
    const bin = globalThis.atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  // Node ≤18 fallback (Node 20+ has globalThis.atob).
  return Buffer.from(padded, 'base64').toString('utf-8');
}

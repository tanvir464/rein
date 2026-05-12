/**
 * Auth helpers — challenge construction, JWT storage, expiry checks.
 *
 * The Worker's challenge format (service/src/auth/challenge.ts):
 *   rein-auth:v1:<vault>:<unix_ts>:<nonce_hex>
 */

const STORAGE_KEY = 'rein:auth:v1';

export type Scope = 'spend' | 'read' | 'step_up_approve';

export type StoredAuth = {
  token: string;
  kid: string;
  vault: string;
  scopes: Scope[];
  expiresAt: number; // unix seconds
};

// ─── Challenge ───────────────────────────────────────────────────────────

/**
 * Builds a challenge string the wallet will sign. Mirrors
 * service/src/auth/challenge.ts:buildChallenge — the format MUST match
 * exactly or the Worker will reject the signature.
 */
export function buildChallengeMessage(vault: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const nonceBytes = new Uint8Array(8);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `rein-auth:v1:${vault}:${ts}:${nonce}`;
}

// ─── Storage ─────────────────────────────────────────────────────────────

export function loadAuth(): StoredAuth | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed.token || !parsed.expiresAt) return null;
    // Treat tokens within 30s of expiry as already expired so we don't
    // race the server's clock and 401 on a request mid-flight.
    if (parsed.expiresAt * 1000 < Date.now() + 30_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAuth(auth: StoredAuth): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function isExpired(auth: StoredAuth | null): boolean {
  if (!auth) return true;
  return auth.expiresAt * 1000 < Date.now() + 30_000;
}

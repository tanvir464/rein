import { b64uDecode, b64uDecodeJson, b64uEncode, b64uEncodeJson } from './base64url';

export type Scope = 'spend' | 'read' | 'step_up_approve';

export type TokenPayload = {
  vault: string;        // base58
  scopes: Scope[];
  exp: number;          // unix seconds
  nonce: string;        // 16-hex random per-token, audit aid
};

export type KidRecord = {
  secret: string;       // base64url-encoded 32 random bytes
  vault: string;
  scopes: Scope[];
  createdAt: number;
  revoked?: boolean;
};

export type IssuedToken = {
  token: string;
  kid: string;
  expiresAt: number;
  scopes: Scope[];
};

const TOKEN_PREFIX = 'rein';

export function envFromToken(token: string): string | null {
  const m = token.match(/^rein_([a-z0-9]+)_/);
  return m ? m[1]! : null;
}

export function parseToken(
  token: string,
): { env: string; kid: string; payload: TokenPayload; sig: Uint8Array; payloadStr: string } | null {
  const head = token.match(/^rein_([a-z0-9]+)_([0-9a-f]{8})\.([^.]+)\.([^.]+)$/);
  if (!head) return null;
  const [, env, kid, payloadStr, sigStr] = head as unknown as [string, string, string, string, string];
  let payload: TokenPayload;
  try {
    payload = b64uDecodeJson<TokenPayload>(payloadStr);
  } catch {
    return null;
  }
  const sig = b64uDecode(sigStr);
  return { env, kid, payload, sig, payloadStr };
}

async function importHmacKey(secret: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signPayload(payloadStr: string, secret: Uint8Array): Promise<Uint8Array> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadStr));
  return new Uint8Array(sig);
}

export async function verifyPayload(
  payloadStr: string,
  sig: Uint8Array,
  secret: Uint8Array,
): Promise<boolean> {
  const key = await importHmacKey(secret);
  return crypto.subtle.verify(
    'HMAC',
    key,
    sig,
    new TextEncoder().encode(payloadStr),
  );
}

function randHex(bytes: number): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}

function randBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

const KV_KEY_KID = (kid: string) => `kid:${kid}`;

export async function issueToken(
  kv: KVNamespace,
  env: string,
  vault: string,
  scopes: Scope[],
  ttlSecs: number,
): Promise<IssuedToken> {
  const kid = randHex(4); // 8 hex chars
  const secret = randBytes(32);

  const record: KidRecord = {
    secret: b64uEncode(secret),
    vault,
    scopes,
    createdAt: Math.floor(Date.now() / 1000),
  };
  await kv.put(KV_KEY_KID(kid), JSON.stringify(record), {
    // KV TTL keeps it alive; we layer exp in the token payload independently.
    // Use ttl + 1d grace so refresh can rotate the secret without losing valid tokens.
    expirationTtl: Math.max(ttlSecs + 86_400, 86_400),
  });

  const exp = Math.floor(Date.now() / 1000) + ttlSecs;
  const payload: TokenPayload = {
    vault,
    scopes,
    exp,
    nonce: randHex(8),
  };
  const payloadStr = b64uEncodeJson(payload);
  const sig = await signPayload(payloadStr, secret);
  const sigStr = b64uEncode(sig);

  const token = `${TOKEN_PREFIX}_${env}_${kid}.${payloadStr}.${sigStr}`;
  return { token, kid, expiresAt: exp, scopes };
}

export type VerifyResult =
  | { ok: true; kid: string; payload: TokenPayload; record: KidRecord }
  | { ok: false; reason: 'malformed' | 'unknown_kid' | 'revoked' | 'bad_sig' | 'expired' };

export async function verifyToken(
  kv: KVNamespace,
  token: string,
): Promise<VerifyResult> {
  const parsed = parseToken(token);
  if (!parsed) return { ok: false, reason: 'malformed' };

  const recRaw = await kv.get(KV_KEY_KID(parsed.kid));
  if (!recRaw) return { ok: false, reason: 'unknown_kid' };
  const record: KidRecord = JSON.parse(recRaw);
  if (record.revoked) return { ok: false, reason: 'revoked' };

  const secret = b64uDecode(record.secret);
  const sigOk = await verifyPayload(parsed.payloadStr, parsed.sig, secret);
  if (!sigOk) return { ok: false, reason: 'bad_sig' };

  if (parsed.payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, kid: parsed.kid, payload: parsed.payload, record };
}

export async function revokeKid(kv: KVNamespace, kid: string): Promise<boolean> {
  const recRaw = await kv.get(KV_KEY_KID(kid));
  if (!recRaw) return false;
  const record: KidRecord = JSON.parse(recRaw);
  record.revoked = true;
  await kv.put(KV_KEY_KID(kid), JSON.stringify(record));
  return true;
}

/**
 * View-key derivation + private-memo decryption.
 *
 * Derivation: the owner signs a deterministic message via their wallet adapter.
 * The signature bytes (64) are sha-256 hashed to produce a 32-byte private
 * view-key. The "public" half published to the worker (used to encrypt memos)
 * is sha-256(privKey || "pub"). This matches the worker's
 * `service/src/umbra/memo.ts` scheme:
 *
 *     key = sha256(viewKeyPub || nonce)
 *     ciphertext = AES-256-GCM(key, iv, plaintext)
 *
 * Rotation: bump the message's `kid` integer; older receipts remain decryptable
 * with the old view-key (kept in localStorage history).
 *
 * The private half NEVER leaves the browser.
 */

const VIEW_KEY_DOMAIN = 'rein.view-key.v1';

export function buildViewKeyChallenge(vault: string, kid = 0): string {
  return `${VIEW_KEY_DOMAIN}\nvault: ${vault}\nkid: ${kid}\n\nSign to derive your private-spend view key. This signature never leaves your browser.`;
}

async function sha256(...chunks: (Uint8Array | string)[]): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const total = chunks.reduce(
    (n, c) => n + (typeof c === 'string' ? enc.encode(c).byteLength : c.byteLength),
    0,
  );
  const buf = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    const b = typeof c === 'string' ? enc.encode(c) : c;
    buf.set(b, o);
    o += b.byteLength;
  }
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return new Uint8Array(digest);
}

function toHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}

function fromHex(s: string): Uint8Array {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type ViewKey = {
  vault: string;
  kid: number;
  privHex: string;
  pubHex: string;
  createdAt: number;
};

export async function deriveViewKey(
  vault: string,
  signature: Uint8Array,
  kid = 0,
): Promise<ViewKey> {
  const priv = await sha256(signature, `|${vault}|${kid}`);
  const pub = await sha256(priv, 'pub');
  return {
    vault,
    kid,
    privHex: toHex(priv),
    pubHex: toHex(pub),
    createdAt: Date.now(),
  };
}

const STORAGE_KEY = 'rein.view-keys';

type ViewKeyStore = { active: ViewKey | null; history: ViewKey[] };

function loadStore(): ViewKeyStore {
  if (typeof window === 'undefined') return { active: null, history: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { active: null, history: [] };
    return JSON.parse(raw) as ViewKeyStore;
  } catch {
    return { active: null, history: [] };
  }
}

function saveStore(s: ViewKeyStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Storage may be unavailable (private mode); the view-key still works in-memory for the session.
  }
}

export function getActiveViewKey(vault: string): ViewKey | null {
  const store = loadStore();
  if (store.active && store.active.vault === vault) return store.active;
  return null;
}

export function getAllViewKeys(vault: string): ViewKey[] {
  const store = loadStore();
  const out: ViewKey[] = [];
  if (store.active && store.active.vault === vault) out.push(store.active);
  for (const k of store.history) if (k.vault === vault) out.push(k);
  return out;
}

export function setActiveViewKey(key: ViewKey) {
  const store = loadStore();
  // Move the previous active into history (if it's a different kid).
  if (store.active && store.active.kid !== key.kid) {
    store.history = [store.active, ...store.history].slice(0, 8);
  }
  store.active = key;
  saveStore(store);
}

export function clearViewKeys() {
  saveStore({ active: null, history: [] });
}

/** Auditor disclosure string. One line, copy-pasteable. */
export function viewKeyDisclosure(key: ViewKey): string {
  return `rein:viewkey/v1 vault=${key.vault} kid=${key.kid} pub=${key.pubHex}`;
}

/**
 * Decrypts a memo from `GET /v1/receipts/private/:nonce/memo` using the
 * active view key. Returns plaintext JSON or null on failure.
 */
export async function decryptMemo(
  memo: { iv: string; ct: string; tag: string; algo: 'aes-256-gcm' },
  nonce: string,
  key: ViewKey,
): Promise<{ recipient: string; mint: string; amount: string; umbraSig: string } | null> {
  try {
    // Worker derives key = sha256(viewKeyPubBytes || utf8(nonce))
    const pubBytes = fromHex(key.pubHex);
    const aesKeyBytes = await sha256(pubBytes, nonce);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      aesKeyBytes as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    );
    const iv = fromB64(memo.iv);
    const ct = fromB64(memo.ct);
    const tag = fromB64(memo.tag);
    // Web Crypto expects ct || tag concatenated for AES-GCM
    const combined = new Uint8Array(ct.length + tag.length);
    combined.set(ct, 0);
    combined.set(tag, ct.length);
    const ptBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      cryptoKey,
      combined as BufferSource,
    );
    const pt = new TextDecoder().decode(ptBuf);
    return JSON.parse(pt);
  } catch {
    return null;
  }
}

/**
 * HMAC client for the Fly.io REIN-Cloak sidecar.
 *
 * The sidecar owns the Umbra SDK + ZK prover (too heavy for CF Workers).
 * Every request is authenticated with an HMAC-SHA256 over the body, keyed by
 * the shared secret `SIDECAR_HMAC_KEY`. The sidecar verifies the signature
 * before doing any Umbra work; if compromised, the blast radius is limited
 * to the funds the sidecar has pre-deposited into its own Umbra account.
 */

export type CreateUtxoInput = {
  destinationAddress: string;
  mint: string;
  amount: string;
  refTag: string;
};

export type CreateUtxoResponse = {
  umbraSignature: string;
  leafIndex: number;
  commitmentHash: string;
};

export type SidecarError = {
  ok: false;
  status: number;
  body: string;
};

async function hmacSign(key: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const keyBytes = enc.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(body));
  const bytes = new Uint8Array(sig);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

export async function createUtxo(
  opts: {
    sidecarUrl: string;
    hmacKey: string;
    timeoutMs?: number;
  },
  input: CreateUtxoInput,
): Promise<CreateUtxoResponse | SidecarError> {
  const body = JSON.stringify(input);
  const ts = Date.now().toString();
  const signed = `${ts}.${body}`;
  const sig = await hmacSign(opts.hmacKey, signed);

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30_000);
  let res: Response;
  try {
    res = await fetch(`${opts.sidecarUrl.replace(/\/$/, '')}/umbra/create-utxo`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-rein-sig': sig,
        'x-rein-ts': ts,
      },
      body,
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body: text };
  }
  try {
    const json = JSON.parse(text) as CreateUtxoResponse;
    if (!json.umbraSignature || typeof json.leafIndex !== 'number' || !json.commitmentHash) {
      return { ok: false, status: 502, body: `malformed sidecar response: ${text}` };
    }
    return json;
  } catch {
    return { ok: false, status: 502, body: `non-JSON sidecar response: ${text}` };
  }
}

/** Web-Crypto-friendly base64url encode/decode (no Node Buffer dep). */

export function b64uEncode(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]!);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function b64uDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const norm = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(norm);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function b64uEncodeJson(o: unknown): string {
  return b64uEncode(new TextEncoder().encode(JSON.stringify(o)));
}
export function b64uDecodeJson<T = unknown>(s: string): T {
  return JSON.parse(new TextDecoder().decode(b64uDecode(s))) as T;
}

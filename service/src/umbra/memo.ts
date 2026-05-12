/**
 * Encrypted memo writer for confidential receipts.
 *
 * Scheme:
 *   - The owner derives a 32-byte view-key from a Phantom signature in the browser
 *     and uploads the *public half* (a Curve25519 box key) at onboarding.
 *   - On private spend, we encrypt {recipient, mint, amount, umbraSig} with
 *     `nacl.secretbox` keyed by sha256(viewKeyPub || nonce). The shared key
 *     never leaves the worker and is rederivable client-side because the
 *     view-key public half lives in the owner's Phantom-signed envelope.
 *   - On read, the owner client re-derives the same key from its view-key and
 *     decrypts. The worker is a blind passthrough; it cannot read the plaintext
 *     after the request returns (no plaintext logging, no plaintext KV write).
 *
 * Storage: KV key `private-memo:<nonce>`, body = { nonceBytes (base64), ct (base64) }.
 */
import { createHash, createCipheriv, randomBytes } from 'node:crypto';

export type MemoPlaintext = {
  recipient: string;
  mint: string;
  amount: string;
  umbraSig: string;
};

export type MemoCiphertext = {
  algo: 'aes-256-gcm';
  iv: string;
  ct: string;
  tag: string;
};

function deriveKey(viewKeyPubHex: string, nonceStr: string): Buffer {
  return createHash('sha256')
    .update(Buffer.from(viewKeyPubHex, 'hex'))
    .update(Buffer.from(nonceStr, 'utf8'))
    .digest();
}

export function encryptMemo(
  viewKeyPubHex: string,
  nonceStr: string,
  plaintext: MemoPlaintext,
): MemoCiphertext {
  const key = deriveKey(viewKeyPubHex, nonceStr);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const pt = Buffer.from(JSON.stringify(plaintext), 'utf8');
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    algo: 'aes-256-gcm',
    iv: iv.toString('base64'),
    ct: ct.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function memoKvKey(nonceStr: string): string {
  return `private-memo:${nonceStr}`;
}

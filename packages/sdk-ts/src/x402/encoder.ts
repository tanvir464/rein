import type { Requirement } from './parser';

/**
 * Build the value of the `X-Payment` HTTP header per the x402 spec.
 *
 * Format (Coinbase v0.3, the v1 default):
 *   base64url(JSON({
 *     scheme,                  // mirrored from the requirement
 *     network,                 // mirrored from the requirement
 *     payload: {
 *       signature: '<base58 tx signature>',
 *       transaction: '<base58 serialized tx>'?,   // optional for some schemes
 *       receiptPda: '<base58 PDA>'?,              // REIN-specific
 *     }
 *   }))
 *
 * Facilitators may extend the payload — we pass through any extras the caller
 * supplies via `extra`.
 */
export function encodePaymentHeader(args: {
  requirement: Requirement;
  signature: string;
  transactionBase58?: string;
  receiptPda?: string;
  extra?: Record<string, unknown>;
}): string {
  const payload: Record<string, unknown> = {
    signature: args.signature,
  };
  if (args.transactionBase58) payload['transaction'] = args.transactionBase58;
  if (args.receiptPda) payload['receiptPda'] = args.receiptPda;
  if (args.extra) Object.assign(payload, args.extra);

  const envelope = {
    scheme: args.requirement.scheme,
    network: args.requirement.network,
    payload,
  };
  const json = JSON.stringify(envelope);
  return b64uEncode(json);
}

function b64uEncode(s: string): string {
  if (typeof globalThis.btoa === 'function') {
    const bytes = new TextEncoder().encode(s);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
    return globalThis
      .btoa(bin)
      .replace(/=+$/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
  return Buffer.from(s, 'utf-8')
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

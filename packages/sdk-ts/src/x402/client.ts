import { ReinError } from '../errors';
import type { ServiceHttp } from '../service/http';
import type { Receipt, SpendResult } from '../types';
import { encodePaymentHeader } from './encoder';
import { parsePaymentRequirements, type Requirement } from './parser';
import { selectAcceptable } from './selector';

export type X402SpendInput = {
  url: string;
  maxAmount: bigint;
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
};

/**
 * Service-mediated x402 spend (the agent path).
 *
 * Calls `POST /v1/x402/spend` on the REIN service, which performs:
 *   1. fetch URL → 402
 *   2. parse + select requirement
 *   3. simulate against on-chain policy
 *   4. build/sign the spend tx with the delegate keypair
 *   5. submit + confirm
 *   6. retry the URL with `X-Payment` header
 *   7. return content + receipt + requirement
 *
 * Returns a `SpendResult` shaped per the public SDK API.
 */
export async function x402SpendViaService(
  http: ServiceHttp,
  input: X402SpendInput,
): Promise<SpendResult> {
  const body = await http.post<X402SpendBody>('/v1/x402/spend', {
    url: input.url,
    maxAmount: input.maxAmount.toString(),
    method: input.method,
    body: input.body,
    headers: input.headers,
  });

  if (body.ok) {
    return {
      ok: true,
      receiptId: body.receipt.receiptPda,
      signature: body.receipt.signature,
      amount: BigInt(body.receipt.amount),
      recipient: body.receipt.recipient,
      content: body.content,
      contentType: body.contentType,
      policyVersion: body.receipt.policyVersion,
      confirmedAt: new Date(),
    };
  }
  return {
    ok: false,
    reason: body.reason,
    stage: body.stage,
    details: body.details,
  };
}

/**
 * Direct-mode x402 dance, run entirely client-side. The caller must have an
 * RPC connection + signer to actually settle the spend; this helper just
 * executes the HTTP-side of the protocol and surfaces parsed requirements
 * back to the caller, who then wires it into the on-chain spend.
 *
 * Used by the dashboard and by power users who want to avoid the service.
 */
export async function probe402(
  url: string,
  init: RequestInit | undefined,
  fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
): Promise<{ status: number; body: unknown; requirements: Requirement[] }> {
  const r = await fetchImpl(url, init);
  if (r.status !== 402) {
    return { status: r.status, body: undefined, requirements: [] };
  }
  let body: unknown;
  try {
    body = await r.json();
  } catch {
    throw new ReinError('ErrPaymentRequirementsInvalid', { reason: '402 body not JSON' });
  }
  const requirements = parsePaymentRequirements(body);
  if (requirements.length === 0) {
    throw new ReinError('ErrPaymentRequirementsInvalid', { reason: 'no recognizable accepts entries', body });
  }
  return { status: 402, body, requirements };
}

export { encodePaymentHeader, parsePaymentRequirements, selectAcceptable };
export type { Requirement };

// ─── Internal: response shape from POST /v1/x402/spend ───────────────
type X402SpendBody =
  | {
      ok: true;
      content: unknown;
      contentType?: string;
      receipt: {
        signature: string;
        receiptPda: string;
        nonce: string;
        amount: string;
        policyVersion: number;
        recipient: string;
      };
      requirement: {
        facilitator: string;
        scheme: string;
        network: string;
        asset: string;
        amountMicro: string;
        recipient: string;
        expiresAt?: string;
      };
    }
  | {
      ok: false;
      stage?: SpendResult extends { stage?: infer S } ? S : never;
      reason: string;
      details?: string;
    };

// Helper for callers that have already settled an on-chain spend and want to
// retry the URL with the resulting payment header. Returns the second-fetch
// response unwrapped.
export async function payAndRetry(args: {
  url: string;
  init: RequestInit | undefined;
  requirement: Requirement;
  signature: string;
  receiptPda?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ status: number; body: unknown; receiptId?: string }> {
  const fetchImpl = args.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const xPayment = encodePaymentHeader({
    requirement: args.requirement,
    signature: args.signature,
    receiptPda: args.receiptPda,
  });
  const r = await fetchImpl(args.url, {
    ...args.init,
    headers: {
      ...(args.init?.headers as Record<string, string> | undefined),
      'X-Payment': xPayment,
      ...(args.receiptPda ? { 'X-REIN-Receipt': args.receiptPda } : {}),
    },
  });
  if (r.status === 402) {
    throw new ReinError('ErrPaymentNotAccepted', { signature: args.signature });
  }
  let body: unknown;
  const ct = r.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) body = await r.json();
  else body = await r.text();
  return { status: r.status, body, receiptId: args.receiptPda };
}

// (intentionally left at module bottom — keeps named-export surface stable)
export type { Receipt };

import type { SimReason } from './policy';

/** Solana cluster label. v1 chain support: devnet only (mainnet is gated post-audit). */
export type Cluster = 'devnet' | 'mainnet-beta' | 'localnet' | 'testnet';

/** Token environment, parsed from the `rein_<env>_…` token prefix. Mirrors `service/wrangler.toml`. */
export type Env = 'dev' | 'devnet' | 'production';

/** Scopes minted by the auth service. Mirrors `service/src/auth/tokens.ts`. */
export type Scope = 'spend' | 'read' | 'step_up_approve';

/** Decoded payload section of a runtime token. */
export type TokenPayload = {
  vault: string;
  scopes: Scope[];
  exp: number;     // unix seconds
  nonce: string;
};

/** Result of `parseToken(raw)` — decoded but not HMAC-verified (the SDK doesn't have the secret). */
export type ParsedToken = {
  raw: string;
  env: Env;
  kid: string;       // 8 hex chars, lowercased
  payload: TokenPayload;
  signature: string; // base64url-encoded HMAC; service-side verification only
};

/** Pluggable logger; defaults to silent in production builds, console in dev. */
export type Logger = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

/** HTTP retry policy for service calls. */
export type RetryConfig = {
  attempts: number;
  backoffMs: number;
};

/** v1 spend kinds: HTTP 402 endpoint payment, or direct on-chain USDC transfer. */
export type SpendOpts =
  | {
      kind: 'x402';
      url: string;
      maxAmount?: bigint;
      method?: 'GET' | 'POST';
      body?: unknown;
      headers?: Record<string, string>;
      priorityFee?: boolean;
      commitment?: 'confirmed' | 'finalized';
      idempotencyKey?: string;
    }
  | {
      kind: 'transfer';
      recipient: string;        // recipient USDC ATA, base58
      amount: bigint;           // micro-USDC
      memo?: string;
      priorityFee?: boolean;
      commitment?: 'confirmed' | 'finalized';
      idempotencyKey?: string;
    };

export type StepUpOpts = {
  amount: bigint;
  recipient: string;
  reason?: string;
  ttlSecs?: number;
};

export type Policy = {
  version: number;
  dailyCap: bigint;
  perTxCap: bigint;
  allowlist: string[];     // base58 token-account pubkeys
  stepUpThreshold: bigint;
  expiryTs: number;        // unix seconds; 0 = never
  paused: boolean;
};

export type Receipt = {
  id: string;              // SpendReceipt PDA, base58
  signature: string;       // tx signature, base58
  vault: string;
  amount: bigint;          // micro-USDC
  recipient: string;
  ts: Date;
  policyVersion: number;
  nonce: bigint;
  /** sha256 of the URL for x402 spends; undefined for direct transfers. */
  x402UrlHash?: string;
  disputed: boolean;
};

export type SpendResult =
  | {
      ok: true;
      receiptId: string;
      signature: string;
      amount: bigint;
      recipient: string;
      content?: unknown;
      contentType?: string;
      policyVersion: number;
      confirmedAt: Date;
    }
  | {
      ok: false;
      reason: SimReason | 'ErrService' | 'ErrRpc' | 'ErrTimeout' |
              'ErrNoAcceptablePayment' | 'ErrPaymentNotAccepted' |
              'ErrUnauthorized' | 'ErrFacilitatorUnsupported' |
              'ErrPaymentRequirementsInvalid' | string;
      stage?:
        | 'load' | 'simulate' | 'build' | 'sign' | 'submit' | 'confirm'
        | 'fetch' | 'parse' | 'select' | 'paid_fetch';
      details?: string;
      suggestedStepUp?: { amount: bigint; threshold: bigint };
    };

export type SimulationOk = { ok: true; willCost: bigint; dailySpentAfter: bigint };
export type SimulationFail = {
  ok: false;
  reason: SimReason;
  details?: string;
  suggestedStepUp?: { amount: bigint; threshold: bigint };
};
export type SimulationOutcome = SimulationOk | SimulationFail;

export type ActivityEvent =
  | { type: 'hello'; vault: string; ts: Date }
  | { type: 'pong'; ts: Date }
  | {
      type: 'spend.completed';
      vault: string;
      receiptPda: string;
      signature: string;
      amount: bigint;
      recipient: string;
      policyVersion: number;
      ts: Date;
    }
  | {
      type: 'spend.rejected';
      vault: string;
      stage?: string;
      reason: string;
      amount?: bigint;
      recipient?: string;
      ts: Date;
    }
  | {
      type: 'step_up.requested';
      vault: string;
      requestPda: string;
      amount: bigint;
      recipient: string;
      nonce: bigint;
      expiresAt: Date;
      ts: Date;
    }
  | { type: 'step_up.approved'; vault: string; requestPda: string; ts: Date };

export type Unsubscribe = () => void;

export type SubscribeOpts = {
  /** Replay buffered events newer than this timestamp. Server keeps a 5-min, 200-event window. */
  since?: Date;
  signal?: AbortSignal;
  onError?: (err: unknown) => void;
  onClose?: () => void;
};

/**
 * The full set of error codes this SDK can surface.
 *
 * Codes that mirror Anchor program errors (`Err…`) keep their exact name;
 * the parity CI gate enforces the SDK never accepts what the program would
 * reject. See `policy/simulate.ts` for the asymmetry rule and
 * `specs/features/F16-rein-sdk.md` §10 for the canonical list.
 */
export type ErrorCode =
  // ─── config / caller bug ─────────────────────────────────────────────
  | 'ErrConfig'
  | 'ErrTokenInvalid'
  | 'ErrTokenExpired'
  | 'ErrTokenScope'
  // ─── network / transport ─────────────────────────────────────────────
  | 'ErrRpc'
  | 'ErrService'
  | 'ErrTimeout'
  | 'ErrUnauthorized'
  // ─── chain (mirrors program/programs/rein/src/errors.rs) ─────────────
  | 'ErrAmountZero'
  | 'ErrPaused'
  | 'ErrExpired'
  | 'ErrPerTxCap'
  | 'ErrDailyCap'
  | 'ErrRecipientNotAllowed'
  | 'ErrRecipientBlocked'
  | 'ErrStepUpRequired'
  | 'ErrStepUpExpired'
  | 'ErrStepUpMismatch'
  | 'ErrStepUpNotNeeded'
  | 'ErrStepUpTtlInvalid'
  | 'ErrCounterDayMismatch'
  | 'ErrReplay'
  | 'ErrNotVaultOwner'
  | 'ErrMintMismatch'
  | 'ErrInvalidPolicy'
  | 'ErrAllowlistTooLong'
  | 'ErrVersionOverflow'
  | 'ErrOverflow'
  | 'ErrBlocklistFull'
  | 'ErrNotExpiring'
  | 'ErrNotExpired'
  // ─── x402 ────────────────────────────────────────────────────────────
  | 'ErrNoAcceptablePayment'
  | 'ErrPaymentNotAccepted'
  | 'ErrFacilitatorUnsupported'
  | 'ErrPaymentRequirementsInvalid'
  // ─── simulator parity invariant — should never happen ───────────────
  | 'ErrSimMismatch';

/** Subset of `ErrorCode` that can surface as the `reason` of a failed `SpendResult`. */
export type SpendErrorCode = Extract<
  ErrorCode,
  | 'ErrAmountZero'
  | 'ErrPaused'
  | 'ErrExpired'
  | 'ErrPerTxCap'
  | 'ErrDailyCap'
  | 'ErrRecipientNotAllowed'
  | 'ErrRecipientBlocked'
  | 'ErrStepUpRequired'
  | 'ErrStepUpExpired'
  | 'ErrStepUpMismatch'
  | 'ErrCounterDayMismatch'
  | 'ErrReplay'
  | 'ErrNoAcceptablePayment'
  | 'ErrPaymentNotAccepted'
>;

/**
 * Single error class for every SDK failure. Carries a stable string `code` and
 * an opaque `details` payload.
 *
 * `Error.message` is set to `code` so unhandled-error logs are immediately
 * grep-friendly (`grep ErrPerTxCap`).
 */
export class ReinError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(code: ErrorCode, details?: unknown) {
    super(code);
    this.name = 'ReinError';
    this.code = code;
    this.details = details;
    // Restore prototype chain — needed when targeting ES5 runtimes.
    Object.setPrototypeOf(this, ReinError.prototype);
  }
}

/** Type-guard. With no codes, narrows on the class; with codes, also narrows on code. */
export function isReinError(err: unknown, ...codes: ErrorCode[]): err is ReinError {
  if (!(err instanceof ReinError)) return false;
  return codes.length === 0 || codes.includes(err.code);
}

"""Error codes + ``ReinError`` exception.

Mirrors the TypeScript SDK 1:1 — codes are exported as a string-typed
enumeration so consumers can pattern-match.
"""

from __future__ import annotations

from typing import Any, Final, Literal, Sequence


# Keep this list in sync with `packages/sdk-ts/src/errors.ts` ErrorCode union
# and with the Anchor program errors. The parity CI gate enforces equivalence.
ErrorCode = Literal[
    # config / caller bug
    "ErrConfig",
    "ErrTokenInvalid",
    "ErrTokenExpired",
    "ErrTokenScope",
    # network / transport
    "ErrRpc",
    "ErrService",
    "ErrTimeout",
    "ErrUnauthorized",
    # chain (mirrors program errors)
    "ErrAmountZero",
    "ErrPaused",
    "ErrExpired",
    "ErrPerTxCap",
    "ErrDailyCap",
    "ErrRecipientNotAllowed",
    "ErrRecipientBlocked",
    "ErrStepUpRequired",
    "ErrStepUpExpired",
    "ErrStepUpMismatch",
    "ErrStepUpNotNeeded",
    "ErrStepUpTtlInvalid",
    "ErrCounterDayMismatch",
    "ErrReplay",
    "ErrNotVaultOwner",
    "ErrMintMismatch",
    "ErrInvalidPolicy",
    "ErrAllowlistTooLong",
    "ErrVersionOverflow",
    "ErrOverflow",
    "ErrBlocklistFull",
    "ErrNotExpiring",
    "ErrNotExpired",
    # x402
    "ErrNoAcceptablePayment",
    "ErrPaymentNotAccepted",
    "ErrFacilitatorUnsupported",
    "ErrPaymentRequirementsInvalid",
    # simulator parity invariant
    "ErrSimMismatch",
]


# Locked set; the parity CI gate compares this against the TS SDK + Anchor program.
ALL_ERROR_CODES: Final[tuple[str, ...]] = (
    "ErrConfig",
    "ErrTokenInvalid",
    "ErrTokenExpired",
    "ErrTokenScope",
    "ErrRpc",
    "ErrService",
    "ErrTimeout",
    "ErrUnauthorized",
    "ErrAmountZero",
    "ErrPaused",
    "ErrExpired",
    "ErrPerTxCap",
    "ErrDailyCap",
    "ErrRecipientNotAllowed",
    "ErrRecipientBlocked",
    "ErrStepUpRequired",
    "ErrStepUpExpired",
    "ErrStepUpMismatch",
    "ErrStepUpNotNeeded",
    "ErrStepUpTtlInvalid",
    "ErrCounterDayMismatch",
    "ErrReplay",
    "ErrNotVaultOwner",
    "ErrMintMismatch",
    "ErrInvalidPolicy",
    "ErrAllowlistTooLong",
    "ErrVersionOverflow",
    "ErrOverflow",
    "ErrBlocklistFull",
    "ErrNotExpiring",
    "ErrNotExpired",
    "ErrNoAcceptablePayment",
    "ErrPaymentNotAccepted",
    "ErrFacilitatorUnsupported",
    "ErrPaymentRequirementsInvalid",
    "ErrSimMismatch",
)


class ReinError(Exception):
    """Single error class for every SDK failure.

    Carries a stable string ``code`` and an opaque ``details`` payload.
    """

    code: str
    details: Any

    def __init__(self, code: str, details: Any | None = None) -> None:
        super().__init__(code)
        self.code = code
        self.details = details

    def __repr__(self) -> str:
        return f"ReinError({self.code!r}, details={self.details!r})"


def is_rein_error(err: Any, *codes: str) -> bool:
    """Type-guard helper. With no codes, narrows on the class; with codes,
    also narrows on code.
    """
    if not isinstance(err, ReinError):
        return False
    if not codes:
        return True
    return err.code in codes

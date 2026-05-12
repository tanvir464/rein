from rein import ReinError, is_rein_error
from rein.errors import ALL_ERROR_CODES as ALL_ERR


def test_rein_error_carries_code_and_details():
    e = ReinError("ErrPerTxCap", {"foo": "bar"})
    assert e.code == "ErrPerTxCap"
    assert str(e) == "ErrPerTxCap"
    assert e.details == {"foo": "bar"}


def test_is_rein_error_narrowing():
    e = ReinError("ErrTokenExpired")
    assert is_rein_error(e) is True
    assert is_rein_error(e, "ErrTokenExpired") is True
    assert is_rein_error(e, "ErrPerTxCap") is False
    assert is_rein_error(Exception("plain")) is False
    assert is_rein_error(None) is False


def test_error_code_set_is_locked():
    # If you change the SDK error set, update this list AND the TS counterpart
    # (packages/sdk-ts/tests/errors.test.ts) AND the Anchor program errors.
    assert sorted(ALL_ERR) == sorted([
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
    ])

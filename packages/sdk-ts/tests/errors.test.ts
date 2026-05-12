import { describe, it, expect } from 'vitest';
import { ReinError, isReinError, type ErrorCode } from '../src';

describe('ReinError', () => {
  it('carries code, message, name, and details', () => {
    const e = new ReinError('ErrPerTxCap', { foo: 'bar' });
    expect(e.code).toBe('ErrPerTxCap');
    expect(e.message).toBe('ErrPerTxCap');
    expect(e.name).toBe('ReinError');
    expect(e.details).toEqual({ foo: 'bar' });
  });

  it('is instanceof Error and ReinError', () => {
    const e = new ReinError('ErrConfig');
    expect(e instanceof Error).toBe(true);
    expect(e instanceof ReinError).toBe(true);
  });

  it('details is optional', () => {
    const e = new ReinError('ErrTimeout');
    expect(e.details).toBeUndefined();
  });
});

describe('isReinError', () => {
  it('narrows on the class with no code filter', () => {
    expect(isReinError(new ReinError('ErrPaused'))).toBe(true);
  });

  it('narrows on a single matching code', () => {
    const e: unknown = new ReinError('ErrTokenExpired');
    expect(isReinError(e, 'ErrTokenExpired')).toBe(true);
    expect(isReinError(e, 'ErrPerTxCap')).toBe(false);
  });

  it('narrows on any code in the list', () => {
    const e: unknown = new ReinError('ErrDailyCap');
    expect(isReinError(e, 'ErrPerTxCap', 'ErrDailyCap')).toBe(true);
    expect(isReinError(e, 'ErrPerTxCap', 'ErrPaused')).toBe(false);
  });

  it('rejects non-ReinError values', () => {
    expect(isReinError(new Error('plain'))).toBe(false);
    expect(isReinError(null)).toBe(false);
    expect(isReinError(undefined)).toBe(false);
    expect(isReinError('ErrPaused')).toBe(false);
    expect(isReinError({ code: 'ErrPaused' })).toBe(false);
  });
});

describe('ErrorCode set is stable (snapshot)', () => {
  // Listing the full set here pins it. Adding/removing a code => update this list.
  // Reorder is fine; this guards against silent renames.
  it('matches the locked F16 §10 set', () => {
    const codes: ErrorCode[] = [
      'ErrConfig',
      'ErrTokenInvalid',
      'ErrTokenExpired',
      'ErrTokenScope',
      'ErrRpc',
      'ErrService',
      'ErrTimeout',
      'ErrUnauthorized',
      'ErrAmountZero',
      'ErrPaused',
      'ErrExpired',
      'ErrPerTxCap',
      'ErrDailyCap',
      'ErrRecipientNotAllowed',
      'ErrRecipientBlocked',
      'ErrStepUpRequired',
      'ErrStepUpExpired',
      'ErrStepUpMismatch',
      'ErrStepUpNotNeeded',
      'ErrStepUpTtlInvalid',
      'ErrCounterDayMismatch',
      'ErrReplay',
      'ErrNotVaultOwner',
      'ErrMintMismatch',
      'ErrInvalidPolicy',
      'ErrAllowlistTooLong',
      'ErrVersionOverflow',
      'ErrOverflow',
      'ErrBlocklistFull',
      'ErrNotExpiring',
      'ErrNotExpired',
      'ErrNoAcceptablePayment',
      'ErrPaymentNotAccepted',
      'ErrFacilitatorUnsupported',
      'ErrPaymentRequirementsInvalid',
      'ErrSimMismatch',
    ];
    // Sorted comparison — ordering above is for readability, not correctness.
    expect([...codes].sort()).toEqual(
      [
        'ErrAllowlistTooLong',
        'ErrAmountZero',
        'ErrBlocklistFull',
        'ErrConfig',
        'ErrCounterDayMismatch',
        'ErrDailyCap',
        'ErrExpired',
        'ErrFacilitatorUnsupported',
        'ErrInvalidPolicy',
        'ErrMintMismatch',
        'ErrNoAcceptablePayment',
        'ErrNotExpired',
        'ErrNotExpiring',
        'ErrNotVaultOwner',
        'ErrOverflow',
        'ErrPaused',
        'ErrPaymentNotAccepted',
        'ErrPaymentRequirementsInvalid',
        'ErrPerTxCap',
        'ErrRecipientBlocked',
        'ErrRecipientNotAllowed',
        'ErrReplay',
        'ErrRpc',
        'ErrService',
        'ErrSimMismatch',
        'ErrStepUpExpired',
        'ErrStepUpMismatch',
        'ErrStepUpNotNeeded',
        'ErrStepUpRequired',
        'ErrStepUpTtlInvalid',
        'ErrTimeout',
        'ErrTokenExpired',
        'ErrTokenInvalid',
        'ErrTokenScope',
        'ErrUnauthorized',
        'ErrVersionOverflow',
      ].sort(),
    );
  });
});

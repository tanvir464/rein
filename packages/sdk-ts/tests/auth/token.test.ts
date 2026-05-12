import { describe, it, expect } from 'vitest';

import {
  parseToken,
  redactToken,
  tokenNearingExpiry,
  hasScope,
  ReinError,
} from '../../src';

function b64u(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function makeToken(opts: {
  env?: string;
  kid?: string;
  payload?: Record<string, unknown>;
  sig?: string;
} = {}): string {
  const env = opts.env ?? 'dev';
  const kid = opts.kid ?? '01abcdef';
  const payload =
    opts.payload ??
    {
      vault: 'vault123',
      scopes: ['spend'],
      exp: Math.floor(Date.now() / 1000) + 3600,
      nonce: 'abc',
    };
  const sig = opts.sig ?? 'fakesig';
  return `rein_${env}_${kid}.${b64u(JSON.stringify(payload))}.${sig}`;
}

describe('parseToken — happy path', () => {
  it('parses a well-formed token', () => {
    const tok = parseToken(makeToken());
    expect(tok.env).toBe('dev');
    expect(tok.kid).toBe('01abcdef');
    expect(tok.payload.vault).toBe('vault123');
    expect(tok.payload.scopes).toEqual(['spend']);
    expect(tok.signature).toBe('fakesig');
  });

  it('lowercases the kid', () => {
    const tok = parseToken(makeToken({ kid: '01ABCDEF' }));
    expect(tok.kid).toBe('01abcdef');
  });

  it('accepts dev / devnet / production env', () => {
    expect(parseToken(makeToken({ env: 'dev' })).env).toBe('dev');
    expect(parseToken(makeToken({ env: 'devnet' })).env).toBe('devnet');
    expect(parseToken(makeToken({ env: 'production' })).env).toBe('production');
  });
});

describe('parseToken — rejects malformed inputs', () => {
  it('rejects missing prefix', () => {
    expect(() => parseToken('bearer xyz')).toThrowError(ReinError);
  });

  it('rejects malformed prefix (only one underscore)', () => {
    expect(() => parseToken('rein_dev.payload.sig')).toThrowError(/ErrTokenInvalid/);
  });

  it('rejects unknown env', () => {
    expect(() => parseToken(makeToken({ env: 'mainnet' }))).toThrowError(/ErrTokenInvalid/);
  });

  it('rejects bad kid (non-hex)', () => {
    expect(() => parseToken(makeToken({ kid: 'NOTHEXXX' }))).toThrowError(/ErrTokenInvalid/);
  });

  it('rejects bad kid (wrong length)', () => {
    expect(() => parseToken(makeToken({ kid: 'abc' }))).toThrowError(/ErrTokenInvalid/);
  });

  it('rejects no payload section', () => {
    expect(() => parseToken('rein_dev_01abcdef')).toThrowError(/ErrTokenInvalid/);
  });

  it('rejects malformed body (no signature)', () => {
    const t = `rein_dev_01abcdef.${b64u('{}')}`;
    expect(() => parseToken(t)).toThrowError(/ErrTokenInvalid/);
  });

  it('rejects payload that is not base64url JSON', () => {
    const t = `rein_dev_01abcdef.@@@.sig`;
    expect(() => parseToken(t)).toThrowError(/ErrTokenInvalid/);
  });

  it('rejects payload missing required fields', () => {
    const t = makeToken({ payload: { vault: 'v' } });
    expect(() => parseToken(t)).toThrowError(/ErrTokenInvalid/);
  });
});

describe('parseToken — expiry', () => {
  it('rejects already-expired token', () => {
    const expired = makeToken({
      payload: { vault: 'v', scopes: ['spend'], exp: 1, nonce: 'a' },
    });
    expect(() => parseToken(expired)).toThrowError(/ErrTokenExpired/);
  });

  it('accepts token whose exp is now+1 second', () => {
    const t = makeToken({
      payload: {
        vault: 'v',
        scopes: ['spend'],
        exp: Math.floor(Date.now() / 1000) + 1,
        nonce: 'a',
      },
    });
    expect(() => parseToken(t)).not.toThrow();
  });

  it('honours injected nowSec for deterministic tests', () => {
    const exp = 1_000_000;
    const t = makeToken({
      payload: { vault: 'v', scopes: ['spend'], exp, nonce: 'a' },
    });
    expect(() => parseToken(t, exp - 1)).not.toThrow();
    expect(() => parseToken(t, exp)).toThrowError(/ErrTokenExpired/);
    expect(() => parseToken(t, exp + 1)).toThrowError(/ErrTokenExpired/);
  });
});

describe('tokenNearingExpiry', () => {
  it('returns true within window', () => {
    const tok = parseToken(
      makeToken({
        payload: {
          vault: 'v',
          scopes: ['read'],
          exp: Math.floor(Date.now() / 1000) + 30,
          nonce: 'a',
        },
      }),
    );
    expect(tokenNearingExpiry(tok, 60)).toBe(true);
  });

  it('returns false outside window', () => {
    const tok = parseToken(
      makeToken({
        payload: {
          vault: 'v',
          scopes: ['read'],
          exp: Math.floor(Date.now() / 1000) + 3600,
          nonce: 'a',
        },
      }),
    );
    expect(tokenNearingExpiry(tok, 60)).toBe(false);
  });
});

describe('redactToken', () => {
  it('redacts a token embedded in a longer string', () => {
    const t = makeToken();
    const line = `Authorization: Bearer ${t} done`;
    const out = redactToken(line);
    expect(out).not.toContain(t);
    expect(out).toContain('redacted');
  });

  it('leaves non-token strings alone', () => {
    expect(redactToken('hello world')).toBe('hello world');
  });

  it('redacts multiple tokens in one string', () => {
    const t1 = makeToken();
    const t2 = makeToken({ kid: 'feedface' });
    const line = `${t1} and ${t2}`;
    const out = redactToken(line);
    expect(out).not.toContain(t1);
    expect(out).not.toContain(t2);
    expect(out.match(/redacted/g)?.length).toBe(2);
  });
});

describe('hasScope', () => {
  it('returns true when scope is present', () => {
    const tok = parseToken(makeToken());
    expect(hasScope(tok, 'spend')).toBe(true);
  });

  it('returns false when scope is missing', () => {
    const tok = parseToken(makeToken());
    expect(hasScope(tok, 'read')).toBe(false);
  });
});

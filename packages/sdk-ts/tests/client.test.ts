import { describe, it, expect } from 'vitest';
import { Keypair } from '@solana/web3.js';

import { Rein, ReinError } from '../src';

function b64u(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function makeToken(opts: {
  vault: string;
  scopes?: string[];
  exp?: number;
  env?: string;
  kid?: string;
}): string {
  const env = opts.env ?? 'dev';
  const kid = opts.kid ?? '01abcdef';
  const payload = {
    vault: opts.vault,
    scopes: opts.scopes ?? ['spend', 'read'],
    exp: opts.exp ?? Math.floor(Date.now() / 1000) + 3600,
    nonce: 'n',
  };
  return `rein_${env}_${kid}.${b64u(JSON.stringify(payload))}.sig`;
}

describe('Rein constructor — happy path', () => {
  it('accepts valid opts', () => {
    const vault = Keypair.generate().publicKey.toBase58();
    const r = new Rein({ vault, token: makeToken({ vault }), rpcUrl: 'http://localhost:8899' });
    expect(r.vault.toBase58()).toBe(vault);
    expect(r.token.env).toBe('dev');
    expect(r.cluster).toBe('devnet');
    expect(r.serviceUrl).toBe('http://127.0.0.1:8787');
  });

  it('honours explicit serviceUrl', () => {
    const vault = Keypair.generate().publicKey.toBase58();
    const r = new Rein({
      vault,
      token: makeToken({ vault }),
      rpcUrl: 'http://localhost:8899',
      serviceUrl: 'https://api.example.com',
    });
    expect(r.serviceUrl).toBe('https://api.example.com');
  });

  it('exposes hasScope', () => {
    const vault = Keypair.generate().publicKey.toBase58();
    const r = new Rein({
      vault,
      token: makeToken({ vault, scopes: ['spend'] }),
      rpcUrl: 'http://localhost:8899',
    });
    expect(r.hasScope('spend')).toBe(true);
    expect(r.hasScope('read')).toBe(false);
  });
});

describe('Rein constructor — rejections', () => {
  it('rejects malformed vault', () => {
    expect(() => new Rein({ vault: 'not-base58!!', token: 'bogus' })).toThrow(ReinError);
  });

  it('rejects malformed token', () => {
    const vault = Keypair.generate().publicKey.toBase58();
    expect(() => new Rein({ vault, token: 'not-a-token' })).toThrow(/ErrTokenInvalid/);
  });

  it('rejects token whose vault does not match opts.vault', () => {
    const v1 = Keypair.generate().publicKey.toBase58();
    const v2 = Keypair.generate().publicKey.toBase58();
    try {
      new Rein({
        vault: v1,
        token: makeToken({ vault: v2 }),
        rpcUrl: 'http://localhost:8899',
      });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ReinError);
      expect((e as ReinError).code).toBe('ErrConfig');
      expect((e as ReinError).details).toMatchObject({ reason: 'token vault mismatch' });
    }
  });

  it('rejects non-http(s) serviceUrl', () => {
    const vault = Keypair.generate().publicKey.toBase58();
    try {
      new Rein({
        vault,
        token: makeToken({ vault }),
        rpcUrl: 'http://localhost:8899',
        serviceUrl: 'ftp://nope',
      });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ReinError);
      expect((e as ReinError).code).toBe('ErrConfig');
      expect(JSON.stringify((e as ReinError).details)).toMatch(/serviceUrl/);
    }
  });

  it('rejects mainnet-beta cluster (gated post-audit)', () => {
    const vault = Keypair.generate().publicKey.toBase58();
    try {
      new Rein({
        vault,
        token: makeToken({ vault, env: 'production' }),
        cluster: 'mainnet-beta',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
      });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ReinError);
      expect((e as ReinError).code).toBe('ErrConfig');
      expect(JSON.stringify((e as ReinError).details)).toMatch(/mainnet-beta/);
    }
  });
});

describe('Rein lifecycle', () => {
  it('dispose() makes the client unusable', async () => {
    const vault = Keypair.generate().publicKey.toBase58();
    const r = new Rein({
      vault,
      token: makeToken({ vault }),
      rpcUrl: 'http://localhost:8899',
    });
    expect(r.isDisposed).toBe(false);
    await r.dispose();
    expect(r.isDisposed).toBe(true);
    await expect(r.balance()).rejects.toMatchObject({
      code: 'ErrConfig',
      details: { reason: 'Rein client has been disposed' },
    });
    await expect(r.policy()).rejects.toMatchObject({
      code: 'ErrConfig',
      details: { reason: 'Rein client has been disposed' },
    });
  });
});

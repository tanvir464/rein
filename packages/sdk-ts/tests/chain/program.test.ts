import { describe, it, expect } from 'vitest';
import { resolveRpcUrl, createConnection, createProgram } from '../../src';

describe('resolveRpcUrl', () => {
  it('prefers explicit rpcUrl', () => {
    expect(resolveRpcUrl({ rpcUrl: 'https://x', heliusApiKey: 'k', cluster: 'devnet' })).toBe(
      'https://x',
    );
  });

  it('uses Helius URL when key is set', () => {
    expect(resolveRpcUrl({ heliusApiKey: 'abc', cluster: 'devnet' })).toBe(
      'https://devnet.helius-rpc.com/?api-key=abc',
    );
    expect(resolveRpcUrl({ heliusApiKey: 'abc', cluster: 'mainnet-beta' })).toBe(
      'https://mainnet.helius-rpc.com/?api-key=abc',
    );
  });

  it('falls back to public RPC when no Helius key', () => {
    expect(resolveRpcUrl({ cluster: 'devnet' })).toBe('https://api.devnet.solana.com');
    expect(resolveRpcUrl({ cluster: 'mainnet-beta' })).toBe('https://api.mainnet-beta.solana.com');
    expect(resolveRpcUrl({ cluster: 'localnet' })).toBe('http://127.0.0.1:8899');
    expect(resolveRpcUrl({ cluster: 'testnet' })).toBe('https://api.testnet.solana.com');
  });

  it('does not use Helius for localnet even with key', () => {
    expect(resolveRpcUrl({ heliusApiKey: 'k', cluster: 'localnet' })).toBe(
      'http://127.0.0.1:8899',
    );
  });

  it('defaults to devnet when no opts given', () => {
    expect(resolveRpcUrl()).toBe('https://api.devnet.solana.com');
  });
});

describe('createConnection / createProgram', () => {
  it('createConnection returns a valid Connection', () => {
    const conn = createConnection({ rpcUrl: 'http://localhost:8899' });
    expect(conn.rpcEndpoint).toBe('http://localhost:8899');
  });

  it('createProgram returns a typed Program with the canonical programId', () => {
    const conn = createConnection({ rpcUrl: 'http://localhost:8899' });
    const program = createProgram(conn);
    expect(program.programId.toBase58()).toBe('2QFW8Xg2mrbrLv6JzUdmnczA1G3RkksH8SKmfXxCuwNj');
    // sanity: the spendReceipt namespace is wired through
    expect(program.account.spendReceipt).toBeDefined();
  });
});

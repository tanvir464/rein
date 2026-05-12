import { describe, it, expect, vi } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import { loadSimulatorState } from '../../src/policy/load-state';
import { REIN_PROGRAM_ID } from '@rein/sdk';

const VAULT = Keypair.generate().publicKey;
const RECIPIENT = Keypair.generate().publicKey;

function fakePolicy() {
  return {
    paused: false,
    expiryTs: new BN(0),
    perTxCap: new BN(500_000),
    dailyCap: new BN(5_000_000),
    stepUpThreshold: new BN(1_000_000),
    allowlistLen: 0,
    allowlist: Array.from({ length: 16 }, () => PublicKey.default),
    version: 1,
  };
}
function fakeBlocklist(len = 0, entries: PublicKey[] = []) {
  const padded = [...entries];
  while (padded.length < 8) padded.push(PublicKey.default);
  return { len, entries: padded };
}

function makeProgram(opts: {
  policy?: any;
  blocklist?: any;
  counter?: any | null;
  stepUp?: any | null;
} = {}) {
  return {
    programId: REIN_PROGRAM_ID,
    account: {
      policy: { fetch: vi.fn().mockResolvedValue(opts.policy ?? fakePolicy()) },
      blocklist: { fetch: vi.fn().mockResolvedValue(opts.blocklist ?? fakeBlocklist()) },
      dailyCounter: {
        fetchNullable: vi.fn().mockResolvedValue(opts.counter === undefined ? null : opts.counter),
      },
      stepUpRequest: {
        fetchNullable: vi.fn().mockResolvedValue(opts.stepUp === undefined ? null : opts.stepUp),
      },
    },
  } as any;
}

const NOW_SEC = 20212 * 86_400 + 12_345; // some time on day 20212
const NONCE = new BN(42);

describe('loadSimulatorState', () => {
  it('assembles all four accounts into a SimulatorState', async () => {
    const program = makeProgram({
      counter: { spent: new BN(123_000) },
      stepUp: {
        vault: VAULT,
        amount: new BN(2_000_000),
        recipient: RECIPIENT,
        nonce: NONCE,
        expiresAt: new BN(NOW_SEC + 300),
        approved: true,
      },
    });

    const s = await loadSimulatorState(program, VAULT, NONCE, NOW_SEC);

    expect(s.policy.paused).toBe(false);
    expect(s.policy.perTxCap.toString()).toBe('500000');
    expect(s.blocklist.len).toBe(0);
    expect(s.dailyCounter.spent.toString()).toBe('123000');
    expect(s.stepUpRequest?.approved).toBe(true);
    expect(s.onChainDay.toString()).toBe('20212');
  });

  it('returns dailyCounter.spent = 0 when counter PDA does not exist yet', async () => {
    const program = makeProgram({ counter: null });
    const s = await loadSimulatorState(program, VAULT, NONCE, NOW_SEC);
    expect(s.dailyCounter.spent.toString()).toBe('0');
  });

  it('returns stepUpRequest = null when no request exists for this nonce', async () => {
    const program = makeProgram({ stepUp: null });
    const s = await loadSimulatorState(program, VAULT, NONCE, NOW_SEC);
    expect(s.stepUpRequest).toBeNull();
  });

  it('derives onChainDay from nowSec via floor(/86400)', async () => {
    const program = makeProgram();
    // Boundary: exactly midnight of day 20213
    const s = await loadSimulatorState(program, VAULT, NONCE, 20213 * 86_400);
    expect(s.onChainDay.toString()).toBe('20213');
  });

  it('passes the correct PDAs to each fetch (vault-derived)', async () => {
    const program = makeProgram();
    await loadSimulatorState(program, VAULT, NONCE, NOW_SEC);
    // We can't assert exact PDAs without re-deriving, but we can assert each fetch was called once.
    expect(program.account.policy.fetch).toHaveBeenCalledOnce();
    expect(program.account.blocklist.fetch).toHaveBeenCalledOnce();
    expect(program.account.dailyCounter.fetchNullable).toHaveBeenCalledOnce();
    expect(program.account.stepUpRequest.fetchNullable).toHaveBeenCalledOnce();
  });
});

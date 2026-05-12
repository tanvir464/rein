import { describe, it, expect } from 'vitest';
import { createMcpServer, TOOL_NAMES } from '../src/server';
import type { Rein } from '@rein/sdk';

function fakeRein(): Rein {
  return {
    balance: async () => ({ usdc: 0n, sol: 0n, updatedAt: new Date() }),
    spend: async () => ({ ok: false, reason: 'ErrConfig' }),
    history: async () => [],
    requestStepUp: async () => ({
      requestPda: 'P',
      expiresAt: new Date(),
      signature: 'S',
    }),
  } as unknown as Rein;
}

describe('createMcpServer', () => {
  it('returns a Server instance', () => {
    const s = createMcpServer({ rein: fakeRein() });
    expect(s).toBeDefined();
    // Server doesn't expose its handlers directly — we'll smoke-test via in-memory transport in integration.
  });

  it('exports the four canonical tool names', () => {
    expect(TOOL_NAMES).toEqual(['spend', 'balance', 'history', 'request_step_up']);
  });
});

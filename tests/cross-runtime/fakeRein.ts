import type { Rein } from '@rein/sdk';

/**
 * Build a fake `Rein` instance whose methods return scripted responses from a
 * scenario. Each call pops the next response off the queue for that method.
 *
 * We deliberately don't construct a real `Rein` here — that would force
 * connection / RPC mocks for every runtime. The wrappers all interact with
 * the same SDK-shaped surface, so a mock is sufficient to verify wire-shape
 * parity across them.
 */
export type ScenarioCall = {
  tool: string;
  args: Record<string, unknown>;
  rein_method: 'balance' | 'spend' | 'history' | 'requestStepUp' | 'receipt' | 'simulate';
  rein_returns: unknown;
};

function reviveBigints(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(reviveBigints);
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = reviveBigintsByKey(k, val);
    }
    return out;
  }
  return v;
}

function reviveBigintsByKey(k: string, v: unknown): unknown {
  if (
    typeof v === 'string' &&
    /^\d+$/.test(v) &&
    /^(amount|maxAmount|usdc|sol|nonce|threshold|willCost|dailySpentAfter)$/i.test(k)
  ) {
    return BigInt(v);
  }
  if (typeof v === 'string' && /At$|Ts$/.test(k) && /^\d{4}-/.test(v)) {
    return new Date(v);
  }
  return reviveBigints(v);
}

export function buildFakeRein(calls: ScenarioCall[]): {
  rein: Rein;
  consumed: { method: string; args: unknown }[];
} {
  const queue: ScenarioCall[] = [...calls];
  const consumed: { method: string; args: unknown }[] = [];

  const dispatch = (method: ScenarioCall['rein_method']) => {
    return async (args?: unknown) => {
      const next = queue.find((c) => c.rein_method === method);
      if (!next) throw new Error(`scenario: no scripted response for ${method}`);
      queue.splice(queue.indexOf(next), 1);
      consumed.push({ method, args });
      return reviveBigints(next.rein_returns);
    };
  };

  const fake = {
    vault: undefined,
    balance: dispatch('balance'),
    spend: dispatch('spend'),
    history: dispatch('history'),
    requestStepUp: dispatch('requestStepUp'),
    receipt: dispatch('receipt'),
    simulate: dispatch('simulate'),
    hasScope: () => true,
  };
  return { rein: fake as unknown as Rein, consumed };
}

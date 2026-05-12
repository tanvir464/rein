import type { Rein, SpendOpts } from '@rein/sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const SpendArgsSchema = z.object({
  url: z.string().optional(),
  recipient: z.string().optional(),
  max_amount: z.string().regex(/^\d+$/).optional(),
  amount: z.string().regex(/^\d+$/).optional(),
  method: z.enum(['GET', 'POST']).optional(),
  body: z.unknown().optional(),
  headers: z.record(z.string()).optional(),
});

const BalanceArgsSchema = z.object({});

const HistoryArgsSchema = z.object({
  limit: z.number().int().positive().max(200).optional(),
  before: z.string().optional(),
});

const StepUpArgsSchema = z.object({
  amount: z.string().regex(/^\d+$/),
  recipient: z.string(),
  ttl_secs: z.number().int().positive().max(86_400).optional(),
  reason: z.string().optional(),
});

/**
 * Strip the top-level `$schema` and `additionalProperties: false` keys that
 * `zodToJsonSchema` emits — OpenAI's function-calling validator is happier
 * without them and treats their absence as the same default.
 */
function asOpenAISchema(zodSchema: z.ZodTypeAny): Record<string, unknown> {
  const json = zodToJsonSchema(zodSchema, { target: 'openApi3' }) as Record<string, unknown>;
  delete json['$schema'];
  return json;
}

/** OpenAI Functions / Chat Completions tool definitions for REIN. */
export const reinFunctionDefs: Array<{
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> = [
  {
    type: 'function',
    function: {
      name: 'rein_spend',
      description:
        'Pay an x402 endpoint (with `url` + `max_amount`) or transfer USDC to a recipient ATA (with `recipient` + `amount`). Bounded by the vault\'s on-chain policy.',
      parameters: asOpenAISchema(SpendArgsSchema),
    },
  },
  {
    type: 'function',
    function: {
      name: 'rein_balance',
      description: 'Read the vault balance (USDC + SOL).',
      parameters: asOpenAISchema(BalanceArgsSchema),
    },
  },
  {
    type: 'function',
    function: {
      name: 'rein_history',
      description: 'List recent spend receipts for the vault, newest first.',
      parameters: asOpenAISchema(HistoryArgsSchema),
    },
  },
  {
    type: 'function',
    function: {
      name: 'rein_request_step_up',
      description:
        'Open a step-up request for an over-threshold spend. The owner must approve before the eventual spend will succeed.',
      parameters: asOpenAISchema(StepUpArgsSchema),
    },
  },
];

export type ReinToolName =
  | 'rein_spend'
  | 'rein_balance'
  | 'rein_history'
  | 'rein_request_step_up';

/**
 * Map an OpenAI tool-call response onto the SDK. Caller passes the function
 * name and JSON-parsed arguments; we route to the right SDK method.
 */
export async function dispatchReinToolCall(
  rein: Rein,
  name: ReinToolName,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case 'rein_spend': {
      const v = SpendArgsSchema.parse(args);
      const hasUrl = !!v.url;
      const hasRecipient = !!v.recipient;
      if (hasUrl === hasRecipient) {
        return { ok: false, reason: 'ErrConfig', details: 'pick exactly one of url/recipient' };
      }
      let opts: SpendOpts;
      if (hasUrl) {
        if (!v.max_amount) return { ok: false, reason: 'ErrConfig', details: 'max_amount required' };
        opts = {
          kind: 'x402',
          url: v.url!,
          maxAmount: BigInt(v.max_amount),
          method: v.method,
          body: v.body,
          headers: v.headers,
        };
      } else {
        if (!v.amount) return { ok: false, reason: 'ErrConfig', details: 'amount required' };
        opts = { kind: 'transfer', recipient: v.recipient!, amount: BigInt(v.amount) };
      }
      return safeSerialize(await rein.spend(opts));
    }
    case 'rein_balance':
      return safeSerialize(await rein.balance());
    case 'rein_history': {
      const v = HistoryArgsSchema.parse(args);
      const before = v.before ? new Date(v.before) : undefined;
      const receipts = await rein.history({ limit: v.limit, before });
      return safeSerialize({ receipts });
    }
    case 'rein_request_step_up': {
      const v = StepUpArgsSchema.parse(args);
      try {
        const r = await rein.requestStepUp({
          amount: BigInt(v.amount),
          recipient: v.recipient,
          ttlSecs: v.ttl_secs,
          reason: v.reason,
        });
        return safeSerialize({ ok: true, ...r });
      } catch (e: unknown) {
        return {
          ok: false,
          reason: (e as { code?: string })?.code ?? 'ErrUnknown',
          details: (e as Error)?.message,
        };
      }
    }
  }
}

function safeSerialize(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(safeSerialize);
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())] = safeSerialize(val);
    }
    return out;
  }
  return v;
}

import { tool } from 'ai';
import type { Rein, SpendOpts } from '@rein/sdk';
import { z } from 'zod';

const SpendSchema = z.object({
  url: z.string().optional(),
  recipient: z.string().optional(),
  max_amount: z.string().regex(/^\d+$/).optional(),
  amount: z.string().regex(/^\d+$/).optional(),
  method: z.enum(['GET', 'POST']).optional(),
  body: z.unknown().optional(),
  headers: z.record(z.string()).optional(),
});

const BalanceSchema = z.object({});

const HistorySchema = z.object({
  limit: z.number().int().positive().max(200).optional(),
  before: z.string().optional(),
});

const StepUpSchema = z.object({
  amount: z.string().regex(/^\d+$/),
  recipient: z.string(),
  ttl_secs: z.number().int().positive().max(86_400).optional(),
  reason: z.string().optional(),
});

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

/**
 * Returns Vercel AI SDK `tool` definitions for the four REIN tools, ready to
 * spread into the `tools` option of `generateText` / `streamText`.
 */
export function reinTools(rein: Rein) {
  return {
    rein_spend: tool({
      description:
        'Pay an x402 endpoint (provide `url` + `max_amount`) or transfer USDC to a recipient ATA (provide `recipient` + `amount`). All spends are bounded by the on-chain policy.',
      parameters: SpendSchema,
      execute: async (args) => {
        const hasUrl = !!args.url;
        const hasRecipient = !!args.recipient;
        if (hasUrl === hasRecipient) {
          return { ok: false, reason: 'ErrConfig', details: 'pick one of url/recipient' };
        }
        let opts: SpendOpts;
        if (hasUrl) {
          if (!args.max_amount) {
            return { ok: false, reason: 'ErrConfig', details: 'max_amount required' };
          }
          opts = {
            kind: 'x402',
            url: args.url!,
            maxAmount: BigInt(args.max_amount),
            method: args.method,
            body: args.body,
            headers: args.headers,
          };
        } else {
          if (!args.amount) {
            return { ok: false, reason: 'ErrConfig', details: 'amount required' };
          }
          opts = { kind: 'transfer', recipient: args.recipient!, amount: BigInt(args.amount) };
        }
        return safeSerialize(await rein.spend(opts));
      },
    }),
    rein_balance: tool({
      description: 'Read the vault balance (USDC + SOL).',
      parameters: BalanceSchema,
      execute: async () => safeSerialize(await rein.balance()),
    }),
    rein_history: tool({
      description: 'List recent spend receipts for the vault, newest first.',
      parameters: HistorySchema,
      execute: async (args) => {
        const before = args.before ? new Date(args.before) : undefined;
        if (before && Number.isNaN(before.getTime())) {
          return { ok: false, reason: 'ErrConfig', details: 'before is not valid ISO' };
        }
        const receipts = await rein.history({ limit: args.limit, before });
        return safeSerialize({ receipts });
      },
    }),
    rein_request_step_up: tool({
      description:
        'Open a step-up request for an over-threshold spend. Owner must approve in the dashboard.',
      parameters: StepUpSchema,
      execute: async (args) => {
        try {
          const r = await rein.requestStepUp({
            amount: BigInt(args.amount),
            recipient: args.recipient,
            ttlSecs: args.ttl_secs,
            reason: args.reason,
          });
          return safeSerialize({ ok: true, ...r });
        } catch (e: unknown) {
          return {
            ok: false,
            reason: (e as { code?: string })?.code ?? 'ErrUnknown',
            details: (e as Error)?.message,
          };
        }
      },
    }),
  };
}

export const REIN_TOOL_NAMES = [
  'rein_spend',
  'rein_balance',
  'rein_history',
  'rein_request_step_up',
] as const;

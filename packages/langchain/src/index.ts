import { tool } from '@langchain/core/tools';
import type { Rein, SpendOpts } from '@rein/sdk';

import {
  BalanceArgsSchema,
  HistoryArgsSchema,
  RequestStepUpArgsSchema,
  SpendArgsSchema,
  type SpendArgs,
  type HistoryArgs,
  type RequestStepUpArgs,
} from './schemas';

export {
  SpendArgsSchema,
  BalanceArgsSchema,
  HistoryArgsSchema,
  RequestStepUpArgsSchema,
} from './schemas';

/**
 * Build the four REIN tools as LangChain `Tool` instances. Each tool wraps the
 * matching `@rein/sdk` method and returns a JSON-string LangChain expects.
 *
 * Errors are returned as JSON `{ ok: false, reason, details }` strings rather
 * than thrown exceptions — this matches the structured-error contract the
 * MCP server uses, so agent loops don't crash on policy rejection.
 */
export function createReinTools(rein: Rein) {
  const safe = (v: unknown): unknown => {
    if (typeof v === 'bigint') return v.toString();
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(safe);
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        out[k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())] = safe(val);
      }
      return out;
    }
    return v;
  };

  const spendTool = tool(
    async (args: SpendArgs) => {
      const hasUrl = !!args.url;
      const hasRecipient = !!args.recipient;
      if (hasUrl === hasRecipient) {
        return JSON.stringify({
          ok: false,
          reason: 'ErrConfig',
          details: 'exactly one of `url` or `recipient` must be set',
        });
      }
      let opts: SpendOpts;
      if (hasUrl) {
        if (!args.max_amount) {
          return JSON.stringify({ ok: false, reason: 'ErrConfig', details: 'max_amount required' });
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
          return JSON.stringify({ ok: false, reason: 'ErrConfig', details: 'amount required' });
        }
        opts = {
          kind: 'transfer',
          recipient: args.recipient!,
          amount: BigInt(args.amount),
        };
      }
      const r = await rein.spend(opts);
      return JSON.stringify(safe(r));
    },
    {
      name: 'rein_spend',
      description: SpendArgsSchema.description ?? '',
      schema: SpendArgsSchema,
    },
  );

  const balanceTool = tool(
    async () => {
      const b = await rein.balance();
      return JSON.stringify(safe(b));
    },
    {
      name: 'rein_balance',
      description: BalanceArgsSchema.description ?? '',
      schema: BalanceArgsSchema,
    },
  );

  const historyTool = tool(
    async (args: HistoryArgs) => {
      const before = args.before ? new Date(args.before) : undefined;
      if (before && Number.isNaN(before.getTime())) {
        return JSON.stringify({
          ok: false,
          reason: 'ErrConfig',
          details: 'before is not a valid ISO date',
        });
      }
      const receipts = await rein.history({ limit: args.limit, before });
      return JSON.stringify(safe({ receipts }));
    },
    {
      name: 'rein_history',
      description: HistoryArgsSchema.description ?? '',
      schema: HistoryArgsSchema,
    },
  );

  const requestStepUpTool = tool(
    async (args: RequestStepUpArgs) => {
      try {
        const r = await rein.requestStepUp({
          amount: BigInt(args.amount),
          recipient: args.recipient,
          ttlSecs: args.ttl_secs,
          reason: args.reason,
        });
        return JSON.stringify(safe({ ok: true, ...r }));
      } catch (e: unknown) {
        return JSON.stringify({
          ok: false,
          reason: (e as { code?: string })?.code ?? 'ErrUnknown',
          details: (e as Error)?.message,
        });
      }
    },
    {
      name: 'rein_request_step_up',
      description: RequestStepUpArgsSchema.description ?? '',
      schema: RequestStepUpArgsSchema,
    },
  );

  return [spendTool, balanceTool, historyTool, requestStepUpTool] as const;
}

export const REIN_TOOL_NAMES = [
  'rein_spend',
  'rein_balance',
  'rein_history',
  'rein_request_step_up',
] as const;

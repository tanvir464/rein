import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import type { Rein } from '@rein/sdk';

import { balanceToolDef, handleBalance } from './tools/balance';
import { historyToolDef, handleHistory, type HistoryArgs } from './tools/history';
import { requestStepUpToolDef, handleRequestStepUp, type StepUpArgs } from './tools/step_up';
import { spendToolDef, handleSpend, type SpendArgs, type ToolResult } from './tools/spend';

export type McpDeps = {
  rein: Rein;
  serverInfo?: { name?: string; version?: string };
};

export function createMcpServer(deps: McpDeps): Server {
  const server = new Server(
    {
      name: deps.serverInfo?.name ?? 'rein',
      version: deps.serverInfo?.version ?? '0.1.0',
    },
    { capabilities: { tools: {} } },
  );

  const toolDefs = [spendToolDef, balanceToolDef, historyToolDef, requestStepUpToolDef];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefs.map((t) => ({ ...t })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const name = req.params.name;
    const args = (req.params.arguments ?? {}) as Record<string, unknown>;
    let result: ToolResult;
    try {
      switch (name) {
        case 'spend':
          result = await handleSpend(deps.rein, args as SpendArgs);
          break;
        case 'balance':
          result = await handleBalance(deps.rein);
          break;
        case 'history':
          result = await handleHistory(deps.rein, args as HistoryArgs);
          break;
        case 'request_step_up':
          result = await handleRequestStepUp(deps.rein, args as StepUpArgs);
          break;
        default:
          result = {
            isError: true,
            content: [
              {
                type: 'text',
                text: JSON.stringify({ ok: false, reason: 'ErrUnknownTool', tool: name }),
              },
            ],
          };
      }
    } catch (e: unknown) {
      // Last-resort error wrapper. SDK errors should come through as `ok:false`
      // structured results from the handlers; if we land here, it's a programmer
      // bug or a transport/RPC failure.
      result = {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: false,
              reason: (e as { code?: string })?.code ?? 'ErrInternal',
              details: (e as Error)?.message,
            }),
          },
        ],
      };
    }
    return result;
  });

  return server;
}

export const TOOL_NAMES = ['spend', 'balance', 'history', 'request_step_up'] as const;

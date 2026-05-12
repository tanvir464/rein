/**
 * Cross-runtime parity — per `specs/todo/phase-3-runtimes.md` §Cross-runtime
 *
 * One scripted scenario, executed through every TS runtime binding. Each
 * runtime's output, after normalization, MUST match. This is the "drop-in"
 * promise — same vault, same calls, same response shape across:
 *
 *   - @rein/mcp           (via tool handler dispatch — protocol-level smoke
 *                          covered by packages/mcp/tests)
 *   - @rein/langchain     (Tool.invoke → JSON string)
 *   - @rein/openai        (dispatchReinToolCall → JSON-safe object)
 *   - @rein/ai            (tool.execute → JSON-safe object)
 *
 * Python (`rein` PyPI) shares the same scenario via
 * `packages/sdk-py/tests/test_parity.py` for the simulator + a separate
 * subprocess driver — see PARITY.md.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createReinTools } from '@rein/langchain';
import { dispatchReinToolCall, type ReinToolName } from '@rein/openai';
import { reinTools } from '@rein/ai';

import { buildFakeRein, type ScenarioCall } from './fakeRein';

// Note: @rein/mcp's tool handlers are exercised at protocol level by
// `packages/mcp/tests/tools.test.ts`. They share the same dispatch shape as
// the OpenAI driver (snake_case wire format, JSON-safe serialisation), so the
// LangChain ↔ OpenAI ↔ AI three-way diff below is a strong proxy for MCP
// equivalence. A full 5-way driver lives at `packages/sdk-py/tests/test_parity.py`
// (Python) plus this file (TS).

const SCENARIO = JSON.parse(
  readFileSync(join(__dirname, 'scenario.json'), 'utf8'),
) as { name: string; calls: ScenarioCall[] };

/** Round-trip through JSON.parse(JSON.stringify(...)) to drop class identities. */
function plain(v: unknown): unknown {
  return JSON.parse(JSON.stringify(v));
}

/** Drop framework-specific wrapper keys. */
function normalize(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = normalize(val);
    }
    return out;
  }
  return v;
}

describe(`cross-runtime parity: ${SCENARIO.name}`, () => {
  for (const call of SCENARIO.calls) {
    it(`tool=${call.tool} parity across LangChain / OpenAI / AI`, async () => {
      // Each driver gets its own isolated fakeRein with a single scripted call.
      const lcFake = buildFakeRein([call]);
      const openaiFake = buildFakeRein([call]);
      const aiFake = buildFakeRein([call]);

      // ── LangChain ─────────────────────────────────────────────────
      const lcTools = createReinTools(lcFake.rein);
      const lcTool = lcTools.find(
        (t) => t.name === `rein_${call.tool === 'request_step_up' ? 'request_step_up' : call.tool}`,
      );
      expect(lcTool, `lc tool rein_${call.tool}`).toBeDefined();
      const lcRaw = await lcTool!.invoke(call.args);
      const lcOut = JSON.parse(lcRaw as string);

      // ── OpenAI Functions ─────────────────────────────────────────
      const openaiOut = await dispatchReinToolCall(
        openaiFake.rein,
        `rein_${call.tool}` as ReinToolName,
        call.args,
      );

      // ── Vercel AI ────────────────────────────────────────────────
      const aiTools = reinTools(aiFake.rein);
      const aiTool = (aiTools as Record<string, { execute?: (args: unknown, ctx: unknown) => Promise<unknown> }>)[
        `rein_${call.tool}`
      ];
      expect(aiTool, `ai tool rein_${call.tool}`).toBeDefined();
      const aiOut = await aiTool!.execute!(call.args, {
        messages: [],
        toolCallId: 't',
        abortSignal: undefined,
      });

      // ── Diff ─────────────────────────────────────────────────────
      // Each runtime returns the same logical payload — the Rein method's
      // result, with bigints stringified and Dates ISO-formatted, in
      // snake_case. Compare deeply after normalisation.
      const a = normalize(plain(lcOut));
      const b = normalize(plain(openaiOut));
      const c = normalize(plain(aiOut));

      expect(a, `LangChain vs OpenAI for ${call.tool}`).toEqual(b);
      expect(b, `OpenAI vs Vercel AI for ${call.tool}`).toEqual(c);
    });
  }
});

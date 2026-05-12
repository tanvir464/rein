import { z } from 'zod';

/**
 * Zod schemas for the four REIN tools, shared by `@rein/langchain`,
 * `@rein/openai`, `@rein/ai`. JSON-Schema-emittable.
 */

export const SpendArgsSchema = z
  .object({
    url: z.string().describe('x402 endpoint URL. Mutually exclusive with `recipient`.').optional(),
    recipient: z.string().describe('USDC ATA, base58. Mutually exclusive with `url`.').optional(),
    max_amount: z
      .string()
      .regex(/^\d+$/)
      .describe('max micro-USDC (decimal string). Required for x402.')
      .optional(),
    amount: z
      .string()
      .regex(/^\d+$/)
      .describe('exact micro-USDC (decimal string). Required for transfer.')
      .optional(),
    method: z.enum(['GET', 'POST']).optional(),
    body: z.unknown().optional(),
    headers: z.record(z.string()).optional(),
  })
  .describe(
    'Pay an x402 endpoint or transfer USDC to a recipient. Bounded by the on-chain policy attached to the vault.',
  );
export type SpendArgs = z.infer<typeof SpendArgsSchema>;

export const BalanceArgsSchema = z
  .object({})
  .describe('Read the vault balance (USDC + SOL).');
export type BalanceArgs = z.infer<typeof BalanceArgsSchema>;

export const HistoryArgsSchema = z
  .object({
    limit: z.number().int().positive().max(200).default(50).optional(),
    before: z
      .string()
      .describe('ISO 8601 — return only receipts strictly older than this')
      .optional(),
  })
  .describe('List recent spend receipts for the vault, newest first.');
export type HistoryArgs = z.infer<typeof HistoryArgsSchema>;

export const RequestStepUpArgsSchema = z
  .object({
    amount: z
      .string()
      .regex(/^\d+$/)
      .describe('micro-USDC of the eventual spend'),
    recipient: z
      .string()
      .describe('USDC ATA base58 of the eventual recipient'),
    ttl_secs: z.number().int().positive().max(86_400).default(300).optional(),
    reason: z
      .string()
      .describe('human-readable reason; surfaced in the owner notification')
      .optional(),
  })
  .describe(
    'Open a step-up request for an over-threshold spend. Owner approves in the dashboard.',
  );
export type RequestStepUpArgs = z.infer<typeof RequestStepUpArgsSchema>;

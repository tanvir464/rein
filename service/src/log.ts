/**
 * Structured single-line JSON log. Cloudflare's `wrangler tail` shows these
 * one per request — that's the audit trail.
 */
export function logLine(fields: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...fields }));
}

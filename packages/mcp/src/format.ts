/**
 * JSON-safe serialization of SDK return values.
 *
 * The SDK uses `bigint` for amounts and `Date` for timestamps. MCP responses
 * are JSON, so we walk the structure and stringify those at the boundary.
 */
export function jsonSafe<T>(v: T): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(jsonSafe);
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[snake(k)] = jsonSafe(val);
    }
    return out;
  }
  return v;
}

/** camelCase → snake_case for the wire surface (matches MCP convention). */
export function snake(s: string): string {
  return s.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
}

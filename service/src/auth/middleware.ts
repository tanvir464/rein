import type { Context, Next } from 'hono';
import { verifyToken, type TokenPayload, type Scope } from './tokens';
import type { Env } from '../env';

export type AuthedContext = {
  Bindings: Env;
  Variables: {
    auth: {
      kid: string;
      payload: TokenPayload;
    };
  };
};

/**
 * Hono middleware. Requires a valid Bearer token; optionally enforces a scope.
 * On 401, returns a structured reason so clients can refresh / re-issue.
 */
export function requireAuth(scope?: Scope) {
  return async (c: Context<AuthedContext>, next: Next) => {
    const env = c.env;
    if (!env.REIN_KV) {
      return c.json(
        { error: 'auth unavailable: REIN_KV binding not configured' },
        503,
      );
    }

    const header = c.req.header('authorization') ?? '';
    const m = header.match(/^Bearer\s+(.+)$/i);
    if (!m) {
      return c.json({ error: 'missing or malformed Authorization header' }, 401);
    }
    const token = m[1]!;

    const r = await verifyToken(env.REIN_KV, token);
    if (!r.ok) {
      return c.json({ error: 'token invalid', reason: r.reason }, 401);
    }
    if (scope && !r.payload.scopes.includes(scope)) {
      return c.json({ error: 'insufficient scope', required: scope }, 403);
    }

    c.set('auth', { kid: r.kid, payload: r.payload });
    await next();
    return;
  };
}

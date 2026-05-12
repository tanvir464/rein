import { ReinError } from '../errors';
import { parseToken, redactToken, tokenNearingExpiry } from '../auth/token';
import type { Logger, ParsedToken, RetryConfig } from '../types';

export type HttpOpts = {
  serviceUrl: string;
  token: ParsedToken;
  fetch?: typeof fetch;
  logger?: Logger;
  retries?: RetryConfig;
  /** Refresh the bearer when `exp - now < REFRESH_WINDOW_SEC`. Default 60s. */
  refreshWindowSec?: number;
  /** Called when the SDK proactively refreshes the token. Host app may persist the new one. */
  onTokenRefresh?: (newToken: ParsedToken) => void;
};

const DEFAULT_RETRIES: RetryConfig = { attempts: 3, backoffMs: 250 };
const DEFAULT_REFRESH_WINDOW_SEC = 60;

/**
 * Typed wrapper around the REIN service HTTP API.
 *
 * Responsibilities:
 *  - Bearer-token authorization on every call.
 *  - Proactive refresh when the token nears `exp`.
 *  - Exponential-backoff retry on 5xx + network errors.
 *  - No retry on 4xx (caller bug) or 401 (revoked / mistyped token).
 *  - Pass-through return for 422 (semantic policy reject) and 404 (not found),
 *    so callers can decide.
 */
export class ServiceHttp {
  private current: ParsedToken;
  private readonly fetchImpl: typeof fetch;
  private readonly logger?: Logger;
  private readonly retries: RetryConfig;
  private readonly refreshWindowSec: number;
  private readonly onRefresh?: (t: ParsedToken) => void;
  private refreshPromise: Promise<ParsedToken> | null = null;

  constructor(private readonly opts: HttpOpts) {
    this.current = opts.token;
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.logger = opts.logger;
    this.retries = opts.retries ?? DEFAULT_RETRIES;
    this.refreshWindowSec = opts.refreshWindowSec ?? DEFAULT_REFRESH_WINDOW_SEC;
    this.onRefresh = opts.onTokenRefresh;
  }

  /** Current parsed token; updated automatically after refresh. */
  get token(): ParsedToken {
    return this.current;
  }

  get serviceUrl(): string {
    return this.opts.serviceUrl;
  }

  get<T>(path: string, init?: RequestInit): Promise<T> {
    return this.json<T>('GET', path, undefined, init);
  }
  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return this.json<T>('POST', path, body, init);
  }
  put<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return this.json<T>('PUT', path, body, init);
  }
  del<T>(path: string, init?: RequestInit): Promise<T> {
    return this.json<T>('DELETE', path, undefined, init);
  }

  /** Force a token refresh. Coalesces concurrent calls into a single network round-trip. */
  async refresh(): Promise<ParsedToken> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = (async () => {
      const url = `${this.opts.serviceUrl}/v1/auth/refresh`;
      const r = await this.fetchImpl(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${this.current.raw}` },
      });
      if (!r.ok) {
        throw new ReinError(
          r.status === 401 ? 'ErrUnauthorized' : 'ErrService',
          { status: r.status, path: '/v1/auth/refresh' },
        );
      }
      const body = (await r.json()) as { token: string };
      const next = parseToken(body.token);
      this.current = next;
      this.onRefresh?.(next);
      return next;
    })().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async json<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body: unknown | undefined,
    init: RequestInit | undefined,
  ): Promise<T> {
    // Skip auto-refresh for the refresh path itself to avoid recursion.
    if (
      path !== '/v1/auth/refresh' &&
      tokenNearingExpiry(this.current, this.refreshWindowSec)
    ) {
      try {
        await this.refresh();
      } catch (e) {
        this.logger?.warn('rein.refresh failed', redactToken(String(e)));
      }
    }

    const url = `${this.opts.serviceUrl}${path}`;
    let lastErr: unknown;

    for (let attempt = 0; attempt < this.retries.attempts; attempt++) {
      try {
        const headers: Record<string, string> = {
          ...(init?.headers as Record<string, string> | undefined),
          authorization: `Bearer ${this.current.raw}`,
        };
        if (body !== undefined) headers['content-type'] = 'application/json';

        const r = await this.fetchImpl(url, {
          ...init,
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        // 401 → revoked / bad token → caller-fix. Surface the worker's
        // `reason` ("unknown_kid" | "revoked" | "bad_sig" | "expired" | …)
        // in `details` so debug output isn't a black box.
        if (r.status === 401) {
          let detail: unknown;
          try { detail = await r.json(); } catch { /* body unreadable */ }
          throw new ReinError('ErrUnauthorized', { status: 401, path, detail });
        }
        // 5xx → server fault, retriable.
        if (r.status >= 500) {
          throw new ReinError('ErrService', { status: r.status, path });
        }
        // 4xx other than 422/404 → caller bug, no retry.
        if (r.status >= 400 && r.status !== 422 && r.status !== 404) {
          let detail: unknown;
          try { detail = await r.json(); } catch { detail = undefined; }
          throw new ReinError('ErrConfig', { status: r.status, path, detail });
        }

        // 200/201/204/404/422 — return body. Caller decides shape.
        const ct = r.headers.get('content-type') ?? '';
        if (r.status === 204) return undefined as unknown as T;
        if (ct.includes('application/json')) {
          return (await r.json()) as T;
        }
        return (await r.text()) as unknown as T;
      } catch (e) {
        lastErr = e;
        if (e instanceof ReinError) {
          // Hard errors — never retry.
          if (
            e.code === 'ErrUnauthorized' ||
            e.code === 'ErrConfig' ||
            e.code === 'ErrTokenInvalid' ||
            e.code === 'ErrTokenExpired'
          ) {
            throw e;
          }
        }
        // Otherwise retriable: ErrService, ErrRpc, ErrTimeout, raw network errors.
        if (attempt === this.retries.attempts - 1) break;
        const delay = this.retries.backoffMs * Math.pow(2, attempt);
        this.logger?.debug(
          `rein.http retry ${attempt + 1}/${this.retries.attempts} after ${delay}ms`,
          redactToken(String(e)),
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    if (lastErr instanceof Error) throw lastErr;
    throw new ReinError('ErrService', { lastErr });
  }
}

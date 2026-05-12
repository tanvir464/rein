import { describe, it, expect, vi } from 'vitest';

import { ServiceHttp, parseToken, ReinError } from '../../src';

function b64u(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function rawTok(opts: { exp?: number; kid?: string } = {}): string {
  const exp = opts.exp ?? Math.floor(Date.now() / 1000) + 3600;
  const payload = {
    vault: 'vault1',
    scopes: ['spend', 'read'],
    exp,
    nonce: 'n',
  };
  return `rein_dev_${opts.kid ?? '01abcdef'}.${b64u(JSON.stringify(payload))}.sig`;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('ServiceHttp — happy path', () => {
  it('attaches Bearer header on GET', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const http = new ServiceHttp({
      serviceUrl: 'http://api.test',
      token: parseToken(rawTok()),
      fetch: fetchMock as unknown as typeof fetch,
      retries: { attempts: 1, backoffMs: 1 },
    });
    const out = await http.get<{ ok: true }>('/v1/me');
    expect(out.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/v1/me');
    expect((init.headers as Record<string, string>).authorization).toMatch(/^Bearer rein_dev_/);
  });

  it('serializes JSON body and adds content-type on POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const http = new ServiceHttp({
      serviceUrl: 'http://api.test',
      token: parseToken(rawTok()),
      fetch: fetchMock as unknown as typeof fetch,
      retries: { attempts: 1, backoffMs: 1 },
    });
    await http.post('/v1/spend', { recipient: 'r', amount: '123' });
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe(JSON.stringify({ recipient: 'r', amount: '123' }));
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
  });

  it('returns body for 422 (semantic policy reject) without throwing', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: false, stage: 'simulate', reason: 'ErrPerTxCap' }, 422));
    const http = new ServiceHttp({
      serviceUrl: 'http://api.test',
      token: parseToken(rawTok()),
      fetch: fetchMock as unknown as typeof fetch,
      retries: { attempts: 1, backoffMs: 1 },
    });
    const out = await http.post<{ ok: false; reason: string }>('/v1/spend', {});
    expect(out.ok).toBe(false);
    expect(out.reason).toBe('ErrPerTxCap');
  });

  it('returns body for 404 (not found) without throwing', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'receipt not found' }, 404));
    const http = new ServiceHttp({
      serviceUrl: 'http://api.test',
      token: parseToken(rawTok()),
      fetch: fetchMock as unknown as typeof fetch,
      retries: { attempts: 1, backoffMs: 1 },
    });
    const out = await http.get<{ error: string }>('/v1/receipts/1');
    expect(out.error).toBe('receipt not found');
  });
});

describe('ServiceHttp — retry policy', () => {
  it('retries on 5xx, succeeds eventually', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('boom', { status: 500 }))
      .mockResolvedValueOnce(new Response('boom', { status: 502 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const http = new ServiceHttp({
      serviceUrl: 'http://api.test',
      token: parseToken(rawTok()),
      fetch: fetchMock as unknown as typeof fetch,
      retries: { attempts: 3, backoffMs: 1 },
    });
    const out = await http.get<{ ok: true }>('/v1/me');
    expect(out.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 401 — surfaces ErrUnauthorized', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('nope', { status: 401 }));
    const http = new ServiceHttp({
      serviceUrl: 'http://api.test',
      token: parseToken(rawTok()),
      fetch: fetchMock as unknown as typeof fetch,
      retries: { attempts: 3, backoffMs: 1 },
    });
    await expect(http.get('/v1/me')).rejects.toMatchObject({ code: 'ErrUnauthorized' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry on 400 — surfaces ErrConfig', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'bad input' }, 400));
    const http = new ServiceHttp({
      serviceUrl: 'http://api.test',
      token: parseToken(rawTok()),
      fetch: fetchMock as unknown as typeof fetch,
      retries: { attempts: 3, backoffMs: 1 },
    });
    await expect(http.post('/v1/spend', {})).rejects.toMatchObject({ code: 'ErrConfig' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('exhausts retries on persistent 5xx — surfaces ErrService', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('x', { status: 503 }));
    const http = new ServiceHttp({
      serviceUrl: 'http://api.test',
      token: parseToken(rawTok()),
      fetch: fetchMock as unknown as typeof fetch,
      retries: { attempts: 2, backoffMs: 1 },
    });
    await expect(http.get('/v1/me')).rejects.toBeInstanceOf(ReinError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on raw network error', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const http = new ServiceHttp({
      serviceUrl: 'http://api.test',
      token: parseToken(rawTok()),
      fetch: fetchMock as unknown as typeof fetch,
      retries: { attempts: 2, backoffMs: 1 },
    });
    const out = await http.get<{ ok: true }>('/v1/me');
    expect(out.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('ServiceHttp — token refresh', () => {
  it('proactively refreshes when token nears expiry', async () => {
    const expiringSoon = rawTok({ exp: Math.floor(Date.now() / 1000) + 30 });
    const fresh = rawTok({ exp: Math.floor(Date.now() / 1000) + 7200, kid: 'feedface' });
    const fetchMock = vi
      .fn()
      // First call: /v1/auth/refresh
      .mockResolvedValueOnce(jsonResponse({ token: fresh }))
      // Second call: actual /v1/me
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    let refreshedTo: string | undefined;
    const http = new ServiceHttp({
      serviceUrl: 'http://api.test',
      token: parseToken(expiringSoon),
      fetch: fetchMock as unknown as typeof fetch,
      retries: { attempts: 1, backoffMs: 1 },
      onTokenRefresh: (t) => {
        refreshedTo = t.kid;
      },
    });
    await http.get('/v1/me');
    expect(refreshedTo).toBe('feedface');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('/v1/auth/refresh');
  });

  it('coalesces concurrent refresh calls', async () => {
    const expiringSoon = rawTok({ exp: Math.floor(Date.now() / 1000) + 30 });
    const fresh = rawTok({ exp: Math.floor(Date.now() / 1000) + 7200 });
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/v1/auth/refresh')) {
        return new Promise<Response>((resolve) =>
          setTimeout(() => resolve(jsonResponse({ token: fresh })), 10),
        );
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });
    const http = new ServiceHttp({
      serviceUrl: 'http://api.test',
      token: parseToken(expiringSoon),
      fetch: fetchMock as unknown as typeof fetch,
      retries: { attempts: 1, backoffMs: 1 },
    });
    await Promise.all([http.refresh(), http.refresh(), http.refresh()]);
    const refreshCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/v1/auth/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it('does not auto-refresh when calling /v1/auth/refresh itself', async () => {
    const expiringSoon = rawTok({ exp: Math.floor(Date.now() / 1000) + 30 });
    const fresh = rawTok({ exp: Math.floor(Date.now() / 1000) + 7200 });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ token: fresh }));
    const http = new ServiceHttp({
      serviceUrl: 'http://api.test',
      token: parseToken(expiringSoon),
      fetch: fetchMock as unknown as typeof fetch,
      retries: { attempts: 1, backoffMs: 1 },
    });
    await http.refresh();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('health', () => {
  it('GET /health returns ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, service: 'rein' });
  });
});

import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('errors on missing required vars', () => {
    const r = loadConfig({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.missing).toEqual(['REIN_VAULT', 'REIN_TOKEN']);
      expect(r.message).toMatch(/missing required env vars/);
    }
  });

  it('errors on partial — only TOKEN missing', () => {
    const r = loadConfig({ REIN_VAULT: 'v' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toEqual(['REIN_TOKEN']);
  });

  it('parses required vars', () => {
    const r = loadConfig({ REIN_VAULT: 'v', REIN_TOKEN: 't' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.vault).toBe('v');
      expect(r.config.token).toBe('t');
      expect(r.config.logLevel).toBe('warn');
    }
  });

  it('parses optional vars', () => {
    const r = loadConfig({
      REIN_VAULT: 'v',
      REIN_TOKEN: 't',
      REIN_SERVICE_URL: 'http://x',
      REIN_RPC_URL: 'http://r',
      REIN_HELIUS_API_KEY: 'h',
      REIN_LOG_LEVEL: 'debug',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.serviceUrl).toBe('http://x');
      expect(r.config.rpcUrl).toBe('http://r');
      expect(r.config.heliusApiKey).toBe('h');
      expect(r.config.logLevel).toBe('debug');
    }
  });

  it('treats empty strings as missing', () => {
    const r = loadConfig({ REIN_VAULT: '', REIN_TOKEN: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toEqual(['REIN_VAULT', 'REIN_TOKEN']);
  });

  it('falls back to warn on bad logLevel', () => {
    const r = loadConfig({ REIN_VAULT: 'v', REIN_TOKEN: 't', REIN_LOG_LEVEL: 'verbose' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.config.logLevel).toBe('warn');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { initRuntime, buildEntry, formatReport } from '../src';

describe('buildEntry', () => {
  it('default command + args', () => {
    const e = buildEntry({ vault: 'V', token: 'T' });
    expect(e.command).toBe('npx');
    expect(e.args).toEqual(['-y', '@rein/mcp']);
    expect(e.env).toEqual({ REIN_VAULT: 'V', REIN_TOKEN: 'T' });
  });

  it('passes through optional env vars', () => {
    const e = buildEntry({
      vault: 'V',
      token: 'T',
      serviceUrl: 'http://x',
      rpcUrl: 'http://r',
      heliusApiKey: 'K',
      delegateKeypair: 'KP',
    });
    expect(e.env).toMatchObject({
      REIN_SERVICE_URL: 'http://x',
      REIN_RPC_URL: 'http://r',
      REIN_HELIUS_API_KEY: 'K',
      REIN_DELEGATE_KEYPAIR_BASE58: 'KP',
    });
  });
});

describe('initRuntime — file ops', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rein-cli-init-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates config when --config-path is supplied', () => {
    const configPath = join(dir, 'mcp.json');
    const r = initRuntime('cursor', { vault: 'V', token: 'T', configPath });
    expect(r.outcome).toBe('created');
    const parsed = JSON.parse(readFileSync(configPath, 'utf8'));
    expect(parsed.mcpServers.rein.env).toMatchObject({ REIN_VAULT: 'V', REIN_TOKEN: 'T' });
  });

  it('idempotent on repeat run', () => {
    const configPath = join(dir, 'mcp.json');
    initRuntime('cursor', { vault: 'V', token: 'T', configPath });
    const second = initRuntime('cursor', { vault: 'V', token: 'T', configPath });
    expect(second.outcome).toBe('unchanged');
  });

  it('reports collision when entry differs and --force not passed', () => {
    const configPath = join(dir, 'mcp.json');
    initRuntime('cursor', { vault: 'V1', token: 'T', configPath });
    const next = initRuntime('cursor', { vault: 'V2', token: 'T', configPath });
    expect(next.outcome).toBe('collision');
  });

  it('overwrites with --force', () => {
    const configPath = join(dir, 'mcp.json');
    initRuntime('cursor', { vault: 'V1', token: 'T', configPath });
    const next = initRuntime('cursor', {
      vault: 'V2',
      token: 'T',
      configPath,
      overwrite: true,
    });
    expect(next.outcome).toBe('updated');
    const parsed = JSON.parse(readFileSync(configPath, 'utf8'));
    expect(parsed.mcpServers.rein.env.REIN_VAULT).toBe('V2');
  });

  it('dry-run does not write', () => {
    const configPath = join(dir, 'mcp.json');
    const r = initRuntime('cursor', { vault: 'V', token: 'T', configPath, dryRun: true });
    expect(r.outcome).toBe('unchanged');
    expect(() => readFileSync(configPath)).toThrow();
  });
});

describe('formatReport', () => {
  it('returns a single-line summary', () => {
    const out = formatReport({
      runtime: 'cursor',
      configPath: '/x',
      outcome: 'created',
    });
    expect(out).toContain('cursor');
    expect(out).toContain('/x');
    expect(out).toContain('created');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { applyReinEntry, writeConfig, diffEntry, type ReinMcpEntry } from '../src';

const ENTRY: ReinMcpEntry = {
  command: 'npx',
  args: ['-y', '@rein/mcp'],
  env: { REIN_VAULT: 'V', REIN_TOKEN: 'T' },
};

describe('applyReinEntry', () => {
  it('adds when none exists', () => {
    const r = applyReinEntry(null, ENTRY);
    expect(r.collision).toBe(false);
    expect(r.identical).toBe(false);
    const out = (r.next['mcpServers'] as Record<string, unknown>)['rein'];
    expect(out).toEqual(ENTRY);
  });

  it('preserves other servers', () => {
    const r = applyReinEntry(
      { mcpServers: { other: { command: 'a', args: [], env: {} } } },
      ENTRY,
    );
    const servers = r.next['mcpServers'] as Record<string, unknown>;
    expect(servers['other']).toBeDefined();
    expect(servers['rein']).toEqual(ENTRY);
  });

  it('detects identical entry — no change', () => {
    const r = applyReinEntry({ mcpServers: { rein: ENTRY } }, ENTRY);
    expect(r.identical).toBe(true);
    expect(r.collision).toBe(false);
  });

  it('detects collision and refuses to overwrite without flag', () => {
    const prior = { ...ENTRY, env: { REIN_VAULT: 'OTHER', REIN_TOKEN: 'T' } };
    const r = applyReinEntry({ mcpServers: { rein: prior } }, ENTRY);
    expect(r.collision).toBe(true);
    expect(r.previous).toEqual(prior);
  });

  it('overwrites on collision when overwrite=true', () => {
    const prior = { ...ENTRY, env: { REIN_VAULT: 'OLD', REIN_TOKEN: 'OLD' } };
    const r = applyReinEntry({ mcpServers: { rein: prior } }, ENTRY, { overwrite: true });
    expect(r.collision).toBe(false);
    expect((r.next['mcpServers'] as Record<string, unknown>)['rein']).toEqual(ENTRY);
  });
});

describe('writeConfig', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rein-cli-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates a new config file when none exists', () => {
    const path = join(dir, 'sub', 'mcp.json');
    const r = writeConfig(path, ENTRY);
    expect(r.mode).toBe('created');
    expect(existsSync(path)).toBe(true);
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    expect(parsed.mcpServers.rein).toEqual(ENTRY);
  });

  it('updates existing file with backup', () => {
    const path = join(dir, 'mcp.json');
    writeFileSync(
      path,
      JSON.stringify({ mcpServers: { other: { command: 'a', args: [], env: {} } } }),
    );
    const r = writeConfig(path, ENTRY);
    expect(r.mode).toBe('created'); // file existed but rein entry didn't → backup made
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    expect(parsed.mcpServers.rein).toEqual(ENTRY);
    expect(parsed.mcpServers.other).toBeDefined();
  });

  it('refuses to overwrite a different rein entry without overwrite flag', () => {
    const path = join(dir, 'mcp.json');
    writeFileSync(
      path,
      JSON.stringify({
        mcpServers: { rein: { ...ENTRY, env: { REIN_VAULT: 'OLD', REIN_TOKEN: 'OLD' } } },
      }),
    );
    const r = writeConfig(path, ENTRY);
    expect(r.mode).toBe('unchanged');
  });

  it('overwrites with --force, leaves backup', () => {
    const path = join(dir, 'mcp.json');
    writeFileSync(
      path,
      JSON.stringify({
        mcpServers: { rein: { ...ENTRY, env: { REIN_VAULT: 'OLD', REIN_TOKEN: 'OLD' } } },
      }),
    );
    const r = writeConfig(path, ENTRY, { overwrite: true });
    expect(r.mode).toBe('updated');
    if (r.mode === 'updated') expect(existsSync(r.backupPath)).toBe(true);
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    expect(parsed.mcpServers.rein.env.REIN_VAULT).toBe('V');
  });

  it('idempotent — running twice with same value is unchanged the 2nd time', () => {
    const path = join(dir, 'mcp.json');
    expect(writeConfig(path, ENTRY).mode).toBe('created');
    const r2 = writeConfig(path, ENTRY);
    expect(r2.mode).toBe('unchanged');
  });

  it('survives invalid JSON gracefully (treats as empty)', () => {
    const path = join(dir, 'mcp.json');
    writeFileSync(path, 'not json');
    const r = writeConfig(path, ENTRY);
    // file existed, so we treat as a "create rein entry" which is "created" without backup-needed
    expect(r.mode).toBe('created');
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    expect(parsed.mcpServers.rein).toEqual(ENTRY);
  });
});

describe('diffEntry', () => {
  it('returns "(no change)" for equal entries', () => {
    expect(diffEntry(ENTRY, ENTRY)).toBe('(no change)');
  });

  it('renders previous + new for diff', () => {
    const out = diffEntry(undefined, ENTRY);
    expect(out).toContain('previous');
    expect(out).toContain('new');
    expect(out).toContain('REIN_VAULT');
  });
});

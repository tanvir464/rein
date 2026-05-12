import { describe, it, expect } from 'vitest';
import { resolveRuntime } from '../src/paths';

describe('resolveRuntime', () => {
  it('claude-code: ~/.claude.json on every platform', () => {
    const a = resolveRuntime('claude-code', 'darwin');
    const b = resolveRuntime('claude-code', 'linux');
    const c = resolveRuntime('claude-code', 'win32');
    expect(a.configPath).toMatch(/[/\\]\.claude\.json$/);
    expect(b.configPath).toMatch(/[/\\]\.claude\.json$/);
    expect(c.configPath).toMatch(/[/\\]\.claude\.json$/);
    expect(a.supported && b.supported && c.supported).toBe(true);
  });

  it('cursor: ~/.cursor/mcp.json', () => {
    const r = resolveRuntime('cursor');
    expect(r.configPath).toMatch(/[/\\]\.cursor[/\\]mcp\.json$/);
    expect(r.supported).toBe(true);
  });

  it('claude-desktop: macOS path', () => {
    const r = resolveRuntime('claude-desktop', 'darwin');
    expect(r.configPath).toMatch(
      /[/\\]Library[/\\]Application Support[/\\]Claude[/\\]claude_desktop_config\.json$/,
    );
    expect(r.supported).toBe(true);
  });

  it('claude-desktop: Windows path uses APPDATA when set', () => {
    const r = resolveRuntime('claude-desktop', 'win32');
    expect(r.configPath).toMatch(/Claude[/\\]claude_desktop_config\.json$/);
    expect(r.supported).toBe(true);
  });

  it('claude-desktop on Linux is not yet supported', () => {
    const r = resolveRuntime('claude-desktop', 'linux');
    expect(r.supported).toBe(false);
    expect(r.configPath).toContain('Claude');
  });
});

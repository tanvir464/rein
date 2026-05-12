import { homedir, platform } from 'node:os';
import { join } from 'node:path';

export type RuntimeId = 'claude-code' | 'cursor' | 'claude-desktop';

export type RuntimeDescriptor = {
  id: RuntimeId;
  displayName: string;
  configPath: string;
  /** Whether the config is expected to live on this platform at all. */
  supported: boolean;
};

const env = (k: string): string | undefined => process.env[k];

/**
 * Resolve the canonical MCP config path for each runtime on the current OS.
 * Mirrors the documented locations in each runtime's setup guide as of
 * 2026-05; pass `--config <path>` to override at install time.
 */
export function resolveRuntime(id: RuntimeId, plat: NodeJS.Platform = platform()): RuntimeDescriptor {
  const home = homedir();
  switch (id) {
    case 'claude-code':
      // Claude Code reads `~/.claude.json` on every platform.
      return {
        id,
        displayName: 'Claude Code',
        configPath: join(home, '.claude.json'),
        supported: true,
      };
    case 'cursor':
      return {
        id,
        displayName: 'Cursor',
        configPath: join(home, '.cursor', 'mcp.json'),
        supported: true,
      };
    case 'claude-desktop':
      if (plat === 'darwin') {
        return {
          id,
          displayName: 'Claude Desktop',
          configPath: join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
          supported: true,
        };
      }
      if (plat === 'win32') {
        const appData = env('APPDATA') ?? join(home, 'AppData', 'Roaming');
        return {
          id,
          displayName: 'Claude Desktop',
          configPath: join(appData, 'Claude', 'claude_desktop_config.json'),
          supported: true,
        };
      }
      // Linux: Claude Desktop is currently macOS/Windows only, but follow the
      // XDG convention if a Linux build appears.
      return {
        id,
        displayName: 'Claude Desktop',
        configPath: join(env('XDG_CONFIG_HOME') ?? join(home, '.config'), 'Claude', 'claude_desktop_config.json'),
        supported: false,
      };
  }
}

export const ALL_RUNTIMES: RuntimeId[] = ['claude-code', 'cursor', 'claude-desktop'];

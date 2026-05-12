import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const REIN_ENTRY_NAME = 'rein';

export type ReinMcpEntry = {
  command: string;
  args: string[];
  env: Record<string, string>;
};

export type EditMode = 'add' | 'overwrite' | 'skip';

export type EditResult =
  | { mode: 'created'; path: string; backupPath?: string }
  | { mode: 'updated'; path: string; backupPath: string; previous: ReinMcpEntry }
  | { mode: 'unchanged'; path: string; reason: 'exists-identical' | 'exists-skip' };

/**
 * Pure helper exposed for tests: takes an existing config object (or empty),
 * returns the new object with the rein entry merged in.
 *
 * Behaviour:
 *  - if no entry exists                  → add
 *  - if entry exists & equals our value  → no change
 *  - if entry exists & `overwrite`       → replace
 *  - if entry exists & not overwrite     → leave (caller decides UX)
 */
export function applyReinEntry(
  existing: Record<string, unknown> | null,
  entry: ReinMcpEntry,
  opts: { overwrite?: boolean } = {},
): {
  next: Record<string, unknown>;
  collision: boolean;
  identical: boolean;
  previous?: ReinMcpEntry;
} {
  const obj: Record<string, unknown> = existing ?? {};
  const servers = (obj['mcpServers'] && typeof obj['mcpServers'] === 'object'
    ? (obj['mcpServers'] as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const prior = servers[REIN_ENTRY_NAME] as ReinMcpEntry | undefined;
  const identical =
    !!prior &&
    prior.command === entry.command &&
    JSON.stringify(prior.args) === JSON.stringify(entry.args) &&
    JSON.stringify(prior.env) === JSON.stringify(entry.env);
  const collision = !!prior && !identical;

  if (collision && !opts.overwrite) {
    return { next: obj, collision: true, identical: false, previous: prior };
  }
  if (identical) {
    return { next: obj, collision: false, identical: true, previous: prior };
  }

  const nextServers = { ...servers, [REIN_ENTRY_NAME]: entry };
  const next = { ...obj, mcpServers: nextServers };
  return { next, collision: false, identical: false, previous: prior };
}

/**
 * Read-modify-write the config file. Always backs up before mutating, atomic
 * via temp-file + rename. Creates parent dirs if needed.
 */
export function writeConfig(
  path: string,
  entry: ReinMcpEntry,
  opts: { overwrite?: boolean } = {},
): EditResult {
  let existing: Record<string, unknown> | null = null;
  let raw: string | null = null;
  if (existsSync(path)) {
    raw = readFileSync(path, 'utf8');
    try {
      existing = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }
  const result = applyReinEntry(existing, entry, opts);
  if (result.identical) {
    return { mode: 'unchanged', path, reason: 'exists-identical' };
  }
  if (result.collision) {
    return { mode: 'unchanged', path, reason: 'exists-skip' };
  }

  let backupPath: string | undefined;
  if (raw !== null) {
    backupPath = `${path}.${Date.now()}.bak`;
    copyFileSync(path, backupPath);
  } else {
    mkdirSync(dirname(path), { recursive: true });
  }
  writeFileSync(path, JSON.stringify(result.next, null, 2) + '\n', 'utf8');

  if (raw === null) {
    return { mode: 'created', path };
  }
  if (result.previous) {
    return { mode: 'updated', path, backupPath: backupPath!, previous: result.previous };
  }
  return { mode: 'created', path, backupPath };
}

/**
 * Compute a unified-style diff of just the `mcpServers.rein` field. Used to
 * print a preview before writing in interactive mode.
 */
export function diffEntry(prev: ReinMcpEntry | undefined, next: ReinMcpEntry): string {
  const a = prev ? JSON.stringify(prev, null, 2) : '(none)';
  const b = JSON.stringify(next, null, 2);
  if (a === b) return '(no change)';
  return `--- previous\n${a}\n+++ new\n${b}`;
}

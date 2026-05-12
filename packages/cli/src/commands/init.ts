import pc from 'picocolors';

import { writeConfig, diffEntry, type ReinMcpEntry } from '../edit';
import { resolveRuntime, ALL_RUNTIMES, type RuntimeId } from '../paths';

export type InitOpts = {
  vault: string;
  token: string;
  serviceUrl?: string;
  rpcUrl?: string;
  heliusApiKey?: string;
  delegateKeypair?: string;
  command?: string;
  args?: string[];
  overwrite?: boolean;
  dryRun?: boolean;
  /** Override config path (otherwise resolved by runtime). */
  configPath?: string;
};

export function buildEntry(opts: InitOpts): ReinMcpEntry {
  const env: Record<string, string> = {
    REIN_VAULT: opts.vault,
    REIN_TOKEN: opts.token,
  };
  if (opts.serviceUrl) env['REIN_SERVICE_URL'] = opts.serviceUrl;
  if (opts.rpcUrl) env['REIN_RPC_URL'] = opts.rpcUrl;
  if (opts.heliusApiKey) env['REIN_HELIUS_API_KEY'] = opts.heliusApiKey;
  if (opts.delegateKeypair) env['REIN_DELEGATE_KEYPAIR_BASE58'] = opts.delegateKeypair;
  return {
    command: opts.command ?? 'npx',
    args: opts.args ?? ['-y', '@rein/mcp'],
    env,
  };
}

export type InitReport = {
  runtime: RuntimeId;
  configPath: string;
  outcome: 'created' | 'updated' | 'unchanged' | 'collision' | 'unsupported';
  detail?: string;
};

/** Apply the rein MCP entry to a single runtime. */
export function initRuntime(runtime: RuntimeId, opts: InitOpts): InitReport {
  const desc = resolveRuntime(runtime);
  if (!desc.supported) {
    return {
      runtime,
      configPath: desc.configPath,
      outcome: 'unsupported',
      detail: `${desc.displayName} is not supported on this OS yet`,
    };
  }
  const path = opts.configPath ?? desc.configPath;
  const entry = buildEntry(opts);
  if (opts.dryRun) {
    return {
      runtime,
      configPath: path,
      outcome: 'unchanged',
      detail: diffEntry(undefined, entry),
    };
  }
  const result = writeConfig(path, entry, { overwrite: opts.overwrite });
  if (result.mode === 'created') {
    return { runtime, configPath: path, outcome: 'created' };
  }
  if (result.mode === 'updated') {
    return {
      runtime,
      configPath: path,
      outcome: 'updated',
      detail: `backed up to ${result.backupPath}`,
    };
  }
  if (result.reason === 'exists-identical') {
    return { runtime, configPath: path, outcome: 'unchanged', detail: 'entry already up to date' };
  }
  return {
    runtime,
    configPath: path,
    outcome: 'collision',
    detail: 'existing entry differs; pass --force to overwrite',
  };
}

/** Init multiple runtimes (or all). Returns one report per runtime. */
export function initRuntimes(
  runtimes: RuntimeId[] | 'all',
  opts: InitOpts,
): InitReport[] {
  const list = runtimes === 'all' ? ALL_RUNTIMES : runtimes;
  return list.map((r) => initRuntime(r, opts));
}

/** Format a report for the terminal. */
export function formatReport(r: InitReport): string {
  const tag = (() => {
    switch (r.outcome) {
      case 'created':
        return pc.green('created');
      case 'updated':
        return pc.green('updated');
      case 'unchanged':
        return pc.dim('unchanged');
      case 'collision':
        return pc.yellow('collision');
      case 'unsupported':
        return pc.dim('unsupported');
    }
  })();
  return `${tag.padEnd(20)} ${r.runtime.padEnd(16)} ${pc.dim(r.configPath)}${
    r.detail ? `\n  ${r.detail}` : ''
  }`;
}

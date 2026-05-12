import { Command } from 'commander';
import pc from 'picocolors';

import { ALL_RUNTIMES, type RuntimeId } from './paths';
import { formatReport, initRuntime, initRuntimes, type InitOpts } from './commands/init';

export { initRuntime, initRuntimes, buildEntry, formatReport } from './commands/init';
export { resolveRuntime, ALL_RUNTIMES, type RuntimeId } from './paths';
export {
  applyReinEntry,
  writeConfig,
  diffEntry,
  type ReinMcpEntry,
  type EditResult,
} from './edit';

const VERSION = '0.1.0';

function readEnvFallback(name: string): string | undefined {
  return process.env[name] ?? undefined;
}

function buildInitCmd(): Command {
  return new Command('init')
    .description('Install REIN MCP server into one or more agent runtimes')
    .argument(
      '[runtime...]',
      `which runtime(s) to install: ${ALL_RUNTIMES.join(' / ')} / all`,
    )
    .option('--vault <pubkey>', 'vault PDA (base58); falls back to REIN_VAULT env')
    .option('--token <token>', 'runtime token; falls back to REIN_TOKEN env')
    .option('--service-url <url>')
    .option('--rpc-url <url>')
    .option('--helius-api-key <key>')
    .option('--delegate-keypair <base58>', 'delegate keypair for direct-mode signing')
    .option('--command <bin>', 'override the command (default: npx)')
    .option('--args <args...>', 'override the args (default: -y @rein/mcp)')
    .option('--config-path <path>', 'override config path (only valid with single runtime)')
    .option('--force', 'overwrite an existing rein entry without prompting')
    .option('--dry-run', 'show what would change without writing anything')
    .action(async (runtimes: string[], cliOpts: Record<string, unknown>) => {
      const vault = (cliOpts['vault'] as string) ?? readEnvFallback('REIN_VAULT');
      const token = (cliOpts['token'] as string) ?? readEnvFallback('REIN_TOKEN');
      if (!vault || !token) {
        process.stderr.write(
          pc.red('error:') +
            ' --vault and --token are required (or set REIN_VAULT and REIN_TOKEN env vars).\n',
        );
        process.exit(64);
      }

      const opts: InitOpts = {
        vault,
        token,
        serviceUrl: cliOpts['serviceUrl'] as string | undefined,
        rpcUrl: cliOpts['rpcUrl'] as string | undefined,
        heliusApiKey: cliOpts['heliusApiKey'] as string | undefined,
        delegateKeypair: cliOpts['delegateKeypair'] as string | undefined,
        command: cliOpts['command'] as string | undefined,
        args: cliOpts['args'] as string[] | undefined,
        overwrite: !!cliOpts['force'],
        dryRun: !!cliOpts['dryRun'],
        configPath: cliOpts['configPath'] as string | undefined,
      };

      const list: RuntimeId[] | 'all' = (() => {
        if (runtimes.length === 0 || runtimes.includes('all')) return 'all';
        const valid = ALL_RUNTIMES;
        for (const r of runtimes) {
          if (!valid.includes(r as RuntimeId)) {
            process.stderr.write(
              pc.red('error:') +
                ` unknown runtime "${r}". Valid: ${valid.join(', ')}\n`,
            );
            process.exit(64);
          }
        }
        return runtimes as RuntimeId[];
      })();

      if (opts.configPath && list !== 'all' && list.length !== 1) {
        process.stderr.write(
          pc.red('error:') + ' --config-path only valid when targeting one runtime\n',
        );
        process.exit(64);
      }

      const reports = list === 'all'
        ? initRuntimes('all', opts)
        : list.length === 1
          ? [initRuntime(list[0]!, opts)]
          : initRuntimes(list, opts);
      for (const r of reports) {
        process.stdout.write(formatReport(r) + '\n');
      }

      const collisions = reports.filter((r) => r.outcome === 'collision');
      if (collisions.length > 0 && !opts.dryRun) {
        process.stderr.write(
          '\n' +
            pc.yellow(
              `${collisions.length} collision(s) — re-run with --force to overwrite.\n`,
            ),
        );
        process.exit(1);
      }
    });
}

export function buildProgram(): Command {
  return new Command()
    .name('rein')
    .description('REIN — install / manage agent runtime bindings')
    .version(VERSION)
    .addCommand(buildInitCmd());
}

const isMain = typeof process !== 'undefined' && process.argv[1]?.endsWith('index.js');
if (isMain) {
  buildProgram().parseAsync(process.argv).catch((e) => {
    process.stderr.write(`rein: ${(e as Error)?.message ?? e}\n`);
    process.exit(1);
  });
}

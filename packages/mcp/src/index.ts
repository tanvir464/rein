import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DelegateSigner, Rein } from '@rein/sdk';

import { loadConfig } from './config';
import { createMcpServer } from './server';

export { createMcpServer, type McpDeps } from './server';
export { loadConfig, type ReinMcpConfig } from './config';

async function main(): Promise<void> {
  const r = loadConfig();
  if (!r.ok) {
    process.stderr.write(`${r.message}\n`);
    process.exit(64); // EX_USAGE
  }
  const { config } = r;

  // Optional delegate signer for `request_step_up` (direct-mode signing).
  let signer: DelegateSigner | undefined;
  if (config.delegateKeypairBase58) {
    try {
      const kp = Keypair.fromSecretKey(bs58.decode(config.delegateKeypairBase58));
      signer = new DelegateSigner(kp);
    } catch (e) {
      process.stderr.write(
        `@rein/mcp: REIN_DELEGATE_KEYPAIR_BASE58 is not a valid base58 keypair: ${(e as Error).message}\n`,
      );
      process.exit(64);
    }
  }

  const rein = new Rein({
    vault: config.vault,
    token: config.token,
    serviceUrl: config.serviceUrl,
    rpcUrl: config.rpcUrl,
    heliusApiKey: config.heliusApiKey,
    signer,
  });

  const server = createMcpServer({ rein });
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // No "ready" log line on stdout — that breaks the MCP transport. Use stderr.
  if (config.logLevel === 'debug' || config.logLevel === 'info') {
    process.stderr.write(
      `@rein/mcp: ready (vault=${config.vault}, env=${rein.token.env})\n`,
    );
  }
}

// Only auto-run when executed as a script — not when imported in tests.
const isMain = typeof process !== 'undefined' && process.argv[1]?.endsWith('index.js');
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`@rein/mcp: fatal: ${(e as Error)?.message ?? e}\n`);
    process.exit(1);
  });
}

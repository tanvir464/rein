/**
 * Read + validate the environment variables the MCP server needs.
 * Errors print one line to stderr with the full list of missing names; never
 * silently default to a partial config.
 */

export type ReinMcpConfig = {
  vault: string;
  token: string;
  serviceUrl?: string;
  rpcUrl?: string;
  heliusApiKey?: string;
  delegateKeypairBase58?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
};

export type LoadResult =
  | { ok: true; config: ReinMcpConfig }
  | { ok: false; missing: string[]; message: string };

const REQUIRED = ['REIN_VAULT', 'REIN_TOKEN'] as const;

function asLogLevel(v: string | undefined): ReinMcpConfig['logLevel'] {
  switch (v) {
    case 'debug':
    case 'info':
    case 'warn':
    case 'error':
      return v;
    default:
      return 'warn';
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): LoadResult {
  const missing = REQUIRED.filter((k) => !env[k] || env[k] === '');
  if (missing.length > 0) {
    const example = REQUIRED.map((k) => `${k}=…`).join(' ');
    return {
      ok: false,
      missing,
      message: `@rein/mcp: missing required env vars: ${missing.join(', ')}.\nUsage: ${example} npx @rein/mcp`,
    };
  }
  return {
    ok: true,
    config: {
      vault: env['REIN_VAULT']!,
      token: env['REIN_TOKEN']!,
      serviceUrl: env['REIN_SERVICE_URL'],
      rpcUrl: env['REIN_RPC_URL'],
      heliusApiKey: env['REIN_HELIUS_API_KEY'],
      delegateKeypairBase58: env['REIN_DELEGATE_KEYPAIR_BASE58'],
      logLevel: asLogLevel(env['REIN_LOG_LEVEL']),
    },
  };
}

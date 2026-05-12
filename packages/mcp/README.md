# @rein/mcp

REIN MCP server. Drop-in for Claude Code, Cursor, and Claude Desktop. Wraps `@rein/sdk` in four MCP tools:

| Tool | Purpose |
|---|---|
| `spend` | Pay an x402 endpoint, or transfer USDC to a recipient ATA. Bounded by the on-chain policy. |
| `balance` | Read the vault's USDC + SOL balance. |
| `history` | List recent receipts, newest first. |
| `request_step_up` | Open a step-up request for an over-threshold spend. |

## Quickstart

```bash
# Install (during the hackathon, via the local workspace)
npx @rein/cli init claude-code

# Or run directly
REIN_VAULT="<base58 vault PDA>" \
REIN_TOKEN="rein_devnet_<kid>.<payload>.<sig>" \
npx @rein/mcp
```

## Environment

| Var | Required | Notes |
|---|---|---|
| `REIN_VAULT` | yes | base58 vault PDA |
| `REIN_TOKEN` | yes | runtime token from `POST /v1/auth/issue` |
| `REIN_SERVICE_URL` | no | overrides env-default |
| `REIN_RPC_URL` | no | overrides cluster-default |
| `REIN_HELIUS_API_KEY` | no | preferred over public RPC |
| `REIN_DELEGATE_KEYPAIR_BASE58` | no | required for `request_step_up` |
| `REIN_LOG_LEVEL` | no | `debug` / `info` / `warn` (default) / `error` |

Missing required vars exit with status 64 (EX_USAGE) and a single stderr line listing the missing names.

## Spec

[specs/features/F17-mcp-server.md](../../specs/features/F17-mcp-server.md)

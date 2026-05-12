import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Claude Code & Cursor' };

function CodeBlock({ children, lang }: { children: React.ReactNode; lang?: string }) {
  return (
    <div style={{ background: '#0d1117', borderRadius: 12, padding: '20px 24px', marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 13.5, lineHeight: 1.85, overflowX: 'auto', position: 'relative' }}>
      {lang && <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 11, color: '#8b949e', fontFamily: 'var(--font-sans)' }}>{lang}</div>}
      <div style={{ color: '#e6edf3' }}>{children}</div>
    </div>
  );
}

function C({ children }: { children: React.ReactNode }) {
  return <code style={{ fontSize: 13, fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, padding: '1px 6px', color: 'var(--accent-700)' }}>{children}</code>;
}

export default function ClaudeCodePage() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)' }}>
          Integrations
        </span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>
        Claude Code & Cursor
      </h1>
      <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 580 }}>
        REIN ships as an MCP server. Claude Code, Cursor, and Claude Desktop pick it up automatically
        — no code changes required. Your agent gets <C>rein_spend</C>, <C>rein_balance</C>,{' '}
        <C>rein_history</C>, and <C>request_step_up</C> as native tools.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Install</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
        Run <C>rein init</C> in any directory. The CLI detects your runtime (Claude Code, Cursor, or Claude Desktop)
        and injects the MCP server config automatically.
      </p>
      <CodeBlock lang="bash">
        <span style={{ color: '#7ee787' }}>npx</span>{' '}<span style={{ color: '#e6edf3' }}>rein init</span>{'\n'}
        <span style={{ color: '#8b949e' }}># Detects Claude Code / Cursor / Claude Desktop automatically</span>{'\n'}
        <span style={{ color: '#8b949e' }}># Prompts for your vault address, writes .rein/config.json</span>
      </CodeBlock>

      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
        Or add the MCP server manually to your <C>claude_desktop_config.json</C> / <C>.cursor/mcp.json</C>:
      </p>
      <CodeBlock lang="json">
        <span style={{ color: '#79c0ff' }}>{'{'}</span>{'\n'}
        {'  '}<span style={{ color: '#d2a8ff' }}>"mcpServers"</span><span style={{ color: '#e6edf3' }}>: {'{'}</span>{'\n'}
        {'    '}<span style={{ color: '#d2a8ff' }}>"rein"</span><span style={{ color: '#e6edf3' }}>: {'{'}</span>{'\n'}
        {'      '}<span style={{ color: '#d2a8ff' }}>"command"</span><span style={{ color: '#e6edf3' }}>: </span><span style={{ color: '#a5d6ff' }}>"npx"</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        {'      '}<span style={{ color: '#d2a8ff' }}>"args"</span><span style={{ color: '#e6edf3' }}>: [</span><span style={{ color: '#a5d6ff' }}>"@rein/mcp"</span><span style={{ color: '#e6edf3' }}>],</span>{'\n'}
        {'      '}<span style={{ color: '#d2a8ff' }}>"env"</span><span style={{ color: '#e6edf3' }}>: {'{'}</span>{'\n'}
        {'        '}<span style={{ color: '#d2a8ff' }}>"REIN_VAULT"</span><span style={{ color: '#e6edf3' }}>: </span><span style={{ color: '#a5d6ff' }}>"YOUR_VAULT_ADDRESS"</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        {'        '}<span style={{ color: '#d2a8ff' }}>"REIN_NETWORK"</span><span style={{ color: '#e6edf3' }}>: </span><span style={{ color: '#a5d6ff' }}>"devnet"</span>{'\n'}
        {'      '}<span style={{ color: '#e6edf3' }}>{'}'}</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>{'}'}</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>{'}'}</span>{'\n'}
        <span style={{ color: '#79c0ff' }}>{'}'}</span>
      </CodeBlock>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Available MCP tools</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
        {[
          {
            tool: 'rein_spend',
            sig: 'rein_spend(recipient, amount_usdc, memo?)',
            desc: 'Submit a USDC payment. Checked against your Policy PDA on-chain. Returns a receipt on success or throws PolicyViolationError.',
          },
          {
            tool: 'rein_balance',
            sig: 'rein_balance()',
            desc: 'Returns current vault balance (USDC), daily spend so far, and remaining daily cap.',
          },
          {
            tool: 'rein_history',
            sig: 'rein_history(limit?, offset?)',
            desc: 'Returns paginated list of Receipt PDAs for this vault — each with amount, recipient hash, timestamp, and tx signature.',
          },
          {
            tool: 'request_step_up',
            sig: 'request_step_up(reason, amount_usdc)',
            desc: 'Explicitly request human approval for a high-value action. Creates a StepUpRequest PDA and sends push notification to the vault owner.',
          },
        ].map(({ tool, sig, desc }) => (
          <div key={tool} style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-700)', marginBottom: 6 }}>{sig}</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Example: agent paying for a search</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
        Claude will call <C>rein_spend</C> as part of its tool use. If the spend succeeds, it proceeds with the search result.
        If your policy rejects it (e.g. daily cap hit), Claude sees the error and can notify you.
      </p>
      <CodeBlock lang="Claude prompt">
        <span style={{ color: '#8b949e' }}>User: Research the latest AI agent frameworks and summarize.</span>{'\n\n'}
        <span style={{ color: '#7ee787' }}>Claude: I'll use rein_spend to pay for a Brave Search query...</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>{'>'} rein_spend("api.brave.com", 0.02, "web search")</span>{'\n'}
        <span style={{ color: '#7ee787' }}>✓ Receipt: 3vQW...aBc · $0.02 · api.brave.com</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>{'>'} brave_search("latest AI agent frameworks 2026")</span>{'\n'}
        <span style={{ color: '#8b949e' }}>... Claude continues with results</span>
      </CodeBlock>

      <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
        <Link href="/docs/api-reference/spend" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
          API reference <ArrowRight size={13} />
        </Link>
        <Link href="/docs/integrations/python" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 500, fontSize: 13, textDecoration: 'none' }}>
          Python SDK
        </Link>
      </div>
    </div>
  );
}

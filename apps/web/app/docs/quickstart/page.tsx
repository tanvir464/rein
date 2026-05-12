import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Quick start' };

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{ fontSize: 13, fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, padding: '1px 6px', color: 'var(--accent-700)' }}>
      {children}
    </code>
  );
}

function CodeBlock({ children, comment }: { children: React.ReactNode; comment?: string }) {
  return (
    <div style={{ background: '#0d1117', borderRadius: 12, padding: '20px 24px', marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 13.5, lineHeight: 2, overflowX: 'auto' }}>
      {comment && <div style={{ color: '#8b949e', marginBottom: 4 }}>{comment}</div>}
      <div style={{ color: '#e6edf3' }}>{children}</div>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 20, marginBottom: 40 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-700)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{n}</div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: '4px 0 14px', color: 'var(--fg)' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function QuickstartPage() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)' }}>
          Getting started
        </span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>
        Quick start
      </h1>
      <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 580 }}>
        Get REIN running with your AI agent in under 90 seconds.
        This guide covers Claude Code (MCP) — see the sidebar for other runtimes.
      </p>

      <Step n="01" title="Create a vault">
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
          Open the REIN dashboard and connect your Solana wallet. Click <strong>New vault</strong> — this
          writes a Policy PDA on Solana devnet and gives you a vault address.
        </p>
        <Link href="/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none', marginBottom: 16 }}>
          Open dashboard <ArrowRight size={13} />
        </Link>
      </Step>

      <Step n="02" title="Set your policy">
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
          In the policy editor, configure your spending rules. These are written to your Policy PDA — not stored in a database.
        </p>
        <CodeBlock comment="// Example policy (set in the dashboard UI)">
          <span style={{ color: '#79c0ff' }}>{'{'}</span>{'\n'}
          {'  '}<span style={{ color: '#d2a8ff' }}>"daily_cap_usdc"</span><span style={{ color: '#e6edf3' }}>: </span><span style={{ color: '#79c0ff' }}>50.00</span><span style={{ color: '#8b949e' }}>,  // max per UTC day</span>{'\n'}
          {'  '}<span style={{ color: '#d2a8ff' }}>"per_tx_cap_usdc"</span><span style={{ color: '#e6edf3' }}>: </span><span style={{ color: '#79c0ff' }}>5.00</span><span style={{ color: '#8b949e' }}>,   // max per transaction</span>{'\n'}
          {'  '}<span style={{ color: '#d2a8ff' }}>"step_up_threshold"</span><span style={{ color: '#e6edf3' }}>: </span><span style={{ color: '#79c0ff' }}>10.00</span><span style={{ color: '#8b949e' }}>, // pause &amp; notify above this</span>{'\n'}
          {'  '}<span style={{ color: '#d2a8ff' }}>"allowlist"</span><span style={{ color: '#e6edf3' }}>: [</span><span style={{ color: '#a5d6ff' }}>"api.brave.com"</span><span style={{ color: '#e6edf3' }}>, </span><span style={{ color: '#a5d6ff' }}>"api.anthropic.com"</span><span style={{ color: '#e6edf3' }}>]</span>{'\n'}
          <span style={{ color: '#79c0ff' }}>{'}'}</span>
        </CodeBlock>
      </Step>

      <Step n="03" title="Install the MCP server (Claude Code / Cursor)">
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
          Run <Code>rein init</Code> in your project root. It auto-detects your runtime and writes the MCP config.
        </p>
        <CodeBlock>
          <span style={{ color: '#7ee787' }}>npx</span>{' '}<span style={{ color: '#e6edf3' }}>rein init</span>
        </CodeBlock>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
          Paste your vault address when prompted. The CLI writes <Code>.rein/config.json</Code> and injects the MCP server into your Claude Code or Cursor settings.
        </p>
      </Step>

      <Step n="04" title="Make your first spend">
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
          Your agent now has access to <Code>rein_spend</Code>, <Code>rein_balance</Code>, and <Code>rein_history</Code> as MCP tools.
          For the TypeScript SDK:
        </p>
        <CodeBlock comment="// TypeScript SDK">
          <span style={{ color: '#ff7b72' }}>import</span>{' '}<span style={{ color: '#e6edf3' }}>{'{ ReinClient }'}</span>{' '}<span style={{ color: '#ff7b72' }}>from</span>{' '}<span style={{ color: '#a5d6ff' }}>'@rein/sdk'</span><span style={{ color: '#e6edf3' }}>;</span>{'\n\n'}
          <span style={{ color: '#ff7b72' }}>const</span>{' '}<span style={{ color: '#79c0ff' }}>rein</span>{' '}<span style={{ color: '#e6edf3' }}>= </span><span style={{ color: '#ff7b72' }}>new</span>{' '}<span style={{ color: '#d2a8ff' }}>ReinClient</span><span style={{ color: '#e6edf3' }}>({'{'}</span>{'\n'}
          {'  '}<span style={{ color: '#e6edf3' }}>vault: </span><span style={{ color: '#a5d6ff' }}>'YOUR_VAULT_ADDRESS'</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
          {'  '}<span style={{ color: '#e6edf3' }}>network: </span><span style={{ color: '#a5d6ff' }}>'devnet'</span>{'\n'}
          <span style={{ color: '#e6edf3' }}>{'}'});</span>{'\n\n'}
          <span style={{ color: '#8b949e' }}>// Enforced on-chain — will throw PolicyViolationError if rules fail</span>{'\n'}
          <span style={{ color: '#ff7b72' }}>const</span>{' '}<span style={{ color: '#79c0ff' }}>receipt</span>{' '}<span style={{ color: '#e6edf3' }}>= </span><span style={{ color: '#ff7b72' }}>await</span>{' '}<span style={{ color: '#79c0ff' }}>rein</span><span style={{ color: '#e6edf3' }}>.spend({'{'}</span>{'\n'}
          {'  '}<span style={{ color: '#e6edf3' }}>recipient: </span><span style={{ color: '#a5d6ff' }}>'api.brave.com'</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
          {'  '}<span style={{ color: '#e6edf3' }}>amount_usdc: </span><span style={{ color: '#79c0ff' }}>0.02</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
          {'  '}<span style={{ color: '#e6edf3' }}>memo: </span><span style={{ color: '#a5d6ff' }}>'web search'</span>{'\n'}
          <span style={{ color: '#e6edf3' }}>{'}'});</span>{'\n\n'}
          <span style={{ color: '#e6edf3' }}>console.log(receipt.signature); </span><span style={{ color: '#8b949e' }}>// Solana tx sig</span>
        </CodeBlock>
      </Step>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
        <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <CheckCircle2 size={15} color="var(--success)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>What happens on success</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
            Funds move. A Receipt PDA is created in the same transaction. Your dashboard updates in real time via WebSocket.
          </p>
        </div>
        <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <CheckCircle2 size={15} color="var(--danger)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>What happens on violation</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
            Transaction reverts. No funds move. The agent receives a typed <Code>PolicyViolationError</Code> with the specific rule that failed.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
        <Link href="/docs/integrations/claude-code" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
          Claude Code integration <ArrowRight size={13} />
        </Link>
        <Link href="/docs/integrations/python" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 500, fontSize: 13, textDecoration: 'none' }}>
          Python SDK
        </Link>
      </div>
    </div>
  );
}

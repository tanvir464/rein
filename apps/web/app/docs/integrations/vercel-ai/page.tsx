import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Vercel AI SDK' };

function C({ children }: { children: React.ReactNode }) {
  return <code style={{ fontSize: 13, fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, padding: '1px 6px', color: 'var(--accent-700)' }}>{children}</code>;
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#0d1117', borderRadius: 12, padding: '20px 24px', marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 13.5, lineHeight: 1.85, overflowX: 'auto' }}>
      <div style={{ color: '#e6edf3' }}>{children}</div>
    </div>
  );
}

export default function VercelAIPage() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)' }}>Integrations</span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>Vercel AI SDK</h1>
      <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 580 }}>
        Use REIN's Vercel AI SDK helpers to enforce spending policies inside <C>streamText</C>,{' '}
        <C>generateText</C>, and tool calls. Works with any AI SDK provider.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Install</h2>
      <CodeBlock>
        <span style={{ color: '#7ee787' }}>npm</span>{' '}<span style={{ color: '#e6edf3' }}>install @rein/sdk ai</span>
      </CodeBlock>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Usage with streamText</h2>
      <CodeBlock>
        <span style={{ color: '#ff7b72' }}>import</span>{' '}<span style={{ color: '#e6edf3' }}>{'{ ReinClient }'}</span>{' '}<span style={{ color: '#ff7b72' }}>from</span>{' '}<span style={{ color: '#a5d6ff' }}>'@rein/sdk'</span><span style={{ color: '#e6edf3' }}>;</span>{'\n'}
        <span style={{ color: '#ff7b72' }}>import</span>{' '}<span style={{ color: '#e6edf3' }}>{'{ streamText, tool }'}</span>{' '}<span style={{ color: '#ff7b72' }}>from</span>{' '}<span style={{ color: '#a5d6ff' }}>'ai'</span><span style={{ color: '#e6edf3' }}>;</span>{'\n\n'}
        <span style={{ color: '#ff7b72' }}>const</span>{' '}<span style={{ color: '#79c0ff' }}>rein</span>{' '}<span style={{ color: '#e6edf3' }}>= </span><span style={{ color: '#ff7b72' }}>new</span>{' '}<span style={{ color: '#d2a8ff' }}>ReinClient</span><span style={{ color: '#e6edf3' }}>({'{ vault: process.env.REIN_VAULT! }'});</span>{'\n\n'}
        <span style={{ color: '#ff7b72' }}>const</span>{' '}<span style={{ color: '#79c0ff' }}>result</span>{' '}<span style={{ color: '#e6edf3' }}>= </span><span style={{ color: '#ff7b72' }}>await</span>{' '}<span style={{ color: '#d2a8ff' }}>streamText</span><span style={{ color: '#e6edf3' }}>({'{'}</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>model,</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>tools: {'{'}</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>search: rein.aiTool({'{'}</span>{'\n'}
        {'      '}<span style={{ color: '#e6edf3' }}>recipient: </span><span style={{ color: '#a5d6ff' }}>'api.brave.com'</span><span style={{ color: '#e6edf3' }}>, cost_usdc: </span><span style={{ color: '#79c0ff' }}>0.02</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        {'      '}<span style={{ color: '#ff7b72' }}>async</span>{' '}<span style={{ color: '#d2a8ff' }}>execute</span><span style={{ color: '#e6edf3' }}>({'{ query }'}) {'{'} </span><span style={{ color: '#ff7b72' }}>return</span>{' '}<span style={{ color: '#e6edf3' }}>search(query); {'}'}</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>{'}'}</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>{'}'}</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>{'}'});</span>
      </CodeBlock>

      <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
        <Link href="/docs/api-reference/spend" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
          API reference <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

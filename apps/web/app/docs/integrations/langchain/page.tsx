import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'LangChain' };

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

export default function LangChainPage() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)' }}>Integrations</span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>LangChain</h1>
      <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 580 }}>
        REIN ships LangChain tool wrappers out of the box. Wrap any tool with <C>rein.tool()</C> to
        enforce your on-chain policy before every LLM-driven call.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Install</h2>
      <CodeBlock>
        <span style={{ color: '#7ee787' }}>npm</span>{' '}<span style={{ color: '#e6edf3' }}>install @rein/sdk langchain</span>
      </CodeBlock>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Tool wrapper</h2>
      <CodeBlock>
        <span style={{ color: '#ff7b72' }}>import</span>{' '}<span style={{ color: '#e6edf3' }}>{'{ ReinClient }'}</span>{' '}<span style={{ color: '#ff7b72' }}>from</span>{' '}<span style={{ color: '#a5d6ff' }}>'@rein/sdk'</span><span style={{ color: '#e6edf3' }}>;</span>{'\n'}
        <span style={{ color: '#ff7b72' }}>import</span>{' '}<span style={{ color: '#e6edf3' }}>{'{ DynamicTool }'}</span>{' '}<span style={{ color: '#ff7b72' }}>from</span>{' '}<span style={{ color: '#a5d6ff' }}>'langchain/tools'</span><span style={{ color: '#e6edf3' }}>;</span>{'\n\n'}
        <span style={{ color: '#ff7b72' }}>const</span>{' '}<span style={{ color: '#79c0ff' }}>rein</span>{' '}<span style={{ color: '#e6edf3' }}>= </span><span style={{ color: '#ff7b72' }}>new</span>{' '}<span style={{ color: '#d2a8ff' }}>ReinClient</span><span style={{ color: '#e6edf3' }}>({'{ vault: process.env.REIN_VAULT! }'});</span>{'\n\n'}
        <span style={{ color: '#ff7b72' }}>const</span>{' '}<span style={{ color: '#79c0ff' }}>searchTool</span>{' '}<span style={{ color: '#e6edf3' }}>= rein.langchainTool({'{'}</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>name: </span><span style={{ color: '#a5d6ff' }}>'brave_search'</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>recipient: </span><span style={{ color: '#a5d6ff' }}>'api.brave.com'</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>cost_usdc: </span><span style={{ color: '#79c0ff' }}>0.02</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        {'  '}<span style={{ color: '#ff7b72' }}>async</span>{' '}<span style={{ color: '#d2a8ff' }}>func</span><span style={{ color: '#e6edf3' }}>(query) {'{'} </span><span style={{ color: '#ff7b72' }}>return</span>{' '}<span style={{ color: '#e6edf3' }}>braveSearch(query); {'}'}</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>{'}'});</span>{'\n\n'}
        <span style={{ color: '#8b949e' }}>// Pass to your LangChain agent</span>{'\n'}
        <span style={{ color: '#ff7b72' }}>const</span>{' '}<span style={{ color: '#79c0ff' }}>agent</span>{' '}<span style={{ color: '#e6edf3' }}>= initializeAgentExecutorWithOptions(tools, llm, {'{ agentType: "openai-functions" }'});</span>
      </CodeBlock>

      <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
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

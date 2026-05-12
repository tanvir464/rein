import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Python SDK' };

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

export default function PythonPage() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)' }}>
          Integrations
        </span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>
        Python SDK
      </h1>
      <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 580 }}>
        The REIN Python SDK works with CrewAI, LangGraph, AutoGen, and any Python-based agent framework.
        Install once, wrap your spend calls, and every transaction is enforced on-chain.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Install</h2>
      <CodeBlock lang="bash">
        <span style={{ color: '#7ee787' }}>pip</span>{' '}<span style={{ color: '#e6edf3' }}>install rein</span>
      </CodeBlock>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Basic usage</h2>
      <CodeBlock lang="python">
        <span style={{ color: '#ff7b72' }}>from</span>{' '}<span style={{ color: '#e6edf3' }}>rein </span><span style={{ color: '#ff7b72' }}>import</span>{' '}<span style={{ color: '#e6edf3' }}>ReinClient, PolicyViolationError</span>{'\n\n'}
        <span style={{ color: '#e6edf3' }}>rein = ReinClient(</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>vault=</span><span style={{ color: '#a5d6ff' }}>"YOUR_VAULT_ADDRESS"</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>network=</span><span style={{ color: '#a5d6ff' }}>"devnet"</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>)</span>{'\n\n'}
        <span style={{ color: '#ff7b72' }}>try</span><span style={{ color: '#e6edf3' }}>:</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>receipt = rein.spend(</span>{'\n'}
        {'        '}<span style={{ color: '#e6edf3' }}>recipient=</span><span style={{ color: '#a5d6ff' }}>"api.openai.com"</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        {'        '}<span style={{ color: '#e6edf3' }}>amount_usdc=</span><span style={{ color: '#79c0ff' }}>1.20</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        {'        '}<span style={{ color: '#e6edf3' }}>memo=</span><span style={{ color: '#a5d6ff' }}>"GPT-4o research task"</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>)</span>{'\n'}
        {'    '}<span style={{ color: '#79c0ff' }}>print</span><span style={{ color: '#e6edf3' }}>(</span><span style={{ color: '#a5d6ff' }}>f"Paid: </span><span style={{ color: '#79c0ff' }}>{'{'}receipt.signature{'}'}</span><span style={{ color: '#a5d6ff' }}>"</span><span style={{ color: '#e6edf3' }}>)</span>{'\n'}
        <span style={{ color: '#ff7b72' }}>except</span>{' '}<span style={{ color: '#e6edf3' }}>PolicyViolationError </span><span style={{ color: '#ff7b72' }}>as</span>{' '}<span style={{ color: '#e6edf3' }}>e:</span>{'\n'}
        {'    '}<span style={{ color: '#79c0ff' }}>print</span><span style={{ color: '#e6edf3' }}>(</span><span style={{ color: '#a5d6ff' }}>f"Blocked: </span><span style={{ color: '#79c0ff' }}>{'{'}e.rule{'}'}</span><span style={{ color: '#a5d6ff' }}> — </span><span style={{ color: '#79c0ff' }}>{'{'}e.message{'}'}</span><span style={{ color: '#a5d6ff' }}>"</span><span style={{ color: '#e6edf3' }}>)</span>
      </CodeBlock>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>CrewAI integration</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
        Wrap any CrewAI tool with <C>rein.tool()</C> to automatically enforce your policy before execution.
      </p>
      <CodeBlock lang="python">
        <span style={{ color: '#ff7b72' }}>from</span>{' '}<span style={{ color: '#e6edf3' }}>crewai </span><span style={{ color: '#ff7b72' }}>import</span>{' '}<span style={{ color: '#e6edf3' }}>Agent, Task, Crew</span>{'\n'}
        <span style={{ color: '#ff7b72' }}>from</span>{' '}<span style={{ color: '#e6edf3' }}>rein </span><span style={{ color: '#ff7b72' }}>import</span>{' '}<span style={{ color: '#e6edf3' }}>ReinClient</span>{'\n\n'}
        <span style={{ color: '#e6edf3' }}>rein = ReinClient(vault=</span><span style={{ color: '#a5d6ff' }}>"YOUR_VAULT_ADDRESS"</span><span style={{ color: '#e6edf3' }}>)</span>{'\n\n'}
        <span style={{ color: '#8b949e' }}># Wrap a tool — REIN checks policy before each call</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>@rein.tool(recipient=</span><span style={{ color: '#a5d6ff' }}>"api.brave.com"</span><span style={{ color: '#e6edf3' }}>, cost_usdc=</span><span style={{ color: '#79c0ff' }}>0.02</span><span style={{ color: '#e6edf3' }}>)</span>{'\n'}
        <span style={{ color: '#ff7b72' }}>def</span>{' '}<span style={{ color: '#d2a8ff' }}>brave_search</span><span style={{ color: '#e6edf3' }}>(query):</span>{'\n'}
        {'    '}<span style={{ color: '#8b949e' }}># Your actual search logic here</span>{'\n'}
        {'    '}<span style={{ color: '#ff7b72' }}>return</span>{' '}<span style={{ color: '#e6edf3' }}>search_api(query)</span>{'\n\n'}
        <span style={{ color: '#e6edf3' }}>researcher = Agent(</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>role=</span><span style={{ color: '#a5d6ff' }}>"Research Analyst"</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>tools=[brave_search],  </span><span style={{ color: '#8b949e' }}># REIN-wrapped tool</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>...</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>)</span>
      </CodeBlock>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>LangGraph integration</h2>
      <CodeBlock lang="python">
        <span style={{ color: '#ff7b72' }}>from</span>{' '}<span style={{ color: '#e6edf3' }}>langgraph.graph </span><span style={{ color: '#ff7b72' }}>import</span>{' '}<span style={{ color: '#e6edf3' }}>StateGraph</span>{'\n'}
        <span style={{ color: '#ff7b72' }}>from</span>{' '}<span style={{ color: '#e6edf3' }}>rein </span><span style={{ color: '#ff7b72' }}>import</span>{' '}<span style={{ color: '#e6edf3' }}>ReinClient</span>{'\n\n'}
        <span style={{ color: '#e6edf3' }}>rein = ReinClient(vault=</span><span style={{ color: '#a5d6ff' }}>"YOUR_VAULT_ADDRESS"</span><span style={{ color: '#e6edf3' }}>)</span>{'\n\n'}
        <span style={{ color: '#ff7b72' }}>async def</span>{' '}<span style={{ color: '#d2a8ff' }}>call_api_node</span><span style={{ color: '#e6edf3' }}>(state):</span>{'\n'}
        {'    '}<span style={{ color: '#8b949e' }}># REIN enforces policy before any spend</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>receipt = </span><span style={{ color: '#ff7b72' }}>await</span>{' '}<span style={{ color: '#e6edf3' }}>rein.spend_async(</span>{'\n'}
        {'        '}<span style={{ color: '#e6edf3' }}>recipient=</span><span style={{ color: '#a5d6ff' }}>"api.anthropic.com"</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        {'        '}<span style={{ color: '#e6edf3' }}>amount_usdc=state[</span><span style={{ color: '#a5d6ff' }}>"estimated_cost"</span><span style={{ color: '#e6edf3' }}>]</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>)</span>{'\n'}
        {'    '}<span style={{ color: '#ff7b72' }}>return</span>{' '}<span style={{ color: '#e6edf3' }}>{'{'}**state, </span><span style={{ color: '#a5d6ff' }}>"receipt"</span><span style={{ color: '#e6edf3' }}>: receipt.signature{'}'}</span>
      </CodeBlock>

      <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
        <Link href="/docs/api-reference/spend" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
          API reference <ArrowRight size={13} />
        </Link>
        <Link href="/docs/quickstart" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 500, fontSize: 13, textDecoration: 'none' }}>
          Quick start
        </Link>
      </div>
    </div>
  );
}

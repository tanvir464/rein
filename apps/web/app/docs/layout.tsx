import Link from 'next/link';
import { LandingNav } from '../../components/landing-nav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { template: '%s — REIN Docs', default: 'Docs — REIN' },
};

const NAV = [
  {
    group: 'Getting started',
    items: [
      { label: 'Introduction', href: '/docs' },
      { label: 'Quick start', href: '/docs/quickstart' },
    ],
  },
  {
    group: 'Integrations',
    items: [
      { label: 'Claude Code / Cursor', href: '/docs/integrations/claude-code' },
      { label: 'Python (CrewAI / LangGraph)', href: '/docs/integrations/python' },
      { label: 'LangChain', href: '/docs/integrations/langchain' },
      { label: 'Vercel AI SDK', href: '/docs/integrations/vercel-ai' },
    ],
  },
  {
    group: 'API reference',
    items: [
      { label: 'rein_spend', href: '/docs/api-reference/spend' },
      { label: 'rein_balance', href: '/docs/api-reference/balance' },
      { label: 'rein_history', href: '/docs/api-reference/history' },
      { label: 'request_step_up', href: '/docs/api-reference/step-up' },
    ],
  },
  {
    group: 'Concepts',
    items: [
      { label: 'Policy PDA', href: '/docs/concepts/policy-pda' },
      { label: 'Receipt PDA', href: '/docs/concepts/receipt-pda' },
      { label: 'Step-up auth', href: '/docs/concepts/step-up' },
      { label: 'Key broker', href: '/docs/concepts/key-broker' },
    ],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <LandingNav />
      <div style={{ flex: 1, display: 'flex', maxWidth: 1200, margin: '0 auto', width: '100%', padding: '0 24px' }}>
        {/* Sidebar */}
        <aside style={{
          width: 220,
          flexShrink: 0,
          paddingTop: 40,
          paddingRight: 24,
          paddingBottom: 40,
          position: 'sticky',
          top: 'var(--header-height)',
          height: 'calc(100vh - var(--header-height))',
          overflowY: 'auto',
          borderRight: '1px solid var(--border)',
        }}>
          {NAV.map(({ group, items }) => (
            <div key={group} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>
                {group}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {items.map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    style={{ fontSize: 13.5, padding: '5px 10px', borderRadius: 7, color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.09s, background 0.09s' }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Content */}
        <main style={{ flex: 1, minWidth: 0, padding: '40px 0 80px 48px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

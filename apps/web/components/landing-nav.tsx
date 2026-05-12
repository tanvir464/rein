'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowRight, ChevronDown, ExternalLink } from 'lucide-react';
import { ReinMark, ReinWordmark } from './rein-mark';
import { ThemeToggle } from './theme-toggle';
import { ClaudeCodeLogo, CursorLogo, LangChainLogo, OpenAILogo, VercelAILogo, PythonLogo, CrewAILogo } from './runtime-logos';

/* ─── dropdown data ──────────────────────────────────────────────────────── */

const PRODUCT_ITEMS = [
  {
    title: 'Vault & Policies',
    desc: 'On-chain spending rules your agent cannot bypass.',
    cta: 'Set policies →',
    href: '/features/policies',
    preview: (
      <div style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.8, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ color: 'var(--muted)' }}>{'{'}</div>
        <div><span style={{ color: 'var(--accent-700)' }}>"daily_cap":</span><span style={{ color: 'var(--fg)' }}> 50.00,</span></div>
        <div><span style={{ color: 'var(--accent-700)' }}>"per_tx":</span><span style={{ color: 'var(--fg)' }}> 5.00,</span></div>
        <div><span style={{ color: 'var(--accent-700)', background: 'var(--accent-100)', borderRadius: 3, padding: '0 3px' }}>"step_up":</span><span style={{ color: 'var(--fg)' }}> 10.00</span></div>
        <div style={{ color: 'var(--muted)' }}>{'}'}</div>
      </div>
    ),
  },
  {
    title: 'Activity Feed',
    desc: 'Real-time on-chain receipts for every agent payment.',
    cta: 'See live feed →',
    href: '/features/activity',
    preview: (
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 5, height: '100%', justifyContent: 'center' }}>
        {[
          { l: 'Perplexity · search', a: '$0.03', hot: true },
          { l: 'Anthropic · Claude', a: '$1.20', hot: false },
          { l: 'Brave Search', a: '$0.02', hot: false },
        ].map((r) => (
          <div key={r.l} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 7, background: r.hot ? 'var(--accent-100)' : 'var(--bg)', border: `1px solid ${r.hot ? 'var(--accent-300)' : 'var(--border)'}`, fontSize: 11 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--fg)', fontWeight: r.hot ? 500 : 400 }}>{r.l}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: r.hot ? 'var(--accent-700)' : 'var(--fg)', fontWeight: 600 }}>{r.a}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Step-up Auth',
    desc: 'Push notifications for high-value agent transactions.',
    cta: 'Learn more →',
    href: '/features/step-up',
    preview: (
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8, height: '100%', justifyContent: 'center' }}>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', marginBottom: 3 }}>Step-up required</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>Agent wants to pay <strong style={{ color: 'var(--fg)' }}>$47</strong> to expedia.com</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, height: 24, borderRadius: 6, background: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#fff' }}>Approve</div>
            <div style={{ flex: 1, height: 24, borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--muted)' }}>Deny</div>
          </div>
        </div>
        <div style={{ background: 'var(--tone-success-bg)', border: '1px solid var(--success)', borderRadius: 8, padding: '7px 10px', fontSize: 10, color: 'var(--success)', fontWeight: 600 }}>
          ✓ Approved — $47.00 sent
        </div>
      </div>
    ),
  },
  {
    title: 'Spend Insights',
    desc: 'Cost-per-task analytics and anomaly detection.',
    cta: 'View analytics →',
    href: '/features/insights',
    preview: (
      <div style={{ padding: '14px 16px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
        {[
          { name: 'Claude API', pct: 78 },
          { name: 'Brave Search', pct: 12 },
          { name: 'Perplexity', pct: 7 },
        ].map((r) => (
          <div key={r.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10, color: 'var(--fg)', fontWeight: 500 }}>
              <span>{r.name}</span><span style={{ color: 'var(--muted)' }}>{r.pct}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: 'var(--bg-elevated)' }}>
              <div style={{ height: '100%', width: `${r.pct}%`, background: 'var(--accent-700)', borderRadius: 999 }} />
            </div>
          </div>
        ))}
        <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600, marginTop: 2 }}>Cost/task: $0.18 · Saved 34%</div>
      </div>
    ),
  },
];

const RUNTIME_ITEMS = [
  { Logo: ClaudeCodeLogo, name: 'Claude Code', pkg: '@rein/mcp', href: '/#install' },
  { Logo: CursorLogo, name: 'Cursor', pkg: '@rein/mcp', href: '/#install' },
  { Logo: LangChainLogo, name: 'LangChain', pkg: '@rein/langchain', href: '/#install' },
  { Logo: OpenAILogo, name: 'OpenAI Functions', pkg: '@rein/openai', href: '/#install' },
  { Logo: VercelAILogo, name: 'Vercel AI SDK', pkg: '@rein/ai', href: '/#install' },
  { Logo: CrewAILogo, name: 'CrewAI', pkg: 'pip install rein', href: '/#install' },
  { Logo: PythonLogo, name: 'Python', pkg: 'pip install rein', href: '/#install' },
];

const DEV_ITEMS = [
  { title: 'Quick start', desc: 'Zero to vault in 90 seconds', href: '/docs/quickstart', external: false },
  { title: 'MCP tools reference', desc: 'rein_spend, rein_balance, and more', href: '/docs/integrations/claude-code', external: false },
  { title: 'TypeScript SDK', desc: '@rein/sdk API reference', href: '/docs', external: false },
  { title: 'Python SDK', desc: 'pip install rein — CrewAI, AutoGen', href: '/docs/integrations/python', external: false },
  { title: 'API reference', desc: 'REST endpoints, webhooks, receipts', href: '/docs/api-reference/spend', external: false },
  { title: 'GitHub', desc: 'Source, issues, PRs', href: 'https://github.com/tanvir464/rein', external: true },
];

/* ─── dropdown shell ─────────────────────────────────────────────────────── */

type DropdownProps = {
  children: React.ReactNode;
  label: string;
  id: string;
  align?: 'left' | 'center' | 'right';
  isOpen: boolean;
  onOpen: (id: string) => void;
  onClose: () => void;
  onCancelClose: () => void;
};

function Dropdown({ children, label, id, align = 'center', isOpen, onOpen, onClose, onCancelClose }: DropdownProps) {
  const positionStyle = align === 'left'
    ? { left: 0 }
    : align === 'right'
    ? { right: 0 }
    : { left: '50%', transform: 'translateX(-50%)' };

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => onOpen(id)}
      onMouseLeave={onClose}
    >
      <button
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 14,
          fontWeight: 500,
          padding: '6px 10px',
          borderRadius: 8,
          color: isOpen ? 'var(--fg)' : 'var(--muted)',
          background: isOpen ? 'var(--bg-elevated)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'color 0.09s ease, background 0.09s ease',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        <ChevronDown size={13} style={{ transition: 'transform 0.15s ease', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        // Two nested divs by design: the OUTER owns the positioning transform
        // (`translateX(-50%)` for center align), the INNER owns the entry
        // animation (translateY + opacity). If both lived on the same div, the
        // animation's `transform` would override the inline `translateX(-50%)`
        // and the dropdown would visibly snap into centered position when the
        // animation ended.
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            ...positionStyle,
            zIndex: 100,
            minWidth: 240,
          }}
          onMouseEnter={onCancelClose}
          onMouseLeave={onClose}
          onClick={() => onOpen('')}
        >
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
              animation: 'fade-in 0.12s ease',
            }}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── main nav ───────────────────────────────────────────────────────────── */

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string>('');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openDropdown = (id: string) => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setActiveDropdown(id);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setActiveDropdown(''), 150);
  };
  const cancelClose = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const close = () => { if (mq.matches) setMobileOpen(false); };
    mq.addEventListener('change', close);
    return () => mq.removeEventListener('change', close);
  }, []);

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          height: 'var(--header-height)',
          background: scrolled ? 'color-mix(in oklab, var(--bg) 92%, transparent)' : 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
          transition: 'background 0.2s ease, box-shadow 0.2s ease',
          boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <div
          style={{
            maxWidth: 'var(--container)',
            margin: '0 auto',
            height: '100%',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 0,
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0, marginRight: 24 }}>
            <ReinMark size={24} />
            <ReinWordmark size={15} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden-mobile" style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            {/* Product dropdown — RevenueCat style tall cards */}
            <Dropdown label="Product" id="product" align="left" isOpen={activeDropdown === 'product'} onOpen={openDropdown} onClose={scheduleClose} onCancelClose={cancelClose}>
              <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, width: 720 }}>
                {PRODUCT_ITEMS.map(({ title, desc, cta, href, preview }) => (
                  <Link
                    key={title}
                    href={href}
                    style={{ display: 'flex', flexDirection: 'column', borderRadius: 12, textDecoration: 'none', border: '1px solid var(--border)', overflow: 'hidden', transition: 'border-color 0.12s ease, box-shadow 0.12s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-300)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {/* Preview image area */}
                    <div style={{ height: 140, background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', overflow: 'hidden' }}>
                      {preview}
                    </div>
                    {/* Text area */}
                    <div style={{ padding: '12px 14px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>{title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 10 }}>{desc}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-700)' }}>{cta}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </Dropdown>

            {/* Runtimes dropdown */}
            <Dropdown label="Runtimes" id="runtimes" isOpen={activeDropdown === 'runtimes'} onOpen={openDropdown} onClose={scheduleClose} onCancelClose={cancelClose}>
              <div style={{ padding: '8px', width: 380 }}>
                <div style={{ padding: '6px 8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                  Supported runtimes
                </div>
                {RUNTIME_ITEMS.map(({ Logo, name, pkg, href }) => (
                  <Link
                    key={name}
                    href={href}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, textDecoration: 'none', transition: 'background 0.09s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Logo size={20} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{name}</span>
                    <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-700)', background: 'var(--accent-100)', padding: '2px 7px', borderRadius: 5 }}>{pkg}</code>
                  </Link>
                ))}
              </div>
            </Dropdown>

            {/* Developers dropdown */}
            <Dropdown label="Developers" id="developers" isOpen={activeDropdown === 'developers'} onOpen={openDropdown} onClose={scheduleClose} onCancelClose={cancelClose}>
              <div style={{ padding: '8px', width: 300 }}>
                {DEV_ITEMS.map(({ title, desc, href, external }) => (
                  <a
                    key={title}
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '10px 10px', borderRadius: 8, textDecoration: 'none', transition: 'background 0.09s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 1 }}>{title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{desc}</div>
                    </div>
                    {external && <ExternalLink size={12} color="var(--muted)" style={{ flexShrink: 0, marginTop: 3 }} />}
                  </a>
                ))}
              </div>
            </Dropdown>

            <Link href="/#pricing" style={{ fontSize: 14, fontWeight: 500, padding: '6px 10px', borderRadius: 8, color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.09s ease, background 0.09s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent'; }}
            >
              Pricing
            </Link>
            <Link href="/roadmap" style={{ fontSize: 14, fontWeight: 500, padding: '6px 10px', borderRadius: 8, color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.09s ease, background 0.09s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent'; }}
            >
              Roadmap
            </Link>
            <Link href="/investors" style={{ fontSize: 14, fontWeight: 500, padding: '6px 10px', borderRadius: 8, color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.09s ease, background 0.09s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent'; }}
            >
              Investors
            </Link>
          </nav>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <ThemeToggle />

            <Link href="/login" className="hidden-mobile" style={{ fontSize: 14, fontWeight: 500, padding: '6px 14px', borderRadius: 8, color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.09s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
            >
              Sign in
            </Link>

            <Link href="/onboarding" className="hidden-mobile" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', fontSize: 14, fontWeight: 600, borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'filter 0.09s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.85)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
            >
              Get started <ArrowRight size={13} />
            </Link>

            {/* Hamburger — mobile */}
            <button
              className="show-mobile"
              style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }} />
          <nav style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 41, width: 280, background: 'var(--bg)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '80px 16px 32px', overflowY: 'auto', gap: 4 }}>
            {/* Product section */}
            <button onClick={() => setMobileSection(s => s === 'product' ? null : 'product')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 15, fontWeight: 600, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--fg)', cursor: 'pointer', width: '100%' }}>
              Product <ChevronDown size={14} style={{ transform: mobileSection === 'product' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {mobileSection === 'product' && PRODUCT_ITEMS.map(({ title, href }) => (
              <Link key={title} href={href} onClick={() => setMobileOpen(false)} style={{ fontSize: 14, padding: '8px 12px 8px 24px', borderRadius: 8, color: 'var(--muted)', textDecoration: 'none' }}>{title}</Link>
            ))}

            {/* Runtimes section */}
            <button onClick={() => setMobileSection(s => s === 'runtimes' ? null : 'runtimes')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 15, fontWeight: 600, padding: '10px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--fg)', cursor: 'pointer', width: '100%' }}>
              Runtimes <ChevronDown size={14} style={{ transform: mobileSection === 'runtimes' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {mobileSection === 'runtimes' && RUNTIME_ITEMS.map(({ name, href }) => (
              <Link key={name} href={href} onClick={() => setMobileOpen(false)} style={{ fontSize: 14, padding: '8px 12px 8px 24px', borderRadius: 8, color: 'var(--muted)', textDecoration: 'none' }}>{name}</Link>
            ))}

            <Link href="/#pricing" onClick={() => setMobileOpen(false)} style={{ fontSize: 15, fontWeight: 500, padding: '10px 12px', borderRadius: 8, color: 'var(--muted)', textDecoration: 'none' }}>Pricing</Link>
            <Link href="/roadmap" onClick={() => setMobileOpen(false)} style={{ fontSize: 15, fontWeight: 500, padding: '10px 12px', borderRadius: 8, color: 'var(--muted)', textDecoration: 'none' }}>Roadmap</Link>
            <Link href="/docs" onClick={() => setMobileOpen(false)} style={{ fontSize: 15, fontWeight: 500, padding: '10px 12px', borderRadius: 8, color: 'var(--muted)', textDecoration: 'none' }}>Docs</Link>
            <Link href="/investors" onClick={() => setMobileOpen(false)} style={{ fontSize: 15, fontWeight: 500, padding: '10px 12px', borderRadius: 8, color: 'var(--muted)', textDecoration: 'none' }}>Investors</Link>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/login" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 9999, border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                Sign in
              </Link>
              <Link href="/onboarding" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                Get started <ArrowRight size={13} />
              </Link>
            </div>
          </nav>
        </>
      )}

    </>
  );
}

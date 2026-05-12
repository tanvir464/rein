import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { ReinMark, ReinWordmark } from '../components/rein-mark';

export const metadata = {
  title: '404 — Page not found · REIN',
  description: 'This route is off-policy. The page you were looking for does not exist.',
};

const HELPFUL_LINKS = [
  { label: 'Roadmap', href: '/roadmap' },
  { label: 'Docs', href: '/docs' },
  { label: 'Pitch', href: '/pitch' },
  { label: 'Investors', href: '/investors' },
];

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* ── Minimal header ──────────────────────────────────────────────── */}
      <header style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="mx-auto px-6 flex items-center justify-between"
          style={{ maxWidth: 'var(--container)', height: 'var(--header-height)' }}
        >
          <Link href="/" className="flex items-center gap-2" aria-label="REIN home">
            <ReinMark size={24} />
            <ReinWordmark size={16} />
          </Link>
          <a
            href="https://docs.rein.so"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[13px] font-medium hover:text-[var(--fg)]"
            style={{ color: 'var(--muted)', transition: 'color var(--dur-instant) var(--ease-snap)' }}
          >
            Docs <ArrowUpRight size={13} />
          </a>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center" style={{ padding: '80px 0' }}>
        <div className="mx-auto px-6 w-full text-center" style={{ maxWidth: 'var(--prose)' }}>
          {/* eyebrow */}
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent-700)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: '0 0 20px',
            }}
          >
            Error · 404
          </p>

          {/* big 404 — accent on middle digit, mirrors hero accent treatment */}
          <div
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(96px, 16vw, 168px)',
              fontWeight: 700,
              letterSpacing: '-0.06em',
              lineHeight: 0.9,
              color: 'var(--fg)',
              margin: '0 0 28px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            4<span style={{ color: 'var(--accent-700)' }}>0</span>4
          </div>

          {/* headline */}
          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              margin: '0 0 16px',
              color: 'var(--fg)',
            }}
          >
            This route is off-policy.
          </h1>

          <p
            style={{
              color: 'var(--muted)',
              fontSize: 16,
              lineHeight: 1.7,
              margin: '0 auto 32px',
              maxWidth: 480,
            }}
          >
            The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get
            you back on a known path.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 h-12 px-7 text-[15px] font-semibold rounded-[var(--radius-pill)]"
              style={{
                background: 'var(--fg)',
                color: 'var(--bg)',
                transition: 'opacity var(--dur-instant) var(--ease-snap)',
              }}
            >
              <ArrowLeft size={15} /> Back to home
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 h-12 px-7 text-[15px] font-medium rounded-[var(--radius-pill)] border border-[var(--border)]"
              style={{
                color: 'var(--fg)',
                transition: 'background var(--dur-instant) var(--ease-snap)',
              }}
            >
              Try on devnet
            </Link>
          </div>

          {/* helpful links */}
          <div
            className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
            style={{ fontSize: 13, color: 'var(--muted)' }}
          >
            {HELPFUL_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="hover:text-[var(--fg)]"
                style={{ transition: 'color var(--dur-instant) var(--ease-snap)' }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '24px 0',
          background: 'var(--bg-elevated)',
        }}
      >
        <div
          className="mx-auto px-6 flex flex-wrap items-center justify-between gap-4"
          style={{ maxWidth: 'var(--container)', fontSize: 13, color: 'var(--muted)' }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fg)' }}>
              REIN
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>© 2026 — Trust-gated wallet for AI agents.</span>
          </div>
          <a
            href="https://github.com/tanvir464/rein/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--fg)]"
            style={{ transition: 'color var(--dur-instant) var(--ease-snap)' }}
          >
            Report a broken link
          </a>
        </div>
      </footer>
    </div>
  );
}

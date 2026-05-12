'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { ArrowRight, ArrowUpRight, Wallet, AlertCircle } from 'lucide-react';
import { ReinMark, ReinWordmark } from '../../components/rein-mark';
import { useAuth } from '../../components/auth-provider';
import { Button } from '../../components/button';
import { truncate } from '../../lib/format';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') ?? '/app';
  const { status, auth, error, owner, derivedVault, signIn, signOut } = useAuth();

  // Already signed in? Bounce straight to the destination.
  useEffect(() => {
    if (status === 'authed') {
      router.replace(next);
    }
  }, [status, next, router]);

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
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-[13px] font-medium hover:text-[var(--fg)]"
            style={{ color: 'var(--muted)', transition: 'color var(--dur-instant) var(--ease-snap)' }}
          >
            New here? Onboard <ArrowUpRight size={13} />
          </Link>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center" style={{ padding: '64px 0' }}>
        <div className="mx-auto px-6 w-full text-center" style={{ maxWidth: 'var(--prose)' }}>
          {/* eyebrow */}
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent-700)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: '0 0 16px',
            }}
          >
            Sign in
          </p>

          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              margin: '0 0 16px',
              color: 'var(--fg)',
            }}
          >
            Connect your{' '}
            <span style={{ color: 'var(--accent-700)' }}>wallet</span>
            <br />to access your vault.
          </h1>

          <p
            style={{
              color: 'var(--muted)',
              fontSize: 16,
              lineHeight: 1.7,
              margin: '0 auto 32px',
              maxWidth: 460,
            }}
          >
            Sign a one-time challenge with your Solana wallet. No password, no email.
            We verify your signature against the on-chain vault owner and issue a 1-hour
            session token.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4">
            {status === 'authed' && auth ? (
              <SignedInState
                vault={auth.vault}
                owner={owner}
                onContinue={() => router.replace(next)}
                onSignOut={signOut}
              />
            ) : (
              <>
                <Button
                  size="lg"
                  loading={status === 'signing-in'}
                  disabled={status === 'signing-in'}
                  onClick={signIn}
                >
                  {status === 'signing-in' ? (
                    'Waiting for wallet…'
                  ) : (
                    <>
                      <Wallet size={16} /> Sign in with wallet <ArrowRight size={15} />
                    </>
                  )}
                </Button>

                {/* Show derived vault hint while connecting */}
                {derivedVault && status !== 'signing-in' && (
                  <div className="text-[12px] text-[var(--muted)] font-mono">
                    Will sign in to vault {truncate(derivedVault, 6, 6)}
                  </div>
                )}

                {error && (
                  <div
                    className="flex items-start gap-2 max-w-md text-[13px] text-left p-3 rounded-[var(--radius-md)] border"
                    style={{
                      borderColor: 'var(--tone-danger-bg)',
                      background: 'var(--tone-danger-bg)',
                      color: 'var(--tone-danger-fg)',
                    }}
                  >
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold mb-0.5">Couldn&apos;t sign in</div>
                      <div style={{ color: 'var(--muted)' }}>{error}</div>
                      {error.toLowerCase().includes('no vault found') && (
                        <Link
                          href="/onboarding"
                          className="inline-flex items-center gap-1 mt-2 font-medium"
                          style={{ color: 'var(--accent-700)' }}
                        >
                          Create one in onboarding <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* helper links */}
          <div
            className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
            style={{ fontSize: 13, color: 'var(--muted)' }}
          >
            <a
              href="https://phantom.app/download"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--fg)] inline-flex items-center gap-1"
              style={{ transition: 'color var(--dur-instant) var(--ease-snap)' }}
            >
              No wallet? Install Phantom <ArrowUpRight size={11} />
            </a>
            <Link
              href="/docs"
              className="hover:text-[var(--fg)]"
              style={{ transition: 'color var(--dur-instant) var(--ease-snap)' }}
            >
              How sign-in works
            </Link>
            <Link
              href="/"
              className="hover:text-[var(--fg)]"
              style={{ transition: 'color var(--dur-instant) var(--ease-snap)' }}
            >
              Back to home
            </Link>
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
            <span>Trust-gated wallet for AI agents.</span>
          </div>
          <span>1-hour session · revoke anytime</span>
        </div>
      </footer>
    </div>
  );
}

function SignedInState({
  vault,
  owner,
  onContinue,
  onSignOut,
}: {
  vault: string;
  owner: string | null;
  onContinue: () => void;
  onSignOut: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 px-6 py-5 rounded-[var(--radius-lg)] border"
      style={{
        borderColor: 'var(--accent-700)',
        background: 'var(--accent-soft-bg)',
        color: 'var(--accent-soft-fg)',
        maxWidth: 460,
      }}
    >
      <div className="flex items-center gap-2 text-[13px] font-semibold">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: 'var(--success)' }}
          aria-hidden="true"
        />
        Already signed in
      </div>
      <div className="text-[12px] font-mono opacity-70 text-center">
        {owner ? `${truncate(owner, 6, 6)} → vault ${truncate(vault, 6, 6)}` : truncate(vault, 8, 8)}
      </div>
      <div className="flex gap-2 mt-1">
        <Button size="sm" onClick={onContinue}>
          Continue to dashboard <ArrowRight size={13} />
        </Button>
        <Button size="sm" variant="ghost" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

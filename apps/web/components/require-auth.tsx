'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from './auth-provider';

/**
 * Client-side auth gate for `/app/*`. If the user has no valid stored JWT,
 * redirect to `/login?next=<current-path>` — unless the URL carries `?vault=`,
 * which signals public-observer mode for read-only surfaces (insights / activity
 * / receipts). Owner-only affordances (Send privately, View key, policy submit)
 * gate themselves inline against `useAuth()`.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status, auth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [observerMode, setObserverMode] = useState(false);

  useEffect(() => {
    // Read the vault query param from the browser directly — avoids
    // Next 16 Turbopack's useSearchParams Suspense requirement at this layout
    // depth, and keeps SSR/CSR initial paint identical (always loader).
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setObserverMode(Boolean(params.get('vault')));
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (observerMode) return;
    if (status === 'authed' && auth) return;
    const next = encodeURIComponent(pathname ?? '/app');
    router.replace(`/login?next=${next}`);
  }, [mounted, status, auth, pathname, router, observerMode]);

  if (mounted && (observerMode || (status === 'authed' && auth))) {
    return <>{children}</>;
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="inline-flex items-center gap-2 text-sm"
        style={{ color: 'var(--muted)' }}
      >
        <Loader2 size={14} className="animate-spin" />
        {mounted ? 'Redirecting to sign-in…' : 'Checking session…'}
      </div>
    </div>
  );
}

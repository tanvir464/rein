'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, Menu, Search } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { ReinMark, ReinWordmark } from './rein-mark';
import { listStepUps } from '../lib/api';
import { useMobileNav } from './mobile-nav-provider';
import { useAuth } from './auth-provider';
import { SignInButton } from './sign-in-button';

export function Header({ title }: { title?: string }) {
  const [pendingStepUps, setPendingStepUps] = useState(0);
  const { toggle } = useMobileNav();
  const { auth } = useAuth();

  // Step-up badge count is per-vault, so it's only meaningful once a user
  // is signed in (and we know which vault they own). Failures = no badge.
  useEffect(() => {
    if (!auth) {
      setPendingStepUps(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const items = await listStepUps(auth.vault);
      if (cancelled) return;
      setPendingStepUps(items.filter((s) => s.status === 'pending').length);
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [auth]);

  return (
    <header
      className="flex items-center gap-3 px-4 sm:px-5 border-b border-[var(--border)] bg-[var(--bg)] sticky top-0 z-10 backdrop-blur"
      style={{ height: 'var(--header-height)' }}
    >
      <button
        onClick={toggle}
        aria-label="Open navigation"
        aria-controls="mobile-sidebar"
        className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-elevated)]"
        style={{ transition: 'color var(--dur-instant) var(--ease-snap), background-color var(--dur-instant) var(--ease-snap)' }}
      >
        <Menu size={16} />
      </button>
      <Link href="/app" className="md:hidden flex items-center gap-2">
        <ReinMark size={22} />
        <ReinWordmark size={14} />
      </Link>
      {title && <h1 className="text-[17px] font-semibold m-0 hidden md:block">{title}</h1>}
      <div className="ml-auto flex items-center gap-2">
        <div
          className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] focus-within:border-[var(--accent-700)]"
          style={{ transition: 'border-color var(--dur-instant) var(--ease-snap)' }}
        >
          <Search size={14} />
          <input
            type="text"
            placeholder="Search receipts, recipients…"
            className="bg-transparent outline-none text-sm w-40 lg:w-56"
            aria-label="Search"
          />
          <kbd className="hidden lg:inline text-[11px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted)]">⌘K</kbd>
        </div>
        <Link
          href="/app/step-up"
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-elevated)]"
          aria-label={`Notifications${pendingStepUps ? `, ${pendingStepUps} pending` : ''}`}
          style={{
            transition:
              'color var(--dur-instant) var(--ease-snap), background-color var(--dur-instant) var(--ease-snap)',
          }}
        >
          <Bell size={16} />
          {pendingStepUps > 0 && (
            <span
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold text-white flex items-center justify-center"
              style={{ backgroundColor: 'var(--danger)' }}
            >
              {pendingStepUps}
            </span>
          )}
        </Link>
        <ThemeToggle />
        <SignInButton />
      </div>
    </header>
  );
}

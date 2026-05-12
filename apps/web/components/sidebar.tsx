'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, Settings, ShieldCheck, Wallet, Bell, X } from 'lucide-react';
import { ReinMark, ReinWordmark } from './rein-mark';
import { cn } from '../lib/cn';
import { useMobileNav } from './mobile-nav-provider';

const items = [
  { href: '/app', label: 'Vaults', icon: Wallet, exact: true },
  { href: '/app/activity', label: 'Activity', icon: Activity },
  { href: '/app/policy', label: 'Policy', icon: ShieldCheck },
  { href: '/app/step-up', label: 'Step-up', icon: Bell },
  { href: '/app/insights', label: 'Insights', icon: BarChart3 },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 px-3 py-4">
      {items.map((it) => {
        const active = it.exact ? path === it.href : path?.startsWith(it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2.5 px-3 h-9 rounded-[var(--radius-md)] text-sm',
              active
                ? 'bg-[var(--accent-soft-bg)] text-[var(--accent-soft-fg)] font-medium'
                : 'text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-elevated)]',
            )}
            style={{
              transition:
                'background-color var(--dur-instant) var(--ease-snap), color var(--dur-instant) var(--ease-snap)',
            }}
          >
            <Icon size={16} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

function StatusFooter() {
  return (
    <div className="mt-auto p-4 border-t border-[var(--border)]">
      <div className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
        <span className="h-2 w-2 rounded-full pulse-ring" style={{ backgroundColor: 'var(--success)' }} />
        devnet · live
      </div>
    </div>
  );
}

export function Sidebar() {
  const { open, setOpen } = useMobileNav();

  return (
    <>
      {/* Desktop sidebar — pinned to viewport so the main column scrolls under it */}
      <aside
        className="hidden md:flex shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--bg)] sticky top-0 self-start"
        style={{ width: 'var(--sidebar-width)', height: '100dvh' }}
      >
        <Link
          href="/app"
          className="flex items-center gap-2.5 px-5 h-[var(--header-height)] border-b border-[var(--border)] shrink-0"
        >
          <ReinMark size={26} />
          <ReinWordmark size={16} />
        </Link>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <NavList />
        </div>
        <StatusFooter />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-40 transition-opacity',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          transition: 'opacity var(--dur-base) var(--ease-glide)',
        }}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      <aside
        id="mobile-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          'md:hidden fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[var(--bg)] border-r border-[var(--border)]',
        )}
        style={{
          width: 'min(var(--sidebar-width), 80vw)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform var(--dur-slow) var(--ease-glide)',
          boxShadow: open ? '0 24px 48px rgba(0,0,0,0.18)' : 'none',
        }}
      >
        <div className="flex items-center justify-between px-5 h-[var(--header-height)] border-b border-[var(--border)]">
          <Link href="/app" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <ReinMark size={26} />
            <ReinWordmark size={16} />
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-elevated)]"
            style={{ transition: 'color var(--dur-instant) var(--ease-snap), background-color var(--dur-instant) var(--ease-snap)' }}
          >
            <X size={16} />
          </button>
        </div>
        <NavList onNavigate={() => setOpen(false)} />
        <StatusFooter />
      </aside>
    </>
  );
}

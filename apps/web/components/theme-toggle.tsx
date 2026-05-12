'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] transition-colors hover:text-[var(--fg)] hover:bg-[var(--bg-elevated)]"
      style={{ transition: 'color var(--dur-instant) var(--ease-snap), background-color var(--dur-instant) var(--ease-snap)' }}
    >
      {mounted && theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

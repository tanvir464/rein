'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type ThemeContextValue = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'rein-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const stored = (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as Theme | null;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored ?? (prefersDark ? 'dark' : 'light');
    setThemeState(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
  };

  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

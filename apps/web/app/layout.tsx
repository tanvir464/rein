import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '../components/theme-provider';
import './globals.css';

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'REIN — Trust-gated wallet for AI agents',
  description:
    'Give your AI agent the rein, but keep the reins. On-chain spending policies, drop-in MCP. Every payment bounded, auditable, and refundable.',
  metadataBase: new URL('https://app.rein.so'),
  openGraph: {
    title: 'REIN — Trust-gated wallet for AI agents',
    description: 'On-chain spending policies for AI agents. Drop into any runtime in 30 seconds. Every payment bounded, auditable, and refundable.',
    url: 'https://app.rein.so',
    siteName: 'REIN',
    images: [{ url: '/brand/og-card.svg', width: 1200, height: 630, alt: 'REIN — Trust-gated wallet for AI agents' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'REIN — Trust-gated wallet for AI agents',
    description: 'On-chain spending policies for AI agents. Drop in, set limits, watch every spend.',
    site: '@reinprotocol',
    images: ['/brand/og-card.svg'],
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
};

const themeInitScript = `
try {
  var s = localStorage.getItem('rein-theme');
  var m = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = s || (m ? 'dark' : 'light');
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

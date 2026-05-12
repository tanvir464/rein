export function formatUsdc(microUnits: bigint | number, opts?: { compact?: boolean }): string {
  const n = typeof microUnits === 'bigint' ? Number(microUnits) / 1_000_000 : microUnits / 1_000_000;
  if (opts?.compact && Math.abs(n) >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatSol(lamports: bigint | number): string {
  const n = typeof lamports === 'bigint' ? Number(lamports) / 1e9 : lamports / 1e9;
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export function truncate(s: string, head = 4, tail = 4): string {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function relativeTime(date: Date | number | string): string {
  const t = typeof date === 'object' ? date.getTime() : new Date(date).getTime();
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(t).toLocaleDateString();
}

export function explorerUrl(sig: string, cluster: 'devnet' | 'mainnet-beta' = 'devnet'): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=${cluster}`;
}

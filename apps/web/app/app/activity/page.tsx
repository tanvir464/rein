'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect, useRef } from 'react';
import { Search, Filter as FilterIcon, ArrowUpRight, Activity as ActivityIcon, Download } from 'lucide-react';
import { Button } from '../../../components/button';
import { Card } from '../../../components/card';
import { StatusBadge } from '../../../components/status-badge';
import { EmptyState } from '../../../components/empty-state';
import { Skeleton } from '../../../components/skeleton';
import { type Receipt } from '../../../lib/types';
import {
  listVaults,
  listReceiptsForVaults,
  buildActivityWsUrl,
  listPrivateReceipts,
  type PrivateReceipt,
} from '../../../lib/api';
import { formatUsdc, truncate } from '../../../lib/format';
import { RelativeTime } from '../../../components/relative-time';
import { useAuth } from '../../../components/auth-provider';
import { cn } from '../../../lib/cn';

type StatusFilter = 'all' | Receipt['status'];
type GroupBy = 'none' | 'recipient' | 'runtime' | 'day';
type StreamState = 'idle' | 'connecting' | 'live' | 'polling';
type ActivityTab = 'public' | 'private';

export default function ActivityPage() {
  const { auth, owner } = useAuth();
  const [items, setItems] = useState<Receipt[]>([]);
  const [privateItems, setPrivateItems] = useState<PrivateReceipt[]>([]);
  const [loadingPrivate, setLoadingPrivate] = useState(false);
  const [tab, setTab] = useState<ActivityTab>('public');
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState<StreamState>('idle');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [group, setGroup] = useState<GroupBy>('none');
  const [, force] = useState(0);

  // Honor ?vault=… so public-observer view works without sign-in.
  const observerVault = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('vault');
  }, []);

  // Private receipts loader — runs whenever owner or observerVault changes.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingPrivate(true);
      let vaults: string[] = [];
      if (owner) {
        vaults = (await listVaults(owner)).map((v) => v.id);
      } else if (observerVault) {
        vaults = [observerVault];
      }
      if (vaults.length === 0) {
        if (!cancelled) {
          setPrivateItems([]);
          setLoadingPrivate(false);
        }
        return;
      }
      const lists = await Promise.all(vaults.map((v) => listPrivateReceipts(v)));
      if (cancelled) return;
      const merged = lists.flat().sort((a, b) => b.ts - a.ts);
      setPrivateItems(merged);
      setLoadingPrivate(false);
    };
    load();
    const t = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [owner, observerVault]);

  // tick to refresh "x ago" labels
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // 1. Always do an initial historical fetch over the public REST endpoints.
  //    Polls every 15s as a fallback; the WebSocket effect below upgrades to
  //    push when auth is available.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Always filter by the connected wallet's owner pubkey so we only see
      // receipts for *this user's* vaults, never devnet-wide noise.
      if (!owner) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }
      const vaults = await listVaults(owner);
      if (cancelled) return;
      const ids = vaults.map((v) => v.id);
      if (ids.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      const receipts = await listReceiptsForVaults(ids, 30);
      if (cancelled) return;
      receipts.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      setItems((prev) => mergeReceipts(prev, receipts));
      setLoading(false);
    };
    load();
    const t = setInterval(load, auth ? 60_000 : 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [auth, owner]);

  // 2. When signed in, open a WebSocket to /v1/activity for the auth'd vault
  //    and prepend live `spend.completed` events as Receipts.
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (!auth) {
      setStream('idle');
      return;
    }
    setStream('connecting');
    const sinceSecs = Math.floor(Date.now() / 1000) - 300;
    const url = buildActivityWsUrl(auth.vault, auth.token, sinceSecs);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.addEventListener('open', () => setStream('live'));
    ws.addEventListener('close', () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
        setStream('polling');
      }
    });
    ws.addEventListener('error', () => setStream('polling'));
    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
        if (msg?.type === 'spend.completed') {
          const r: Receipt = {
            nonce: msg.signature?.slice(0, 12) ?? `live_${Math.random().toString(36).slice(2, 8)}`,
            vaultId: msg.vault ?? auth.vault,
            recipient: msg.recipient ?? '',
            recipientLabel: undefined,
            amountUsdc: Number(msg.amount ?? 0) / 1_000_000,
            taskId: `task_${msg.signature?.slice(0, 8) ?? ''}`,
            txSig: msg.signature ?? '',
            status: 'settled',
            createdAt: new Date((msg.ts ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
            runtime: undefined,
          };
          setItems((prev) => mergeReceipts([r], prev));
        }
        // Other event types (spend.rejected, step_up.*) are ignored on this page.
      } catch {
        // ignore malformed frames
      }
    });

    return () => {
      wsRef.current = null;
      try {
        ws.close();
      } catch {
        // already closed
      }
    };
  }, [auth]);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!r.recipient.toLowerCase().includes(q) &&
            !r.recipientLabel?.toLowerCase().includes(q) &&
            !r.taskId.toLowerCase().includes(q) &&
            !r.nonce.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, query, status]);

  const grouped = useMemo(() => {
    if (group === 'none') return [{ key: '', items: filtered }];
    const map = new Map<string, Receipt[]>();
    for (const r of filtered) {
      const key =
        group === 'recipient' ? (r.recipientLabel ?? r.recipient)
          : group === 'runtime' ? (r.runtime ?? 'unknown')
            : new Date(r.createdAt).toLocaleDateString();
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [filtered, group]);

  return (
    <div className="px-6 md:px-10 py-8 mx-auto" style={{ maxWidth: 'var(--container)' }}>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="m-0 text-[32px] font-semibold" style={{ letterSpacing: '-0.02em' }}>Activity</h1>
          <p className="m-0 mt-1 text-[var(--muted)] text-sm flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full pulse-ring"
              style={{
                backgroundColor:
                  stream === 'live' ? 'var(--success)'
                  : stream === 'connecting' ? 'var(--warning)'
                  : stream === 'polling' ? 'var(--warning)'
                  : 'var(--gray-500)',
              }}
            />
            {loading
              ? 'Loading on-chain receipts…'
              : stream === 'live'
              ? 'Live · WebSocket connected'
              : stream === 'connecting'
              ? 'Connecting WebSocket…'
              : stream === 'polling'
              ? 'WebSocket disconnected · polling every minute'
              : 'Sign in to stream live receipts · polling every 15s'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            title="Export as CSV"
            onClick={() => {
              const csv = [
                'nonce,recipient,amount_usdc,status,runtime,created_at,tx_sig',
                ...filtered.map((r) =>
                  [r.nonce, r.recipientLabel ?? r.recipient, r.amountUsdc, r.status, r.runtime ?? '', r.createdAt, r.txSig].join(',')
                ),
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `rein-activity-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
            }}
          >
            <Download size={13} />
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            title="Export as JSON"
            onClick={() => {
              const json = JSON.stringify(filtered, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `rein-activity-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
            }}
          >
            <Download size={13} />
            Export JSON
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <TabButton selected={tab === 'public'} onClick={() => setTab('public')} role="tab">
          Public
          <span
            className="ml-2 px-1.5 py-0.5 rounded-[var(--radius-pill)] text-[10px] tabular-nums"
            style={{ background: 'var(--gray-100)', color: 'var(--muted)' }}
          >
            {items.length}
          </span>
        </TabButton>
        <TabButton selected={tab === 'private'} onClick={() => setTab('private')} role="tab">
          Private
          <span
            className="ml-2 px-1.5 py-0.5 rounded-[var(--radius-pill)] text-[10px] tabular-nums"
            style={{ background: 'var(--accent-soft-bg)', color: 'var(--accent-soft-fg)' }}
          >
            {privateItems.length}
          </span>
        </TabButton>
      </div>

      {tab === 'private' ? (
        <PrivateActivity
          items={privateItems}
          loading={loadingPrivate}
          owner={owner}
          observerVault={observerVault}
        />
      ) : (
      <>
      <Card className="p-3 flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 px-3 h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] flex-1 min-w-[200px]">
          <Search size={14} color="var(--muted)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipients, tasks, nonces…"
            className="bg-transparent outline-none text-sm flex-1"
          />
        </div>
        <Segmented
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          options={[
            { v: 'all', label: 'All' },
            { v: 'settled', label: 'Settled' },
            { v: 'pending', label: 'Pending' },
            { v: 'disputed', label: 'Disputed' },
            { v: 'blocked', label: 'Blocked' },
          ]}
        />
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted)] ml-auto">
          <FilterIcon size={12} />
          <span>Group:</span>
          <Segmented
            value={group}
            onChange={(v) => setGroup(v as GroupBy)}
            options={[
              { v: 'none', label: 'None' },
              { v: 'recipient', label: 'Recipient' },
              { v: 'runtime', label: 'Runtime' },
              { v: 'day', label: 'Day' },
            ]}
          />
        </div>
      </Card>

      {loading ? (
        <ActivityListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No receipts match"
          body="Adjust the filters or wait for the next agent spend."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map((g) => (
            <div key={g.key || 'all'}>
              {g.key && (
                <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2 px-1">
                  {g.key} · {g.items.length}
                </div>
              )}
              <Card className="overflow-hidden">
                <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {g.items.map((r) => (
                    <li key={r.nonce} data-testid="receipt-row" className="fade-in">
                      <Link
                        href={`/app/activity/${r.nonce}?vault=${r.vaultId}`}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--bg)]"
                        style={{ transition: 'background-color var(--dur-instant) var(--ease-snap)' }}
                      >
                        <StatusBadge
                          dot
                          tone={
                            r.status === 'settled' ? 'success'
                              : r.status === 'pending' ? 'warning'
                                : r.status === 'disputed' ? 'danger'
                                  : 'muted'
                          }
                        >
                          {r.status}
                        </StatusBadge>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-2">
                            {r.recipientLabel ?? r.recipient}
                            {r.runtime && (
                              <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded text-[var(--muted)]" style={{ backgroundColor: 'var(--gray-100)' }}>
                                {r.runtime}
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-[var(--muted)] truncate">{r.taskId} · {truncate(r.txSig, 6, 6)}</div>
                        </div>
                        <div className="tabular text-sm font-semibold">${formatUsdc(r.amountUsdc * 1_000_000)}</div>
                        <RelativeTime value={r.createdAt} className="text-[12px] text-[var(--muted)] w-20 text-right tabular" />
                        <ArrowUpRight size={14} color="var(--gray-500)" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}

function TabButton({
  selected, onClick, role, children,
}: { selected: boolean; onClick: () => void; role?: string; children: React.ReactNode }) {
  return (
    <button
      role={role}
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center gap-1 px-4 h-10 text-[13px] font-medium',
        selected ? 'text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]',
      )}
      style={{
        borderBottom: selected
          ? '2px solid var(--accent-700)'
          : '2px solid transparent',
        marginBottom: -1,
        transition: 'color var(--dur-instant) var(--ease-snap)',
      }}
    >
      {children}
    </button>
  );
}

function PrivateActivity({
  items, loading, owner, observerVault,
}: {
  items: PrivateReceipt[];
  loading: boolean;
  owner: string | null;
  observerVault: string | null;
}) {
  const publicObserver = !owner && !!observerVault;
  if (loading) {
    return (
      <Card className="overflow-hidden">
        <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="h-5 w-16 rounded-[var(--radius-pill)]" />
              <Skeleton className="h-3.5 w-64 flex-1" />
              <Skeleton className="h-3 w-14" />
            </li>
          ))}
        </ul>
      </Card>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ActivityIcon}
        title="No private receipts yet"
        body={
          publicObserver
            ? 'Viewing as public observer — no confidential receipts have landed for this vault.'
            : 'Toggle "Send privately" on the vault spend form to land your first confidential receipt.'
        }
      />
    );
  }
  return (
    <>
      {publicObserver && (
        <div
          className="mb-3 px-3 py-2 rounded-[var(--radius-md)] text-[12px]"
          style={{ background: 'var(--tone-muted-bg)', color: 'var(--tone-muted-fg)' }}
        >
          Viewing as public observer — only commitment hashes are shown. Sign in as the owner to decrypt detail.
        </div>
      )}
      <Card className="overflow-hidden">
        <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {items.map((r) => (
            <li key={r.id} data-testid="private-receipt-row" className="fade-in">
              <Link
                href={`/app/activity/${r.nonce}?vault=${r.vault}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--bg)]"
                style={{ transition: 'background-color var(--dur-instant) var(--ease-snap)' }}
              >
                <StatusBadge dot tone="muted">private</StatusBadge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate font-mono">
                    {r.recipientCommit.slice(0, 16)}…
                  </div>
                  <div className="font-mono text-[11px] text-[var(--muted)] truncate">
                    umbra: {r.umbraRef.slice(0, 12)}…
                  </div>
                </div>
                <a
                  data-testid="umbra-solscan-link"
                  href={`https://explorer.solana.com/address/${r.id}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] underline"
                  style={{ color: 'var(--muted)' }}
                >
                  Solscan
                </a>
                <div className="tabular text-sm font-semibold">
                  ${formatUsdc(Number(r.amount))}
                </div>
                <RelativeTime
                  value={new Date(r.ts * 1000).toISOString()}
                  className="text-[12px] text-[var(--muted)] w-20 text-right tabular"
                />
                <ArrowUpRight size={14} color="var(--gray-500)" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

/**
 * Merges two receipt lists: keeps the first occurrence of each (vaultId, nonce),
 * preserving order from `a` then appending unseen entries from `b`. Used to layer
 * live WebSocket arrivals over the historical fetch without duplicates.
 */
function ActivityListSkeleton() {
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-3">
            <Skeleton className="h-5 w-16 rounded-[var(--radius-pill)]" />
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-3 w-12" />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function mergeReceipts(a: Receipt[], b: Receipt[]): Receipt[] {
  const seen = new Set<string>();
  const out: Receipt[] = [];
  const push = (r: Receipt) => {
    const key = `${r.vaultId}:${r.nonce}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(r);
  };
  for (const r of a) push(r);
  for (const r of b) push(r);
  out.sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt));
  return out.slice(0, 200);
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div className="inline-flex gap-0.5 p-0.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)]">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            'px-2.5 h-7 text-[12px] font-medium rounded-[calc(var(--radius-md)-1px)]',
            value === o.v
              ? 'bg-[var(--accent-soft-bg)] text-[var(--accent-soft-fg)]'
              : 'text-[var(--muted)] hover:text-[var(--fg)]',
          )}
          style={{ transition: 'color var(--dur-instant) var(--ease-snap), background-color var(--dur-instant) var(--ease-snap)' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

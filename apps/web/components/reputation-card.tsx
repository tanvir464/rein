'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { getRecipientProfile, type RecipientProfile } from '../lib/api';
import { isValidBase58Pubkey } from '../lib/commitment';
import { ReputationBadge } from './reputation-badge';
import { Card } from './card';

type CacheEntry = { value: RecipientProfile | null; at: number };
const CACHE = new Map<string, CacheEntry>();
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; profile: RecipientProfile }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

export function useRecipientProfile(address: string, debounceMs = 250) {
  const [state, setState] = useState<LoadState>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    if (!address) {
      setState({ kind: 'idle' });
      return;
    }
    if (!isValidBase58Pubkey(address)) {
      setState({ kind: 'idle' });
      return;
    }
    const cached = CACHE.get(address);
    if (cached && Date.now() - cached.at < CACHE_MAX_AGE_MS) {
      if (cached.value) setState({ kind: 'ready', profile: cached.value });
      else setState({ kind: 'empty' });
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ kind: 'loading' });
    const timer = setTimeout(async () => {
      try {
        const profile = await getRecipientProfile(address, { signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        CACHE.set(address, { value: profile, at: Date.now() });
        if (!profile) setState({ kind: 'empty' });
        else setState({ kind: 'ready', profile });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setState({
          kind: 'error',
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [address, debounceMs]);

  return state;
}

export function ReputationCard({ address }: { address: string }) {
  const state = useRecipientProfile(address);

  if (state.kind === 'idle') return null;
  if (state.kind === 'loading') {
    return (
      <Card data-testid="reputation-card-loading" className="p-4 mt-2 flex items-center gap-2 text-[12px]" style={{ color: 'var(--muted)' }}>
        <Loader2 size={13} className="animate-spin" />
        Grading recipient via GoldRush…
      </Card>
    );
  }
  if (state.kind === 'error') {
    return (
      <Card
        data-testid="reputation-card-error"
        className="p-4 mt-2 flex items-start gap-2 text-[12px]"
        style={{ color: 'var(--tone-danger-fg)', background: 'var(--tone-danger-bg)' }}
      >
        <AlertCircle size={13} className="mt-0.5 shrink-0" />
        <span className="break-all">Reputation lookup failed: {state.message}</span>
      </Card>
    );
  }
  if (state.kind === 'empty') {
    return (
      <Card data-testid="reputation-card-empty" className="p-4 mt-2 text-[12px]" style={{ color: 'var(--muted)' }}>
        No reputation data for this address yet.
      </Card>
    );
  }

  const p = state.profile;
  return (
    <Card data-testid="reputation-card" className="p-4 mt-2 fade-in">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <ReputationBadge rating={p.rating} />
        <span
          data-testid="reputation-known-name"
          className="text-[13px] font-semibold"
          style={{ color: 'var(--fg)' }}
        >
          {p.knownName ?? 'Unlabeled recipient'}
        </span>
        <span className="ml-auto text-[11px] tabular-nums" style={{ color: 'var(--muted)' }}>
          ${p.totalVolumeUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} · 30d vol
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] mb-3" style={{ color: 'var(--muted)' }}>
        <Field
          label="First seen"
          value={p.firstSeenTs ? new Date(p.firstSeenTs * 1000).toLocaleDateString() : '—'}
        />
        <Field label="Holdings" value={`${p.topHoldings.length} tokens`} />
      </div>

      {p.topHoldings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {p.topHoldings.slice(0, 3).map((h) => (
            <span
              key={h.symbol + h.name}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-pill)] text-[11px]"
              style={{ background: 'var(--gray-100)', color: 'var(--fg)' }}
            >
              {h.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.logoUrl} alt="" width={12} height={12} style={{ borderRadius: 999 }} />
              )}
              <span className="font-mono font-semibold">{h.symbol}</span>
              <span className="tabular-nums" style={{ color: 'var(--muted)' }}>
                ${h.usdValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="font-medium" style={{ color: 'var(--fg)' }}>{value}</span>
    </div>
  );
}

/** Compact one-line rating chip for row-level use (e.g. insights table). */
export function RecipientMiniReputation({ address }: { address: string }) {
  const state = useRecipientProfile(address);
  if (state.kind === 'ready') {
    return (
      <span data-testid="top-recipient-rating" className="inline-flex items-center">
        <ReputationBadge rating={state.profile.rating} size="sm" />
      </span>
    );
  }
  // Always render an element so the testid is reachable; show neutral skeleton/placeholder.
  return (
    <span data-testid="top-recipient-rating" className="inline-flex items-center">
      <ReputationBadge rating="unknown" size="sm" withTooltip={false} />
    </span>
  );
}

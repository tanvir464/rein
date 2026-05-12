'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { Plus, Trash2, Save, RotateCcw, ShieldCheck, Code2, SlidersHorizontal, Wallet, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { buildUpdatePolicyIx } from '@rein/sdk';

import { Card } from '../../../components/card';
import { Button } from '../../../components/button';
import { StatusBadge } from '../../../components/status-badge';
import { EmptyState } from '../../../components/empty-state';
import { type Policy, type Vault } from '../../../lib/types';
import { listVaults, getPolicy, getConfig, type Config } from '../../../lib/api';
import { useTheme } from '../../../components/theme-provider';
import { useAuth } from '../../../components/auth-provider';
import { truncate } from '../../../lib/format';
import { cn } from '../../../lib/cn';
import { ReputationCard } from '../../../components/reputation-card';
import { isValidBase58Pubkey } from '../../../lib/commitment';

const CodeMirror = dynamic(() => import('@uiw/react-codemirror').then((m) => m.default), {
  ssr: false,
  loading: () => <div className="skeleton h-[420px] rounded-[var(--radius-md)]" />,
});

type Tab = 'visual' | 'json';

const EMPTY_POLICY: Policy = {
  vaultId: '',
  version: 0,
  dailyCapUsdc: 0,
  perTxCapUsdc: 0,
  stepUpThresholdUsdc: 0,
  allowlist: [],
  blocklist: [],
};

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; signature: string; newVersion: number }
  | { kind: 'error'; message: string };

export default function PolicyPage() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [vaults, setVaults] = useState<Vault[] | null>(null);
  const [vaultId, setVaultId] = useState<string>('');
  const [config, setConfig] = useState<Config | null>(null);
  const [initial, setInitial] = useState<Policy>(EMPTY_POLICY);
  const [tab, setTab] = useState<Tab>('visual');
  const [draft, setDraft] = useState<Policy>(EMPTY_POLICY);
  const [jsonText, setJsonText] = useState(JSON.stringify(EMPTY_POLICY, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: 'idle' });
  const { theme } = useTheme();

  const { owner } = useAuth();

  // load vaults (owner-scoped) + worker config so the success banner can link
  // to the right cluster's explorer.
  useEffect(() => {
    getConfig().then(setConfig);
  }, []);

  useEffect(() => {
    if (!owner) {
      setVaults([]);
      return;
    }
    listVaults(owner).then((vs) => {
      setVaults(vs);
      if (vs[0]) setVaultId(vs[0].id);
    });
  }, [owner]);

  // load policy when selected vault changes
  useEffect(() => {
    if (!vaultId) return;
    getPolicy(vaultId).then((p) => {
      const next = p ?? { ...EMPTY_POLICY, vaultId };
      setInitial(next);
      setDraft(next);
      setJsonText(JSON.stringify(next, null, 2));
      setJsonError(null);
    });
  }, [vaultId]);

  // sync visual → json
  useEffect(() => {
    setJsonText(JSON.stringify(draft, null, 2));
  }, [draft]);

  // parse json → visual
  const onJsonChange = (val: string) => {
    setJsonText(val);
    try {
      const parsed = JSON.parse(val) as Policy;
      setDraft(parsed);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const reset = () => {
    setDraft(initial);
    setJsonText(JSON.stringify(initial, null, 2));
    setJsonError(null);
  };

  const save = async () => {
    if (!publicKey || !signTransaction) {
      setSubmitState({ kind: 'error', message: 'Wallet not connected — sign in first.' });
      return;
    }
    if (!vaultId) return;

    // Validate caps (program enforces dailyCap >= perTxCap, perTxCap > 0; surface
    // the obvious cases up-front so we don't burn a tx fee).
    if (draft.perTxCapUsdc <= 0) {
      setSubmitState({ kind: 'error', message: 'Per-tx cap must be > 0.' });
      return;
    }
    if (draft.dailyCapUsdc < draft.perTxCapUsdc) {
      setSubmitState({ kind: 'error', message: 'Daily cap must be ≥ per-tx cap.' });
      return;
    }

    // Allowlist stores raw recipient pubkeys; the on-chain `spend` ix compares
    // recipient ATAs against these directly. The private-spend path computes
    // its own `recipient_commit = Poseidon(pubkey ‖ nonce)` server-side; do NOT
    // pre-hash here or every public spend would fail ErrRecipientNotAllowed.
    let allowlist: PublicKey[];
    try {
      allowlist = draft.allowlist.map((s) => new PublicKey(s));
    } catch (e) {
      setSubmitState({
        kind: 'error',
        message: `Allowlist contains an invalid base58 pubkey: ${e instanceof Error ? e.message : String(e)}`,
      });
      return;
    }
    if (allowlist.length > 16) {
      setSubmitState({ kind: 'error', message: 'Allowlist > 16 entries (program rejects).' });
      return;
    }

    const expiryTs = draft.expiresAt
      ? BigInt(Math.floor(new Date(draft.expiresAt).getTime() / 1000))
      : 0n;
    const paused = !!draft.pausedAt;

    setSubmitState({ kind: 'submitting' });
    try {
      const programId = config?.programId ? new PublicKey(config.programId) : undefined;
      const ix = await buildUpdatePolicyIx({
        owner: publicKey,
        vault: new PublicKey(vaultId),
        args: {
          dailyCap: BigInt(Math.round(draft.dailyCapUsdc * 1_000_000)),
          perTxCap: BigInt(Math.round(draft.perTxCapUsdc * 1_000_000)),
          stepUpThreshold: BigInt(Math.round(draft.stepUpThresholdUsdc * 1_000_000)),
          expiryTs,
          paused,
          allowlist,
        },
        programId,
      });
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const tx = new Transaction({ feePayer: publicKey, blockhash, lastValidBlockHeight });
      tx.add(ix);
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        'confirmed',
      );
      const newVersion = initial.version + 1;
      setSubmitState({ kind: 'success', signature: sig, newVersion });
      // Treat the just-submitted draft as the new baseline so "Reset" goes back here.
      setInitial({ ...draft, version: newVersion });
    } catch (e) {
      setSubmitState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  if (vaults && vaults.length === 0) {
    return (
      <div className="px-6 md:px-10 py-8 mx-auto" style={{ maxWidth: 'var(--container)' }}>
        <PolicyHeader />
        <EmptyState
          icon={Wallet}
          title="No vaults to configure"
          body="Initialize a vault first; policies are bound 1:1 to vaults on-chain."
        />
      </div>
    );
  }

  return (
    <div className="px-6 md:px-10 py-8 mx-auto" style={{ maxWidth: 'var(--container)' }}>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="m-0 text-[32px] font-semibold" style={{ letterSpacing: '-0.02em' }}>Policy</h1>
          <p className="m-0 mt-1 text-[var(--muted)] text-sm">
            Visual builder and JSON view stay in sync. Submit to bump the on-chain version.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={reset} disabled={!dirty || submitState.kind === 'submitting'}>
            <RotateCcw size={14} />Reset
          </Button>
          <Button
            onClick={save}
            loading={submitState.kind === 'submitting'}
            disabled={!dirty || !!jsonError || submitState.kind === 'submitting' || !publicKey}
          >
            <Save size={14} />Submit v{initial.version + 1}
          </Button>
        </div>
      </div>

      {submitState.kind === 'success' && (
        <div
          className="mb-4 px-3 py-2.5 rounded-[var(--radius-md)] flex items-start gap-2 text-[13px]"
          style={{ background: 'var(--tone-success-bg)', color: 'var(--tone-success-fg)' }}
        >
          <Check size={14} className="mt-0.5 shrink-0" />
          <span className="flex-1">
            Policy v{submitState.newVersion} submitted on-chain ·{' '}
            <a
              href={`https://explorer.solana.com/tx/${submitState.signature}?cluster=${config?.cluster ?? 'devnet'}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono inline-flex items-center gap-1 hover:underline"
            >
              {truncate(submitState.signature, 6, 6)} <ExternalLink size={11} />
            </a>
          </span>
        </div>
      )}
      {submitState.kind === 'error' && (
        <div
          className="mb-4 px-3 py-2.5 rounded-[var(--radius-md)] flex items-start gap-2 text-[13px]"
          style={{ background: 'var(--tone-danger-bg)', color: 'var(--tone-danger-fg)' }}
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span className="flex-1 break-all">{submitState.message}</span>
        </div>
      )}

      <Card className="p-3 mb-4 flex flex-wrap items-center gap-3">
        <label className="text-[12px] uppercase tracking-wider text-[var(--muted)]">Vault</label>
        <select
          value={vaultId}
          onChange={(e) => setVaultId(e.target.value)}
          className="px-3 h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] text-sm"
        >
          {(vaults ?? []).map((v) => (
            <option key={v.id} value={v.id}>{v.name} · v{v.policyVersion}</option>
          ))}
        </select>
        <div className="ml-auto inline-flex gap-0.5 p-0.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)]">
          <button
            onClick={() => setTab('visual')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 h-7 text-[12px] font-medium rounded-[calc(var(--radius-md)-1px)]',
              tab === 'visual' ? 'bg-[var(--accent-soft-bg)] text-[var(--accent-soft-fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]',
            )}
          >
            <SlidersHorizontal size={12} /> Visual
          </button>
          <button
            onClick={() => setTab('json')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 h-7 text-[12px] font-medium rounded-[calc(var(--radius-md)-1px)]',
              tab === 'json' ? 'bg-[var(--accent-soft-bg)] text-[var(--accent-soft-fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]',
            )}
          >
            <Code2 size={12} /> JSON
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={cn('p-6', tab !== 'visual' && 'hidden lg:block')}>
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck size={18} color="var(--accent-700)" />
            <h2 className="m-0 text-[16px] font-semibold">Visual builder</h2>
          </div>
          <div className="flex flex-col gap-5">
            <NumberRule
              label="Daily cap"
              suffix="USDC"
              value={draft.dailyCapUsdc}
              onChange={(v) => setDraft({ ...draft, dailyCapUsdc: v })}
            />
            <NumberRule
              label="Per-tx cap"
              suffix="USDC"
              value={draft.perTxCapUsdc}
              onChange={(v) => setDraft({ ...draft, perTxCapUsdc: v })}
            />
            <NumberRule
              label="Step-up over"
              suffix="USDC"
              value={draft.stepUpThresholdUsdc}
              onChange={(v) => setDraft({ ...draft, stepUpThresholdUsdc: v })}
            />
            <AllowlistRule
              items={draft.allowlist}
              onChange={(items) => setDraft({ ...draft, allowlist: items })}
            />
            <ListRule
              label="Blocklist"
              tone="danger"
              items={draft.blocklist}
              onChange={(items) => setDraft({ ...draft, blocklist: items })}
            />
          </div>
        </Card>

        <Card className={cn('p-0 overflow-hidden flex flex-col', tab !== 'json' && 'hidden lg:flex')}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Code2 size={16} color="var(--muted)" />
              <h2 className="m-0 text-[14px] font-semibold">policy.json</h2>
            </div>
            {jsonError ? (
              <StatusBadge tone="danger" dot>parse error</StatusBadge>
            ) : (
              <StatusBadge tone="success" dot>valid</StatusBadge>
            )}
          </div>
          <div className="flex-1 min-h-[420px]">
            <CodeMirror
              value={jsonText}
              extensions={[json()]}
              theme={theme === 'dark' ? oneDark : 'light'}
              onChange={onJsonChange}
              basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
              style={{ fontSize: 13, height: '100%' }}
            />
          </div>
          {jsonError && (
            <div className="px-4 py-2 border-t border-[var(--border)] text-[12px] text-[var(--danger)]">
              {jsonError}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function PolicyHeader() {
  return (
    <div className="mb-6">
      <h1 className="m-0 text-[32px] font-semibold" style={{ letterSpacing: '-0.02em' }}>Policy</h1>
      <p className="m-0 mt-1 text-[var(--muted)] text-sm">
        Visual builder and JSON view stay in sync. Submit to bump the on-chain version.
      </p>
    </div>
  );
}

function NumberRule({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium mb-2">{label}</label>
      <div className="flex items-center gap-2 px-3 h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] focus-within:border-[var(--accent-700)]"
        style={{ transition: 'border-color var(--dur-instant) var(--ease-snap)' }}>
        <span className="text-[var(--muted)]">$</span>
        <input
          type="number"
          value={value}
          min={0}
          step={1}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 bg-transparent outline-none text-sm tabular"
        />
        {suffix && <span className="text-[var(--muted)] text-[12px]">{suffix}</span>}
      </div>
    </div>
  );
}

function AllowlistRule({
  items,
  onChange,
}: {
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const trimmed = draft.trim();
  const showCard = trimmed.length > 0 && isValidBase58Pubkey(trimmed);
  const showError = trimmed.length > 0 && !isValidBase58Pubkey(trimmed);
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className="block text-[13px] font-medium flex-1">Allowlist</label>
        <StatusBadge tone="success">{items.length}</StatusBadge>
      </div>
      <p className="m-0 mb-2 text-[11px]" style={{ color: 'var(--muted)' }}>
        Paste a recipient pubkey to grade it before approval. Stored on-chain as raw pubkeys; the private-spend path derives its own commitment server-side.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.length === 0 && (
          <span className="text-[12px]" style={{ color: 'var(--muted)' }}>Empty</span>
        )}
        {items.map((it) => (
          <span
            key={it}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-pill)] text-[12px] font-mono"
            style={{ backgroundColor: 'var(--gray-100)', color: 'var(--fg)' }}
          >
            {truncate(it, 6, 6)}
            <button
              onClick={() => onChange(items.filter((x) => x !== it))}
              aria-label={`Remove ${it}`}
              className="text-[var(--muted)] hover:text-[var(--danger)]"
            >
              <Trash2 size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          data-testid="allowlist-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Recipient pubkey (base58)"
          className="flex-1 px-3 h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] outline-none text-sm font-mono focus:border-[var(--accent-700)]"
          style={{ transition: 'border-color var(--dur-instant) var(--ease-snap)' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && trimmed && isValidBase58Pubkey(trimmed)) {
              if (!items.includes(trimmed)) onChange([...items, trimmed]);
              setDraft('');
            }
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!isValidBase58Pubkey(trimmed)}
          onClick={() => {
            if (trimmed && isValidBase58Pubkey(trimmed)) {
              if (!items.includes(trimmed)) onChange([...items, trimmed]);
              setDraft('');
            }
          }}
        >
          <Plus size={13} />
        </Button>
      </div>
      {showError && (
        <div
          data-testid="allowlist-error"
          className="mt-2 text-[11px]"
          style={{ color: 'var(--danger)' }}
        >
          Not a valid base58 pubkey
        </div>
      )}
      {showCard && <ReputationCard address={trimmed} />}
    </div>
  );
}

function ListRule({
  label,
  items,
  onChange,
  tone,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  tone: 'success' | 'danger';
}) {
  const [draft, setDraft] = useState('');
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-[13px] font-medium">{label}</label>
        <StatusBadge tone={tone}>{items.length}</StatusBadge>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.length === 0 && (
          <span className="text-[12px] text-[var(--muted)]">Empty</span>
        )}
        {items.map((it) => (
          <span
            key={it}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-pill)] text-[12px] font-mono"
            style={{ backgroundColor: 'var(--gray-100)', color: 'var(--fg)' }}
          >
            {it}
            <button
              onClick={() => onChange(items.filter((x) => x !== it))}
              aria-label={`Remove ${it}`}
              className="text-[var(--muted)] hover:text-[var(--danger)]"
            >
              <Trash2 size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="address or pattern"
          className="flex-1 px-3 h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] outline-none text-sm font-mono focus:border-[var(--accent-700)]"
          style={{ transition: 'border-color var(--dur-instant) var(--ease-snap)' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              onChange([...items, draft.trim()]);
              setDraft('');
            }
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (draft.trim()) {
              onChange([...items, draft.trim()]);
              setDraft('');
            }
          }}
        >
          <Plus size={13} />
        </Button>
      </div>
    </div>
  );
}

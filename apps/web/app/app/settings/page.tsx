'use client';

import { useEffect, useState } from 'react';
import {
  Bell, Plug, Skull, Key, Copy, Check, AlertCircle, Trash2,
  Send, ExternalLink, Loader2, LogOut, Webhook, MessageCircle,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card } from '../../../components/card';
import { Button } from '../../../components/button';
import { StatusBadge } from '../../../components/status-badge';
import { useAuth } from '../../../components/auth-provider';
import {
  deleteNotificationChannel,
  getNotificationSubscribers,
  postAuthRevoke,
  postTestNotification,
  putNotificationTelegram,
  putNotificationWebhook,
  type NotificationSubscribers,
} from '../../../lib/api';
import { truncate } from '../../../lib/format';
import {
  buildViewKeyChallenge,
  clearViewKeys,
  deriveViewKey,
  getActiveViewKey,
  setActiveViewKey,
  viewKeyDisclosure,
  type ViewKey,
} from '../../../lib/view-key';
import { cn } from '../../../lib/cn';

type SettingsTab = 'general' | 'view-key';

export default function SettingsPage() {
  const { auth, signOut } = useAuth();
  const [tab, setTab] = useState<SettingsTab>('general');

  return (
    <div className="px-6 md:px-10 py-8 mx-auto" style={{ maxWidth: 'var(--prose)' }}>
      <div className="mb-6">
        <h1 className="m-0 text-[32px] font-semibold" style={{ letterSpacing: '-0.02em' }}>Settings</h1>
        <p className="m-0 mt-1 text-[var(--muted)] text-sm">
          Owner-only controls for the vault tied to your wallet signature.
        </p>
      </div>

      <div className="flex items-center gap-1 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <SettingsTabButton selected={tab === 'general'} onClick={() => setTab('general')}>
          General
        </SettingsTabButton>
        <SettingsTabButton selected={tab === 'view-key'} onClick={() => setTab('view-key')}>
          View key
        </SettingsTabButton>
      </div>

      {!auth ? (
        <Card className="p-6 mb-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} color="var(--warning)" className="mt-0.5 shrink-0" />
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              Sign in to manage notification channels and session tokens.
            </div>
          </div>
        </Card>
      ) : tab === 'view-key' ? (
        <ViewKeySection vault={auth.vault} />
      ) : (
        <>
          <NotificationsSection token={auth.token} />
          <SessionSection
            vault={auth.vault}
            kid={auth.kid}
            expiresAt={auth.expiresAt}
            scopes={auth.scopes}
            token={auth.token}
            onRevoked={signOut}
          />
          <DelegateKeySection />
          <DeadMansSwitchSection />
        </>
      )}
    </div>
  );
}

function SettingsTabButton({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-4 h-10 text-[13px] font-medium',
        selected ? 'text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]',
      )}
      style={{
        borderBottom: selected ? '2px solid var(--accent-700)' : '2px solid transparent',
        marginBottom: -1,
        transition: 'color var(--dur-instant) var(--ease-snap)',
      }}
    >
      {children}
    </button>
  );
}

// ─── View key panel (F72e) ──────────────────────────────────────────────

function ViewKeySection({ vault }: { vault: string }) {
  const { wallet } = useWallet();
  const [active, setActive] = useState<ViewKey | null>(null);
  const [busy, setBusy] = useState<'derive' | 'rotate' | null>(null);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; message: string } | null>(null);
  const [copied, setCopied] = useState<'pub' | 'disclosure' | null>(null);

  useEffect(() => {
    setActive(getActiveViewKey(vault));
  }, [vault]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  async function derive(nextKid: number) {
    const adapter = wallet?.adapter;
    if (!adapter || !('signMessage' in adapter) || typeof adapter.signMessage !== 'function') {
      setFlash({ kind: 'err', message: 'Wallet does not support message signing.' });
      return;
    }
    setBusy(nextKid === (active?.kid ?? 0) ? 'derive' : 'rotate');
    try {
      const msg = buildViewKeyChallenge(vault, nextKid);
      const sig = await adapter.signMessage(new TextEncoder().encode(msg));
      const key = await deriveViewKey(vault, sig, nextKid);
      setActiveViewKey(key);
      setActive(key);
      setFlash({
        kind: 'ok',
        message:
          nextKid === 0
            ? 'View key derived. It lives only in this browser.'
            : `View key rotated to kid=${nextKid}.`,
      });
    } catch (e) {
      setFlash({ kind: 'err', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  async function copy(value: string, which: 'pub' | 'disclosure') {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch (e) {
      setFlash({ kind: 'err', message: e instanceof Error ? e.message : 'Copy failed' });
    }
  }

  return (
    <Section
      icon={Key}
      title="View key"
      body="Decrypts your private-spend receipts in this browser. The private half never leaves your device; the public half ships with each encrypted memo so the owner — and only the owner — can read recipient and amount."
    >
      {!active ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] m-0" style={{ color: 'var(--muted)' }}>
            No view key yet. Sign a one-time challenge to derive it.
          </p>
          <div>
            <Button
              size="sm"
              onClick={() => derive(0)}
              loading={busy === 'derive'}
              disabled={busy !== null}
            >
              <Key size={13} /> Derive view key
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <RowKV label="kid" value={String(active.kid)} mono />
          <RowKV label="Derived" value={new Date(active.createdAt).toLocaleString()} />
          <div className="flex flex-col gap-1">
            <span className="text-[12px]" style={{ color: 'var(--muted)' }}>Public half (shared with worker)</span>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border font-mono text-[11px] break-all"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
            >
              <span className="flex-1 min-w-0">{active.pubHex}</span>
              <button
                data-testid="view-key-copy"
                onClick={() => copy(active.pubHex, 'pub')}
                aria-label="Copy view key"
                className="h-7 px-2 rounded-md text-[11px] inline-flex items-center gap-1 hover:bg-[var(--bg-elevated)]"
                style={{ color: 'var(--muted)' }}
              >
                {copied === 'pub' ? <Check size={12} /> : <Copy size={12} />}
                {copied === 'pub' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[12px]" style={{ color: 'var(--muted)' }}>Auditor disclosure (one line)</span>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border font-mono text-[11px] break-all"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
            >
              <span className="flex-1 min-w-0">{viewKeyDisclosure(active)}</span>
              <button
                data-testid="view-key-share"
                onClick={() => copy(viewKeyDisclosure(active), 'disclosure')}
                aria-label="Copy disclosure"
                className="h-7 px-2 rounded-md text-[11px] inline-flex items-center gap-1 hover:bg-[var(--bg-elevated)]"
                style={{ color: 'var(--muted)' }}
              >
                {copied === 'disclosure' ? <Check size={12} /> : <Send size={12} />}
                {copied === 'disclosure' ? 'Copied' : 'Share with auditor'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Button
              data-testid="view-key-rotate"
              size="sm"
              variant="secondary"
              onClick={() => derive(active.kid + 1)}
              loading={busy === 'rotate'}
              disabled={busy !== null}
            >
              <Key size={13} /> Rotate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { clearViewKeys(); setActive(null); }}
              disabled={busy !== null}
            >
              <Trash2 size={13} /> Forget
            </Button>
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
              Rotating re-derives from a new signature; previous keys are kept locally so older receipts stay decryptable.
            </span>
          </div>
        </div>
      )}
      {flash && <Flash kind={flash.kind}>{flash.message}</Flash>}
    </Section>
  );
}

// ─── Notifications ──────────────────────────────────────────────────────

function NotificationsSection({ token }: { token: string }) {
  const [subs, setSubs] = useState<NotificationSubscribers | null>(null);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [busy, setBusy] = useState<null | 'webhook-save' | 'webhook-delete' | 'telegram-save' | 'telegram-delete' | 'test'>(null);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; message: string } | null>(null);

  const refresh = async () => {
    setLoading(true);
    const res = await getNotificationSubscribers(token);
    setSubs(res);
    if (res?.webhook) setWebhookUrl(res.webhook.url);
    if (res?.telegram) setTelegramChatId(res.telegram.chatId);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Flash auto-clears after 4s.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  const saveWebhook = async () => {
    if (!/^https?:\/\//.test(webhookUrl)) {
      setFlash({ kind: 'err', message: 'Webhook URL must start with http:// or https://' });
      return;
    }
    setBusy('webhook-save');
    const res = await putNotificationWebhook(
      { url: webhookUrl, secret: webhookSecret || undefined },
      token,
    );
    setBusy(null);
    if (res.ok) {
      setFlash({ kind: 'ok', message: 'Webhook saved' });
      setWebhookSecret(''); // never re-display
      refresh();
    } else {
      setFlash({ kind: 'err', message: res.error });
    }
  };

  const deleteWebhook = async () => {
    setBusy('webhook-delete');
    const res = await deleteNotificationChannel('webhook', token);
    setBusy(null);
    if (res.ok) {
      setFlash({ kind: 'ok', message: 'Webhook removed' });
      setWebhookUrl('');
      refresh();
    } else {
      setFlash({ kind: 'err', message: res.error });
    }
  };

  const saveTelegram = async () => {
    if (!telegramChatId.trim()) {
      setFlash({ kind: 'err', message: 'Telegram chat ID is required' });
      return;
    }
    setBusy('telegram-save');
    const res = await putNotificationTelegram(telegramChatId.trim(), token);
    setBusy(null);
    if (res.ok) {
      setFlash({ kind: 'ok', message: 'Telegram saved' });
      refresh();
    } else {
      setFlash({ kind: 'err', message: res.error });
    }
  };

  const deleteTelegram = async () => {
    setBusy('telegram-delete');
    const res = await deleteNotificationChannel('telegram', token);
    setBusy(null);
    if (res.ok) {
      setFlash({ kind: 'ok', message: 'Telegram removed' });
      setTelegramChatId('');
      refresh();
    } else {
      setFlash({ kind: 'err', message: res.error });
    }
  };

  const sendTest = async () => {
    setBusy('test');
    const res = await postTestNotification('spend.completed', token);
    setBusy(null);
    if (res.ok) {
      const channels = Object.keys(res.data.results ?? {});
      setFlash({
        kind: 'ok',
        message: channels.length > 0
          ? `Test fired to ${channels.join(', ')}. Check your endpoint.`
          : 'Test fired — no channels configured.',
      });
    } else {
      setFlash({ kind: 'err', message: res.error });
    }
  };

  return (
    <Section icon={Bell} title="Notification channels" body="Where step-up requests, dispute confirmations, and spend events get delivered. Each event hits every configured channel.">
      {loading ? (
        <p className="text-[13px] inline-flex items-center gap-2" style={{ color: 'var(--muted)' }}>
          <Loader2 size={13} className="animate-spin" /> Loading channels…
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Webhook */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Webhook size={14} color="var(--accent-700)" />
              <h4 className="m-0 text-[14px] font-semibold flex-1">Webhook</h4>
              <StatusBadge tone={subs?.webhook ? 'success' : 'muted'} dot={!!subs?.webhook}>
                {subs?.webhook ? 'live' : 'off'}
              </StatusBadge>
            </div>
            <div className="flex flex-col gap-2">
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.example.com/rein/hooks"
                className="px-3 h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] text-sm font-mono outline-none focus:border-[var(--accent-700)]"
                style={{ transition: 'border-color var(--dur-instant) var(--ease-snap)' }}
              />
              <input
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder={subs?.webhook?.hasSecret ? '••• (secret already set — re-enter to rotate)' : 'Optional HMAC secret for signing requests'}
                type="password"
                className="px-3 h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] text-sm font-mono outline-none focus:border-[var(--accent-700)]"
                style={{ transition: 'border-color var(--dur-instant) var(--ease-snap)' }}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={saveWebhook} loading={busy === 'webhook-save'} disabled={busy !== null}>
                  {subs?.webhook ? 'Update' : 'Save'}
                </Button>
                {subs?.webhook && (
                  <Button size="sm" variant="ghost" onClick={deleteWebhook} loading={busy === 'webhook-delete'} disabled={busy !== null}>
                    <Trash2 size={13} /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Telegram */}
          <div className="border-t pt-5" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={14} color="var(--accent-700)" />
              <h4 className="m-0 text-[14px] font-semibold flex-1">Telegram</h4>
              <StatusBadge tone={subs?.telegram ? 'success' : 'muted'} dot={!!subs?.telegram}>
                {subs?.telegram ? 'live' : 'off'}
              </StatusBadge>
            </div>
            <div className="flex flex-col gap-2">
              <input
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Chat ID (e.g. 123456789 or @yourchannel)"
                className="px-3 h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] text-sm font-mono outline-none focus:border-[var(--accent-700)]"
                style={{ transition: 'border-color var(--dur-instant) var(--ease-snap)' }}
              />
              <p className="text-[11px] m-0" style={{ color: 'var(--muted)' }}>
                Worker must have <code className="font-mono">TELEGRAM_BOT_TOKEN</code> set; otherwise saving returns 503.
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={saveTelegram} loading={busy === 'telegram-save'} disabled={busy !== null}>
                  {subs?.telegram ? 'Update' : 'Save'}
                </Button>
                {subs?.telegram && (
                  <Button size="sm" variant="ghost" onClick={deleteTelegram} loading={busy === 'telegram-delete'} disabled={busy !== null}>
                    <Trash2 size={13} /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Test */}
          <div className="border-t pt-5 flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex-1 text-[12px]" style={{ color: 'var(--muted)' }}>
              Fires a synthetic <code className="font-mono">spend.completed</code> event through every registered channel.
            </div>
            <Button size="sm" variant="secondary" onClick={sendTest} loading={busy === 'test'} disabled={busy !== null}>
              <Send size={13} /> Send test event
            </Button>
          </div>

          {flash && <Flash kind={flash.kind}>{flash.message}</Flash>}
        </div>
      )}
    </Section>
  );
}

// ─── Session token ──────────────────────────────────────────────────────

function SessionSection({
  vault, kid, expiresAt, scopes, token, onRevoked,
}: {
  vault: string;
  kid: string;
  expiresAt: number;
  scopes: string[];
  token: string;
  onRevoked: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expiresIn = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
  const expiresInMin = Math.floor(expiresIn / 60);

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Copy failed');
    }
  };

  const revokeSession = async () => {
    if (!confirm('Revoke this session? You will be signed out and need to re-authenticate.')) return;
    setBusy(true);
    setError(null);
    const res = await postAuthRevoke(token);
    setBusy(false);
    if (res.ok) {
      onRevoked();
    } else {
      setError(res.error);
    }
  };

  return (
    <Section
      icon={Plug}
      title="Session token"
      body="The JWT minted by your wallet's challenge-response sign-in. Copy it to give an agent runtime read/spend access via the worker."
    >
      <div className="flex flex-col gap-3">
        <RowKV label="Vault" value={truncate(vault, 6, 6)} mono />
        <RowKV label="Key id (kid)" value={kid} mono />
        <RowKV label="Scopes" value={scopes.join(', ') || '—'} />
        <RowKV
          label="Expires"
          value={
            expiresIn === 0
              ? 'expired — refresh by signing in again'
              : `${new Date(expiresAt * 1000).toLocaleString()} (~${expiresInMin} min)`
          }
        />

        <div
          className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border font-mono text-[11px] break-all"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        >
          <span className="flex-1 min-w-0">
            {token.slice(0, 24)}…{token.slice(-12)}
          </span>
          <button
            onClick={copyToken}
            aria-label="Copy token"
            className="h-7 px-2 rounded-md text-[11px] inline-flex items-center gap-1 hover:bg-[var(--bg-elevated)]"
            style={{ color: 'var(--muted)' }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <Button size="sm" variant="danger" onClick={revokeSession} loading={busy} disabled={busy}>
            <LogOut size={13} /> Revoke session
          </Button>
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
            To mint a token for another agent runtime, sign in again from a different browser/profile.
          </span>
        </div>

        {error && <Flash kind="err">{error}</Flash>}
      </div>
    </Section>
  );
}

// ─── Roadmap-only sections (no backend yet, kept for surface honesty) ────

function DelegateKeySection() {
  return (
    <Section
      icon={Key}
      title="Delegate key rotation"
      body="The worker's hot key that signs spend transactions on the agent's behalf. Rotation requires re-onboarding agents."
    >
      <div
        className="flex items-start gap-3 p-3 rounded-[var(--radius-md)]"
        style={{ background: 'var(--tone-warning-bg)', color: 'var(--tone-warning-fg)' }}
      >
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <div className="text-[13px] flex-1">
          <strong>Roadmap (v2).</strong> Today the delegate keypair is set via the worker secret
          <code className="font-mono ml-1">DELEGATE_KEYPAIR_BASE58</code>. UI-driven rotation
          arrives with the key-broker feature (Phase 5).{' '}
          <a
            href="/roadmap"
            target="_blank"
            rel="noreferrer"
            className="underline inline-flex items-center gap-1"
          >
            Roadmap <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </Section>
  );
}

function DeadMansSwitchSection() {
  return (
    <Section
      icon={Skull}
      title="Dead-man's switch"
      body="If you don't sign a heartbeat within N days, the vault auto-pauses. Insurance against losing your key."
      danger
    >
      <div
        className="flex items-start gap-3 p-3 rounded-[var(--radius-md)]"
        style={{ background: 'var(--tone-muted-bg)', color: 'var(--tone-muted-fg)' }}
      >
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <div className="text-[13px] flex-1">
          <strong>Coming soon.</strong> No on-chain instruction in v1; needs a periodic
          <code className="font-mono mx-1">heartbeat</code> ix and an off-chain watcher to
          trigger <code className="font-mono">pause</code> on timeout. Tracked as future work.
        </div>
      </div>
    </Section>
  );
}

// ─── Tiny presentational helpers ────────────────────────────────────────

function Section({
  icon: Icon, title, body, children, danger,
}: {
  icon: typeof Bell;
  title: string;
  body: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Card className="p-6 mb-5">
      <div className="flex items-start gap-3 mb-4">
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 36, height: 36, borderRadius: 8,
            backgroundColor: danger ? 'var(--tone-danger-bg)' : 'var(--accent-soft-bg)',
            color: danger ? 'var(--tone-danger-fg)' : 'var(--accent-soft-fg)',
          }}
        >
          <Icon size={18} />
        </div>
        <div>
          <h2 className="m-0 text-[16px] font-semibold">{title}</h2>
          <p className="m-0 mt-0.5 text-[13px]" style={{ color: 'var(--muted)' }}>{body}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function RowKV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13px]">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className={mono ? 'font-mono text-[12px] break-all text-right' : 'text-right'}>{value}</span>
    </div>
  );
}

function Flash({ kind, children }: { kind: 'ok' | 'err'; children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-[var(--radius-md)] text-[12px]"
      style={{
        background: kind === 'ok' ? 'var(--tone-success-bg)' : 'var(--tone-danger-bg)',
        color: kind === 'ok' ? 'var(--tone-success-fg)' : 'var(--tone-danger-fg)',
      }}
    >
      {kind === 'ok' ? <Check size={12} className="mt-0.5" /> : <AlertCircle size={12} className="mt-0.5" />}
      <span className="flex-1 break-all">{children}</span>
    </div>
  );
}

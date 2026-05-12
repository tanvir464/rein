'use client';

import { useEffect, useState } from 'react';
import { Plus, X, LogOut, ArrowRight } from 'lucide-react';
import { Button } from '../../components/button';
import { useAuth } from '../../components/auth-provider';

/**
 * "New vault" CTA. On Solana, every vault PDA is derived from `[b"vault", owner]`
 * — one wallet, one vault. So this button can't actually "add" a vault for the
 * current wallet; it has to walk the user through connecting a different one.
 *
 * Opens a small modal that explains the constraint and gives a one-click
 * "Sign out & connect another wallet" CTA (which is the only real path).
 */
export function NewVaultButton() {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={14} /> New vault
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Create a new vault"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border bg-[var(--bg-elevated)] p-6 fade-in"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="m-0 text-[20px] font-semibold" style={{ letterSpacing: '-0.02em' }}>
                One vault per wallet
              </h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg)]"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-sm m-0 mb-4" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              On Solana, every REIN vault is derived from one wallet&apos;s pubkey — so a
              single wallet can only ever have one vault. To create another, sign out
              and connect a different wallet (use Phantom&apos;s account switcher to add
              one in seconds).
            </p>

            <div
              className="text-[12px] mb-5 p-3 rounded-[var(--radius-md)] border"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg)',
                color: 'var(--muted)',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: 'var(--fg)' }}>Tip:</strong> in Phantom, click your
              avatar → <em>Add / Connect Wallet → Create New Wallet</em>. Then airdrop SOL:
              <br />
              <code className="font-mono text-[11px] mt-1 block">
                solana airdrop 2 &lt;new-address&gt; --url https://api.devnet.solana.com
              </code>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={signOut}>
                <LogOut size={13} /> Sign out & connect another <ArrowRight size={13} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

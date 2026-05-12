'use client';

import { LogIn, LogOut, Wallet, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { useAuth } from './auth-provider';
import { truncate } from '../lib/format';

/**
 * Single button that handles the full connect → sign challenge → fetch JWT
 * flow. Renders three states:
 *   - signed out:  "Sign in" pill
 *   - signing in:  spinner
 *   - signed in:   wallet pubkey + sign-out
 */
export function SignInButton() {
  const { status, auth, error, owner, signIn, signOut } = useAuth();

  if (status === 'authed' && auth) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[var(--radius-pill)] border text-[12px] font-mono"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--bg-elevated)',
            color: 'var(--muted)',
          }}
          title={`Vault ${auth.vault}`}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: 'var(--success)' }}
            aria-hidden="true"
          />
          {truncate(owner ?? auth.vault, 4, 4)}
        </span>
        <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
          <LogOut size={13} />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        loading={status === 'signing-in'}
        disabled={status === 'signing-in'}
        onClick={signIn}
      >
        {status === 'signing-in' ? (
          <>
            <Wallet size={13} /> Signing…
          </>
        ) : (
          <>
            <LogIn size={13} /> Sign in
          </>
        )}
      </Button>
      {error && (
        <div
          className="hidden md:flex items-center gap-1 text-[11px] max-w-[280px] truncate"
          style={{ color: 'var(--danger)' }}
          title={error}
        >
          <AlertCircle size={11} />
          {error}
        </div>
      )}
    </div>
  );
}

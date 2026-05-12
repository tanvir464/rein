'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { deriveVaultPda } from '@rein/sdk';

import { API_URL } from '../lib/api';
import {
  buildChallengeMessage,
  clearAuth,
  loadAuth,
  saveAuth,
  type StoredAuth,
} from '../lib/auth';

type AuthState =
  | { status: 'idle'; auth: null; error: null }
  | { status: 'signing-in'; auth: null; error: null }
  | { status: 'authed'; auth: StoredAuth; error: null }
  | { status: 'idle'; auth: null; error: string };

type AuthContextValue = {
  status: AuthState['status'];
  auth: StoredAuth | null;
  error: string | null;
  /** Owner pubkey from the connected wallet, base58. */
  owner: string | null;
  /** Vault PDA derived from `owner`, base58. */
  derivedVault: string | null;
  /** Trigger the connect → sign → issue flow. Resolves when authed or rejected. */
  signIn: () => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // `signMessage` is intentionally NOT destructured here — `signIn` reads it
  // off the active adapter directly so we can pre-select the wallet before
  // the user has connected it.
  const { publicKey, connect, connected, wallet, select, wallets } = useWallet();
  const [state, setState] = useState<AuthState>({ status: 'idle', auth: null, error: null });

  // Hydrate any stored token on mount.
  useEffect(() => {
    const stored = loadAuth();
    if (stored) setState({ status: 'authed', auth: stored, error: null });
  }, []);

  const owner = publicKey?.toBase58() ?? null;
  const derivedVault = useMemo(() => {
    if (!publicKey) return null;
    try {
      const [pda] = deriveVaultPda(publicKey);
      return pda.toBase58();
    } catch {
      return null;
    }
  }, [publicKey]);

  // If the connected wallet's owner no longer matches the stored auth,
  // sign out so we don't send a token bound to a different vault.
  useEffect(() => {
    if (state.status !== 'authed') return;
    if (!derivedVault) return;
    if (state.auth.vault !== derivedVault) {
      clearAuth();
      setState({ status: 'idle', auth: null, error: null });
    }
  }, [state, derivedVault]);

  const inFlight = useRef(false);

  const signIn = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setState({ status: 'signing-in', auth: null, error: null });
    try {
      // 1. Ensure a wallet is selected, then connect.
      let activeAdapter = wallet?.adapter ?? null;
      if (!activeAdapter) {
        const ready = wallets.find((w) => w.readyState === 'Installed');
        if (!ready) {
          throw new Error(
            'No Solana wallet detected. Install Phantom, Solflare, or Backpack and reload.',
          );
        }
        select(ready.adapter.name);
        activeAdapter = ready.adapter;
      }
      if (!activeAdapter.connected) {
        await activeAdapter.connect();
      }

      const ownerKey = activeAdapter.publicKey;
      if (!ownerKey) throw new Error('Wallet did not return a public key');
      const adapterSignMessage =
        'signMessage' in activeAdapter && typeof activeAdapter.signMessage === 'function'
          ? activeAdapter.signMessage.bind(activeAdapter)
          : null;
      if (!adapterSignMessage) {
        throw new Error('Wallet does not support message signing');
      }

      // 3. Derive the user's vault PDA from their owner pubkey.
      const [vaultPda] = deriveVaultPda(ownerKey);
      const vault = vaultPda.toBase58();

      // 4. Build & sign challenge.
      const message = buildChallengeMessage(vault);
      const signatureBytes = await adapterSignMessage(new TextEncoder().encode(message));
      const signature = bs58.encode(signatureBytes);

      // 5. Exchange for a JWT.
      const res = await fetch(`${API_URL}/v1/auth/issue`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vault, message, signature, scopes: ['read', 'spend'] }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; reason?: string };
        if (res.status === 404) {
          throw new Error(
            `No vault found for this wallet on-chain. Initialize one at ${vault.slice(0, 8)}…`,
          );
        }
        throw new Error(body.error ?? `auth failed (${res.status})`);
      }
      const issued = (await res.json()) as {
        token: string;
        kid: string;
        expiresAt: number;
        scopes: StoredAuth['scopes'];
      };

      const next: StoredAuth = {
        token: issued.token,
        kid: issued.kid,
        vault,
        scopes: issued.scopes,
        expiresAt: issued.expiresAt,
      };
      saveAuth(next);
      setState({ status: 'authed', auth: next, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ status: 'idle', auth: null, error: message });
    } finally {
      inFlight.current = false;
    }
  }, [wallet, wallets, select, connected, connect]);

  const signOut = useCallback(() => {
    clearAuth();
    setState({ status: 'idle', auth: null, error: null });
    // Send the user back to /login. Don't auto-disconnect the wallet adapter —
    // they may want to re-sign in with the same wallet without a wallet popup.
    router.push('/login');
  }, [router]);

  // Auto-clear expired tokens once a minute.
  useEffect(() => {
    if (state.status !== 'authed') return;
    const id = setInterval(() => {
      if (state.auth.expiresAt * 1000 < Date.now() + 30_000) {
        clearAuth();
        setState({ status: 'idle', auth: null, error: null });
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [state]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      auth: state.auth,
      error: state.error,
      owner,
      derivedVault,
      signIn,
      signOut,
    }),
    [state, owner, derivedVault, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

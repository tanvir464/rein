'use client';

import { useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';

const DEFAULT_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.replace(/\/$/, '') ?? 'https://api.devnet.solana.com';

/**
 * Wraps the app in Solana wallet + connection context.
 * `wallets={[]}` relies on the wallet-standard auto-discovery — any
 * registered Phantom/Solflare/Backpack/etc. extension is picked up
 * automatically without us bundling each adapter.
 */
export function WalletProviderShell({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => DEFAULT_RPC, []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={[]} autoConnect>
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

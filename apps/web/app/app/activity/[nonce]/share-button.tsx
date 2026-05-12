'use client';

import { useState } from 'react';
import { Check, Share2, AlertCircle } from 'lucide-react';
import { Button } from '../../../../components/button';

type Props = {
  /** Receipt's on-chain Solana Explorer URL — publicly verifiable, safe to share. */
  explorerUrl: string | null;
  /** Optional human label for the receipt (e.g., "$0.10 spend on REIN"). */
  title?: string;
};

/**
 * Shares a receipt's Explorer link. On platforms that support the Web Share
 * API (most mobile, some desktop Chromium over HTTPS), opens the native
 * share sheet. Everywhere else (including localhost dev) it copies the URL
 * to the clipboard with a 2-second "Copied!" confirmation.
 */
export function ShareButton({ explorerUrl, title = 'REIN receipt' }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    if (!explorerUrl) {
      setError('Receipt has no shareable on-chain link yet.');
      setState('error');
      return;
    }

    // Prefer native share if available; falls back to clipboard otherwise.
    const canShare =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof window !== 'undefined' &&
      window.isSecureContext;

    if (canShare) {
      try {
        await navigator.share({
          title,
          text: 'On-chain receipt verified on Solana',
          url: explorerUrl,
        });
        // Native sheet handled it — no UI flash needed.
        return;
      } catch (e) {
        // AbortError = user dismissed the sheet; not an error worth flashing.
        const name = (e as { name?: string })?.name;
        if (name === 'AbortError') return;
        // Other errors (NotAllowedError, etc.) → fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(explorerUrl);
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not copy');
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  return (
    <Button variant="secondary" size="sm" onClick={onClick} disabled={!explorerUrl}>
      {state === 'copied' ? (
        <>
          <Check size={13} /> Copied
        </>
      ) : state === 'error' ? (
        <>
          <AlertCircle size={13} /> {error ?? 'Error'}
        </>
      ) : (
        <>
          <Share2 size={13} /> Share
        </>
      )}
    </Button>
  );
}

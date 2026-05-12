'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

type Props = { code: string; language?: string; className?: string };

export function CodeBlock({ code, language = 'bash', className }: Props) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div
      className={`relative rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] ${className ?? ''}`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-[11px] uppercase tracking-wider text-[var(--muted)]">{language}</span>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--fg)]"
          style={{ transition: 'color var(--dur-instant) var(--ease-snap)' }}
          aria-label="Copy"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-[13px] leading-relaxed m-0">
        <code>{code}</code>
      </pre>
    </div>
  );
}

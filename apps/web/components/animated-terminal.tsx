'use client';

import { useEffect, useState } from 'react';

const LINES: Array<{ text: string; type: 'cmd' | 'success' | 'info' | 'done' | 'gap' }> = [
  { text: '$ npx @rein/cli init', type: 'cmd' },
  { text: '  Detecting agent runtime…', type: 'info' },
  { text: '✓ Detected Claude Code (MCP)', type: 'success' },
  { text: '✓ Solana devnet connected', type: 'success' },
  { text: '✓ Vault linked: 2QFW…wNj', type: 'success' },
  { text: '✓ Policy set: $50 daily · $5/tx', type: 'success' },
  { text: '✓ MCP config → ~/.claude/.mcp.json', type: 'success' },
  { text: '', type: 'gap' },
  { text: '  Done in 4s. Restart Claude Code to activate.', type: 'done' },
];

const DELAY_PER_LINE = 340;

export function AnimatedTerminal() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    let i = 0;
    const tick = () => {
      i++;
      setVisible(i);
      if (i < LINES.length) setTimeout(tick, DELAY_PER_LINE);
    };
    const start = setTimeout(tick, 400);
    return () => clearTimeout(start);
  }, []);

  return (
    <div
      style={{
        background: '#0d1117',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        lineHeight: 1.7,
      }}
    >
      {/* Window chrome */}
      <div
        style={{
          background: '#161b22',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 8 }}>Terminal — rein init</span>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 24px 24px', minHeight: 220 }}>
        {LINES.slice(0, visible).map((line, i) => {
          if (line.type === 'gap') return <div key={i} style={{ height: 8 }} />;
          return (
            <div
              key={i}
              style={{
                color:
                  line.type === 'cmd' ? '#e6edf3'
                  : line.type === 'success' ? '#3fb950'
                  : line.type === 'done' ? '#58a6ff'
                  : 'rgba(230,237,243,0.5)',
                fontWeight: line.type === 'cmd' ? 600 : 400,
                animation: 'fade-in 0.2s ease',
              }}
            >
              {line.text}
            </div>
          );
        })}
        {visible < LINES.length && (
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 14,
              background: '#58a6ff',
              opacity: 0.9,
              animation: 'blink 1s step-end infinite',
              verticalAlign: 'text-bottom',
              marginLeft: 2,
            }}
          />
        )}
      </div>

    </div>
  );
}

/* SVG logo marks for each supported runtime */
export function ClaudeCodeLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Claude Code">
      <rect width="24" height="24" rx="6" fill="#D97757"/>
      <path d="M7 17L12 7L17 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 13H15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function CursorLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Cursor">
      <rect width="24" height="24" rx="6" fill="#1a1a1a"/>
      <path d="M6 6L12 18L14 13L19 11L6 6Z" fill="white"/>
    </svg>
  );
}

export function LangChainLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="LangChain">
      <rect width="24" height="24" rx="6" fill="#1C3C3C"/>
      <circle cx="8" cy="12" r="2.5" fill="#4CAF9A"/>
      <circle cx="16" cy="12" r="2.5" fill="#4CAF9A"/>
      <path d="M10.5 12H13.5" stroke="#4CAF9A" strokeWidth="1.5"/>
      <path d="M5.5 9C5.5 9 6 7 8 7" stroke="#4CAF9A" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18.5 15C18.5 15 18 17 16 17" stroke="#4CAF9A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function OpenAILogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="OpenAI">
      <rect width="24" height="24" rx="6" fill="#000"/>
      <path d="M12 4.5C10.07 4.5 8.35 5.37 7.22 6.76C6.6 6.58 5.94 6.5 5.25 6.56C3.39 6.72 1.87 8.23 1.54 10.08C1.18 12.07 2.07 13.89 3.6 14.89C3.47 15.51 3.47 16.16 3.65 16.8C4.14 18.6 5.73 19.88 7.56 19.97C8.44 21.2 9.86 22 11.5 22C13.43 22 15.15 21.13 16.28 19.74C16.9 19.92 17.56 20 18.25 19.94C20.11 19.78 21.63 18.27 21.96 16.42C22.32 14.43 21.43 12.61 19.9 11.61C20.03 10.99 20.03 10.34 19.85 9.7C19.36 7.9 17.77 6.62 15.94 6.53C15.06 5.3 13.64 4.5 12 4.5Z" fill="white"/>
    </svg>
  );
}

export function VercelAILogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Vercel AI">
      <rect width="24" height="24" rx="6" fill="#000"/>
      <path d="M12 5L20 19H4L12 5Z" fill="white"/>
    </svg>
  );
}

export function PythonLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Python">
      <rect width="24" height="24" rx="6" fill="#3776AB"/>
      <path d="M11.9 4C9.18 4 7.3 5.13 7.3 6.73V8.5H12.1V9H6.3C4.7 9 3.3 10.15 3.3 12C3.3 13.85 4.7 15 6.3 15H7.3V13.27C7.3 11.67 9.18 10.5 11.9 10.5H16.7C18.3 10.5 19.7 9.35 19.7 7.5V6.73C19.7 5.13 17.82 4 15.1 4H11.9Z" fill="white"/>
      <path d="M12.1 20C14.82 20 16.7 18.87 16.7 17.27V15.5H11.9V15H17.7C19.3 15 20.7 13.85 20.7 12C20.7 10.15 19.3 9 17.7 9H16.7V10.73C16.7 12.33 14.82 13.5 12.1 13.5H7.3C5.7 13.5 4.3 14.65 4.3 16.5V17.27C4.3 18.87 6.18 20 8.9 20H12.1Z" fill="#FFD43B"/>
      <circle cx="10.5" cy="6.5" r="1" fill="#FFD43B"/>
      <circle cx="13.5" cy="17.5" r="1" fill="white"/>
    </svg>
  );
}

export function CrewAILogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="CrewAI">
      <rect width="24" height="24" rx="6" fill="#EF4444"/>
      <circle cx="8" cy="9" r="2.5" fill="white"/>
      <circle cx="16" cy="9" r="2.5" fill="white"/>
      <circle cx="12" cy="15" r="2.5" fill="white"/>
      <path d="M8 11.5C9.5 13 10.5 13 12 12.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M16 11.5C14.5 13 13.5 13 12 12.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

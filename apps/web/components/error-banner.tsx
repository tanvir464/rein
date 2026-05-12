import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

type Props = {
  title: string;
  body?: string;
  retry?: () => void;
};

export function ErrorBanner({ title, body, retry }: Props) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border"
      style={{
        backgroundColor: 'hsla(358, 75%, 59%, 0.06)',
        borderColor: 'hsla(358, 75%, 59%, 0.4)',
      }}
    >
      <AlertTriangle size={18} color="var(--danger)" className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="m-0 font-semibold text-[var(--fg)] text-sm">{title}</p>
        {body && <p className="m-0 text-[13px] text-[var(--muted)] mt-0.5">{body}</p>}
      </div>
      {retry && (
        <Button variant="ghost" size="sm" onClick={retry}>
          <RefreshCw size={14} />
          Retry
        </Button>
      )}
    </div>
  );
}

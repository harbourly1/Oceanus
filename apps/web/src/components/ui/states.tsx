import { AlertTriangle } from 'lucide-react';

export function EmptyState({ icon, title, message, action }: {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && <span className="mb-3" style={{ color: 'var(--color-text-muted)' }}>{icon}</span>}
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      {message && <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>{message}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-3"
        style={{ borderColor: 'var(--color-accent-blue)', borderTopColor: 'transparent' }} />
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <span className="mb-3" style={{ color: 'var(--color-accent-red)' }}><AlertTriangle size={32} /></span>
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-accent-red)' }}>Error</h3>
      <p className="text-xs mb-4 text-center" style={{ color: 'var(--color-text-muted)' }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-default)' }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  variant?: 'typing' | 'skeleton';
  label?: string;
  className?: string;
}

export function LoadingState({
  variant = 'typing',
  label = 'Searching document and drafting answer...',
  className,
}: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-3 animate-pulse', className)} aria-busy="true">
        <div className="h-4 w-3/4 rounded-md bg-surface" />
        <div className="h-4 w-1/2 rounded-md bg-surface" />
        <div className="h-20 w-full rounded-[var(--radius-md)] bg-surface" />
      </div>
    );
  }

  return (
    <div className={cn('flex items-start gap-2.5', className)} aria-live="polite">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rail text-accent">
        <Bot className="h-4 w-4" />
      </div>
      <div className="rounded-[var(--radius-bubble)] border border-border bg-bg px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
          </span>
          <span className="text-xs text-muted">{label}</span>
        </div>
      </div>
    </div>
  );
}

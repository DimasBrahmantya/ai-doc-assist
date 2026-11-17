import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  suggestions?: string[];
  onSelectSuggestion?: (prompt: string) => void;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  suggestions,
  onSelectSuggestion,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-surface/50 p-6 text-center',
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-bg text-text shadow-xs border border-border">
        {icon ?? <Sparkles className="h-5 w-5 text-accent" />}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-text">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-muted">{description}</p>

      {suggestions && suggestions.length > 0 && onSelectSuggestion && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {suggestions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSelectSuggestion(prompt)}
              className="rounded-full border border-border bg-bg px-3 py-1.5 text-xs text-text transition-colors hover:border-rail/30 hover:bg-surface cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

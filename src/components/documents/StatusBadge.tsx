import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentStatus } from '@/types';

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  DocumentStatus,
  {
    label: string;
    classes: string;
    icon: React.ComponentType<{ className?: string }>;
    spin?: boolean;
  }
> = {
  uploaded: {
    label: 'Uploaded',
    classes: 'bg-surface text-text border-border',
    icon: Clock,
  },
  processing: {
    label: 'Processing',
    classes: 'bg-accent/20 text-accent-foreground border-accent/40',
    icon: Loader2,
    spin: true,
  },
  ready: {
    label: 'Ready',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    classes: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertCircle,
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.classes,
        className,
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', config.spin && 'animate-spin')} />
      {config.label}
    </span>
  );
}

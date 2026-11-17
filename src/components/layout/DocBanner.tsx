'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';

interface DocBannerProps {
  fileName: string;
  documentId: string;
  onViewDoc?: () => void;
}

export function DocBanner({ fileName, documentId, onViewDoc }: DocBannerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-4 py-2 text-xs text-text lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted" />
        <p className="truncate">
          Ask me about <span className="font-medium">{fileName}</span>.
        </p>
      </div>

      {onViewDoc ? (
        <button
          type="button"
          onClick={onViewDoc}
          className="font-semibold text-text underline underline-offset-2 hover:text-rail/70 cursor-pointer"
        >
          View Doc
        </button>
      ) : (
        <Link
          href={`/documents/${documentId}`}
          className="font-semibold text-text underline underline-offset-2 hover:text-rail/70"
        >
          View Doc
        </Link>
      )}
    </div>
  );
}

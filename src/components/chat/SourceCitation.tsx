'use client';

import * as React from 'react';
import { FileText } from 'lucide-react';
import type { SourceCitationItem } from '@/types';

interface SourceCitationProps {
  citations: SourceCitationItem[];
  onSelectPage: (page: number) => void;
}

export function SourceCitation({ citations, onSelectPage }: SourceCitationProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (citations.length === 0) return null;

  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {citations.map((cit) => {
          const isExpanded = expandedId === cit.id;
          return (
            <button
              key={cit.id}
              type="button"
              onClick={() => {
                onSelectPage(cit.page);
                setExpandedId(isExpanded ? null : cit.id);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-text transition-colors hover:border-accent hover:bg-accent/20 cursor-pointer"
              title={`Jump to page ${cit.page}`}
            >
              <FileText className="h-3 w-3 text-muted" />
              <span>p.{cit.page}</span>
            </button>
          );
        })}
      </div>

      {expandedId && (
        <div className="rounded-[var(--radius-md)] border border-border bg-surface/70 p-2.5 text-xs text-muted">
          {(() => {
            const active = citations.find((c) => c.id === expandedId);
            if (!active) return null;
            return (
              <>
                <div className="mb-1 flex items-center justify-between font-medium text-text">
                  <span>
                    {active.fileName} — Page {active.page}
                  </span>
                </div>
                <p className="leading-relaxed">&ldquo;{active.snippet}&rdquo;</p>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

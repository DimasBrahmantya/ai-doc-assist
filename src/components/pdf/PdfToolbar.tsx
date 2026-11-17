'use client';

import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Highlighter,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfToolbarProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  selectTextMode: boolean;
  searchQuery: string;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onToggleSelectText: () => void;
  onSearchChange: (query: string) => void;
}

export function PdfToolbar({
  currentPage,
  totalPages,
  zoom,
  selectTextMode,
  searchQuery,
  onPageChange,
  onZoomChange,
  onToggleSelectText,
  onSearchChange,
}: PdfToolbarProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-bg px-3 py-2 text-xs text-text">
      {/* Left: Zoom & Tools */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onZoomChange(Math.max(60, zoom - 15))}
          disabled={zoom <= 60}
          title="Zoom out"
          aria-label="Zoom out"
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted hover:bg-surface hover:text-text disabled:opacity-40 cursor-pointer"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-10 text-center font-medium tabular-nums">
          {zoom}%
        </span>
        <button
          type="button"
          onClick={() => onZoomChange(Math.min(180, zoom + 15))}
          disabled={zoom >= 180}
          title="Zoom in"
          aria-label="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted hover:bg-surface hover:text-text disabled:opacity-40 cursor-pointer"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <div className="mx-1 h-4 w-px bg-border" />

        {searchOpen ? (
          <div className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1">
            <Search className="h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Find in doc..."
              autoFocus
              className="w-24 bg-transparent text-xs text-text placeholder:text-muted focus:outline-none sm:w-32"
            />
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                setSearchOpen(false);
              }}
              aria-label="Close search"
              className="text-muted hover:text-text cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            title="Search in document"
            aria-label="Search in document"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted hover:bg-surface hover:text-text cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleSelectText}
          title="Select a text"
          aria-label="Select a text"
          aria-pressed={selectTextMode}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-xs font-medium transition-colors cursor-pointer',
            selectTextMode
              ? 'bg-accent text-accent-foreground'
              : 'text-muted hover:bg-surface hover:text-text',
          )}
        >
          <Highlighter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Select text</span>
        </button>
      </div>

      {/* Right: Page Navigation */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted hover:bg-surface hover:text-text disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-1.5 text-xs font-medium tabular-nums text-text">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-muted hover:bg-surface hover:text-text disabled:opacity-40 cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

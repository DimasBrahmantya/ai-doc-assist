'use client';

import * as React from 'react';
import { FileText } from 'lucide-react';
import { MOCK_PDF_PAGES } from '@/mocks';
import { cn } from '@/lib/utils';
import { PdfToolbar } from './PdfToolbar';
import { SelectionToolbar, type SelectionAction } from './SelectionToolbar';

interface PdfViewerProps {
  documentId: string;
  fileName: string;
  totalPages: number;
  currentPage: number;
  highlightedPage?: number | null;
  onPageChange: (page: number) => void;
  onSelectionAction?: (action: SelectionAction, selectedText: string) => void;
}

export function PdfViewer({
  documentId,
  fileName,
  totalPages,
  currentPage,
  highlightedPage,
  onPageChange,
  onSelectionAction,
}: PdfViewerProps) {
  const [zoom, setZoom] = React.useState(100);
  const [selectTextMode, setSelectTextMode] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedText, setSelectedText] = React.useState('');

  const pageLines = React.useMemo(() => {
    const docPages = MOCK_PDF_PAGES[documentId];
    if (docPages?.[currentPage]) {
      return docPages[currentPage];
    }
    return [
      `${fileName} — Page ${currentPage}`,
      'Document preview shell (Phase 2). In Phase 8, react-pdf will render the signed PDF stream from /api/documents/:id/file.',
      `Section ${currentPage}.1: Key findings, operational metrics, and supporting details for page ${currentPage} of ${totalPages}.`,
    ];
  }, [documentId, currentPage, fileName, totalPages]);

  const handleMouseUp = () => {
    if (!selectTextMode) return;
    const selection = window.getSelection()?.toString().trim() ?? '';
    if (selection) {
      setSelectedText(selection);
    }
  };

  const isHighlighted = highlightedPage === currentPage;

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface/70">
      <div
        className="relative flex-1 overflow-auto p-4 sm:p-6"
        onMouseUp={handleMouseUp}
      >
        {selectTextMode && selectedText && (
          <SelectionToolbar
            selectedText={selectedText}
            onAction={(action, text) => onSelectionAction?.(action, text)}
            onDismiss={() => setSelectedText('')}
          />
        )}

        <div
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          className="mx-auto max-w-[620px] transition-transform duration-150"
        >
          <div
            className={cn(
              'min-h-[540px] rounded-[var(--radius-md)] border bg-bg p-6 sm:p-10 shadow-sm transition-all duration-300',
              isHighlighted
                ? 'border-accent ring-4 ring-accent/30'
                : 'border-border',
              selectTextMode ? 'select-text cursor-text' : 'select-none',
            )}
          >
            <div className="mb-6 flex items-center justify-between border-b border-border pb-3 text-[11px] text-muted">
              <span className="flex items-center gap-1.5 font-medium text-text">
                <FileText className="h-3.5 w-3.5 text-muted" />
                {fileName}
              </span>
              <span>Page {currentPage}</span>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-text">
              {pageLines.map((line, index) => {
                const matchesSearch =
                  searchQuery.trim().length > 0 &&
                  line.toLowerCase().includes(searchQuery.trim().toLowerCase());

                return (
                  <p
                    key={index}
                    className={cn(
                      index === 0 ? 'text-base font-semibold tracking-tight' : 'text-text/90',
                      matchesSearch && 'rounded bg-accent/25 px-1.5 py-0.5',
                    )}
                  >
                    {line}
                  </p>
                );
              })}

              <div className="mt-8 space-y-2.5 pt-4 border-t border-border/60">
                <div className="h-2.5 w-11/12 rounded bg-surface" />
                <div className="h-2.5 w-full rounded bg-surface" />
                <div className="h-2.5 w-4/5 rounded bg-surface" />
                <div className="h-2.5 w-9/12 rounded bg-surface" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <PdfToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        selectTextMode={selectTextMode}
        searchQuery={searchQuery}
        onPageChange={onPageChange}
        onZoomChange={setZoom}
        onToggleSelectText={() => {
          setSelectTextMode((prev) => !prev);
          setSelectedText('');
        }}
        onSearchChange={setSearchQuery}
      />
    </div>
  );
}

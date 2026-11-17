'use client';

import * as React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { cn } from '@/lib/utils';
import { PdfToolbar } from './PdfToolbar';
import { SelectionToolbar, type SelectionAction } from './SelectionToolbar';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfViewerProps {
  documentId: string;
  fileName: string;
  totalPages: number;
  currentPage: number;
  highlightedPage?: number | null;
  initialSignedUrl?: string | null;
  onPageChange: (page: number) => void;
  onTotalPagesLoaded?: (numPages: number) => void;
  onSelectionAction?: (action: SelectionAction, selectedText: string) => void;
}

const DOC_LOADING = <LoadingState label="Rendering PDF..." />;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MemoizedPdfViewer = React.memo(function PdfViewerInner({
  documentId,
  fileName,
  totalPages,
  currentPage,
  highlightedPage,
  initialSignedUrl,
  onPageChange,
  onTotalPagesLoaded,
  onSelectionAction,
}: PdfViewerProps) {
  const [zoom, setZoom] = React.useState(100);
  const [selectTextMode, setSelectTextMode] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedText, setSelectedText] = React.useState('');

  const [signedUrl, setSignedUrl] = React.useState<string | null>(
    initialSignedUrl ?? null,
  );
  const [isLoadingUrl, setIsLoadingUrl] = React.useState(!initialSignedUrl);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [numPages, setNumPages] = React.useState<number>(totalPages || 1);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const pdfDocRef = React.useRef<pdfjs.PDFDocumentProxy | null>(null);
  const onTotalPagesLoadedRef = React.useRef(onTotalPagesLoaded);
  onTotalPagesLoadedRef.current = onTotalPagesLoaded;

  const fetchSignedUrl = React.useCallback(async () => {
    setIsLoadingUrl(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/file`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data?.error?.message ?? 'Failed to load PDF file');
      }
      setSignedUrl(data.url as string);
      if (typeof data.totalPages === 'number' && data.totalPages > 0) {
        setNumPages(data.totalPages);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load PDF file',
      );
      setSignedUrl(null);
    } finally {
      setIsLoadingUrl(false);
    }
  }, [documentId]);

  React.useEffect(() => {
    if (initialSignedUrl) {
      setSignedUrl(initialSignedUrl);
      setIsLoadingUrl(false);
      setLoadError(null);
      return;
    }
    void fetchSignedUrl();
  }, [initialSignedUrl, fetchSignedUrl]);

  React.useEffect(() => {
    if (highlightedPage === currentPage) {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [highlightedPage, currentPage]);

  // Search across PDF pages only when query has >= 2 characters
  React.useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    const pdfDoc = pdfDocRef.current;
    if (q.length < 2 || !pdfDoc) return;

    let cancelled = false;
    const findMatchingPage = async () => {
      const checkPage = async (pageNum: number): Promise<boolean> => {
        const page = await pdfDoc.getPage(pageNum);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .toLowerCase();
        return text.includes(q);
      };

      try {
        if (await checkPage(currentPage)) return;
        for (let p = 1; p <= pdfDoc.numPages; p++) {
          if (cancelled) return;
          if (p === currentPage) continue;
          if (await checkPage(p)) {
            onPageChange(p);
            return;
          }
        }
      } catch {
        // Ignore transient pdf.js page read errors while typing
      }
    };

    const timer = setTimeout(() => {
      void findMatchingPage();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, currentPage, onPageChange]);

  const trimmedQuery = searchQuery.trim();
  const customTextRenderer = React.useMemo(() => {
    if (!trimmedQuery) return undefined;
    const regex = new RegExp(`(${escapeRegExp(escapeHtml(trimmedQuery))})`, 'gi');
    return ({ str }: { str: string }) => {
      const safe = escapeHtml(str);
      return safe.replace(
        regex,
        '<mark class="rounded-xs bg-accent/60 px-0.5 text-text">$1</mark>',
      );
    };
  }, [trimmedQuery]);

  const handleDocumentLoadSuccess = React.useCallback(
    (pdf: pdfjs.PDFDocumentProxy) => {
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);
      onTotalPagesLoadedRef.current?.(pdf.numPages);
    },
    [],
  );

  const handleDocumentLoadError = React.useCallback(() => {
    setLoadError('The PDF file could not be loaded or expired.');
  }, []);

  const docErrorNode = React.useMemo(
    () => (
      <ErrorState
        title="Failed to render PDF"
        message="The PDF preview could not be rendered."
        onRetry={() => void fetchSignedUrl()}
      />
    ),
    [fetchSignedUrl],
  );

  const handleMouseUp = () => {
    if (!selectTextMode) return;
    const selection = window.getSelection()?.toString().trim() ?? '';
    if (selection) {
      setSelectedText(selection);
    }
  };

  const effectiveTotalPages = Math.max(1, numPages || totalPages || 1);
  const clampedPage = Math.min(Math.max(1, currentPage), effectiveTotalPages);
  const isHighlighted = highlightedPage === clampedPage;

  const pageLoadingNode = React.useMemo(
    () => <LoadingState label={`Loading page ${clampedPage}...`} />,
    [clampedPage],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface/70">
      <div
        ref={scrollContainerRef}
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

        {isLoadingUrl ? (
          <div className="flex h-full items-center justify-center">
            <LoadingState label={`Loading ${fileName}...`} />
          </div>
        ) : loadError || !signedUrl ? (
          <div className="flex h-full items-center justify-center">
            <ErrorState
              title="Could not load PDF"
              message={loadError ?? 'Unable to access document file.'}
              onRetry={() => void fetchSignedUrl()}
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <div
              className={cn(
                'overflow-hidden rounded-[var(--radius-md)] border bg-bg shadow-sm transition-all duration-300',
                isHighlighted
                  ? 'border-accent ring-4 ring-accent/30'
                  : 'border-border',
                selectTextMode ? 'select-text cursor-text' : 'select-none',
              )}
            >
              <Document
                file={signedUrl}
                loading={DOC_LOADING}
                error={docErrorNode}
                onLoadSuccess={handleDocumentLoadSuccess}
                onLoadError={handleDocumentLoadError}
              >
                <Page
                  pageNumber={clampedPage}
                  scale={zoom / 100}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  customTextRenderer={customTextRenderer}
                  loading={pageLoadingNode}
                />
              </Document>
            </div>
          </div>
        )}
      </div>

      <PdfToolbar
        currentPage={clampedPage}
        totalPages={effectiveTotalPages}
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
});

export function PdfViewer(props: PdfViewerProps) {
  return <MemoizedPdfViewer {...props} />;
}

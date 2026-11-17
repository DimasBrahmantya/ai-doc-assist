'use client';

import * as React from 'react';
import { UploadDropzone } from '@/components/documents/UploadDropzone';
import { DocumentList } from '@/components/documents/DocumentList';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import type { DocumentRow } from '@/lib/supabase/types';
import type { DocumentItem } from '@/types';

const POLL_INTERVAL_MS = 2500;

function mapRowToItem(row: DocumentRow): DocumentItem {
  return {
    id: row.id,
    fileName: row.file_name,
    fileSizeBytes: row.file_size,
    totalPages: row.total_pages,
    status: row.status,
    createdAt: row.created_at,
    errorMessage: row.error_message ?? undefined,
  };
}

export default function DocumentsPage() {
  const [documents, setDocuments] = React.useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const fetchDocuments = React.useCallback(async () => {
    try {
      const res = await fetch('/api/documents', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Failed to load documents');
      }
      const rows = (data.documents ?? []) as DocumentRow[];
      setDocuments(rows.map(mapRowToItem));
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load documents',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const hasPendingDocs = documents.some(
    (d) => d.status === 'uploaded' || d.status === 'processing',
  );

  React.useEffect(() => {
    if (!hasPendingDocs) return;
    const timer = setInterval(() => {
      fetchDocuments();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasPendingDocs, fetchDocuments]);

  const triggerProcess = React.useCallback(
    async (docId: string) => {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? { ...d, status: 'processing', errorMessage: undefined }
            : d,
        ),
      );

      try {
        const res = await fetch(`/api/documents/${docId}/process`, {
          method: 'POST',
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message ?? 'Failed to process document');
        }
        if (data.document) {
          const updated = mapRowToItem(data.document as DocumentRow);
          setDocuments((prev) =>
            prev.map((d) => (d.id === docId ? updated : d)),
          );
        } else {
          await fetchDocuments();
        }
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : 'Failed to process document',
        );
        await fetchDocuments();
      }
    },
    [fetchDocuments],
  );

  const handleFilesSelected = async (files: File[]) => {
    setActionError(null);

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message ?? `Failed to upload ${file.name}`);
        }
        const created = mapRowToItem(data.document as DocumentRow);
        setDocuments((prev) => [created, ...prev]);
        void triggerProcess(created.id);
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : `Failed to upload ${file.name}`,
        );
      }
    }
  };

  const handleRetry = (docId: string) => {
    setActionError(null);
    void triggerProcess(docId);
  };

  const handleDelete = async (docId: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Failed to delete document');
      }
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to delete document',
      );
    }
  };

  return (
    <AppShell headerTitle="Documents">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-text">
              Your Documents
            </h2>
            <p className="mt-1 text-sm text-muted">
              Upload PDFs, track processing status, and start document-grounded chats.
            </p>
          </div>

          <UploadDropzone onFilesSelected={handleFilesSelected} />

          {actionError && (
            <div
              role="alert"
              className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {actionError}
            </div>
          )}

          {isLoading ? (
            <LoadingState label="Loading your documents..." />
          ) : loadError ? (
            <ErrorState
              title="Could not load documents"
              message={loadError}
              onRetry={fetchDocuments}
            />
          ) : (
            <DocumentList
              documents={documents}
              onRetry={handleRetry}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

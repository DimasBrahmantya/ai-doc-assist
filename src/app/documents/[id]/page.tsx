'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Layers,
  MessageSquare,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { StatusBadge } from '@/components/documents/StatusBadge';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { mapDocumentRow } from '@/lib/mappers';
import type { DocumentRow } from '@/lib/supabase/types';
import type { DocumentItem } from '@/types';

const POLL_INTERVAL_MS = 2500;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = React.useState<DocumentItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isStartingChat, setIsStartingChat] = React.useState(false);

  const fetchDocument = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${params.id}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Document not found');
      }
      setDoc(mapDocumentRow(data.document as DocumentRow));
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load document',
      );
      setDoc(null);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  React.useEffect(() => {
    void fetchDocument();
  }, [fetchDocument]);

  React.useEffect(() => {
    if (!doc || (doc.status !== 'uploaded' && doc.status !== 'processing')) {
      return;
    }
    const timer = setInterval(() => {
      void fetchDocument();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [doc, fetchDocument]);

  const handleRetryProcess = async () => {
    if (!doc) return;
    setActionError(null);
    setDoc((prev) =>
      prev ? { ...prev, status: 'processing', errorMessage: undefined } : prev,
    );
    try {
      const res = await fetch(`/api/documents/${doc.id}/process`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Failed to process document');
      }
      if (data.document) {
        setDoc(mapDocumentRow(data.document as DocumentRow));
      } else {
        await fetchDocument();
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to process document',
      );
      await fetchDocument();
    }
  };

  const handleStartChat = async () => {
    if (!doc) return;
    setActionError(null);
    setIsStartingChat(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Failed to start conversation');
      }
      window.dispatchEvent(new Event('conversations:refresh'));
      router.push(`/chat/${data.conversation.id}`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to start conversation',
      );
      setIsStartingChat(false);
    }
  };

  const handleDelete = async () => {
    if (!doc) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Failed to delete document');
      }
      setConfirmDelete(false);
      window.dispatchEvent(new Event('conversations:refresh'));
      router.push('/documents');
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to delete document',
      );
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <AppShell headerTitle="Document Details">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Documents
          </Link>

          {actionError && (
            <div
              role="alert"
              className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {actionError}
            </div>
          )}

          {isLoading ? (
            <LoadingState label="Loading document details..." />
          ) : loadError || !doc ? (
            <ErrorState
              title="Document not found"
              message={
                loadError ??
                'The requested document could not be found in your workspace.'
              }
              onRetry={() => router.push('/documents')}
              retryLabel="Go to Documents"
            />
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-border bg-bg p-6 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface text-text">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-text break-all">
                      {doc.fileName}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <StatusBadge status={doc.status} />
                      <span className="text-xs text-muted">
                        {formatBytes(doc.fileSizeBytes)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {doc.status === 'failed' && (
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => void handleRetryProcess()}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Retry
                    </Button>
                  )}
                  {doc.status === 'ready' && (
                    <Button
                      variant="primary"
                      size="md"
                      disabled={isStartingChat}
                      onClick={() => void handleStartChat()}
                    >
                      <MessageSquare className="h-4 w-4" />
                      {isStartingChat ? 'Opening...' : 'Chat'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="md"
                    disabled={isDeleting}
                    onClick={() => setConfirmDelete(true)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-3">
                <div className="rounded-[var(--radius-md)] bg-surface/60 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Layers className="h-3.5 w-3.5" />
                    <span>Total Pages</span>
                  </div>
                  <p className="mt-1 text-base font-semibold text-text">
                    {doc.totalPages ?? 'Pending'}
                  </p>
                </div>

                <div className="rounded-[var(--radius-md)] bg-surface/60 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Uploaded</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-text">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="rounded-[var(--radius-md)] bg-surface/60 p-3.5">
                  <div className="text-xs text-muted">File Size</div>
                  <p className="mt-1 text-base font-semibold text-text">
                    {formatBytes(doc.fileSizeBytes)}
                  </p>
                </div>
              </div>

              {doc.status === 'failed' && doc.errorMessage && (
                <div className="mt-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                  {doc.errorMessage}
                </div>
              )}
            </div>
          )}

          <ConfirmDialog
            open={confirmDelete}
            title="Delete document?"
            description={`"${doc?.fileName ?? ''}" and its indexed chunks will be permanently removed.`}
            confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
            onConfirm={() => void handleDelete()}
            onCancel={() => setConfirmDelete(false)}
          />
        </div>
      </div>
    </AppShell>
  );
}

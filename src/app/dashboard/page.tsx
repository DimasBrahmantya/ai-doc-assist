'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileText, MessageSquare } from 'lucide-react';
import { StatusBadge } from '@/components/documents/StatusBadge';
import { UploadDropzone } from '@/components/documents/UploadDropzone';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { mapConversationRow, mapDocumentRow } from '@/lib/mappers';
import type { ConversationRow, DocumentRow } from '@/lib/supabase/types';
import type { ConversationItemData, DocumentItem } from '@/types';

const POLL_INTERVAL_MS = 2500;

export default function DashboardPage() {
  const [documents, setDocuments] = React.useState<DocumentItem[]>([]);
  const [conversations, setConversations] = React.useState<ConversationItemData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const fetchOverview = React.useCallback(async () => {
    try {
      const [docRes, convRes] = await Promise.all([
        fetch('/api/documents', { cache: 'no-store' }),
        fetch('/api/conversations', { cache: 'no-store' }),
      ]);

      const docJson = await docRes.json();
      const convJson = await convRes.json();

      if (!docRes.ok) {
        throw new Error(docJson?.error?.message ?? 'Failed to load documents');
      }
      if (!convRes.ok) {
        throw new Error(convJson?.error?.message ?? 'Failed to load conversations');
      }

      const docs = ((docJson.documents ?? []) as DocumentRow[]).map(mapDocumentRow);
      const docsById = new Map(docs.map((d) => [d.id, d]));
      const convs = ((convJson.conversations ?? []) as ConversationRow[]).map(
        (row) => mapConversationRow(row, docsById),
      );

      setDocuments(docs);
      setConversations(convs);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load workspace overview',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const hasPendingDocs = documents.some(
    (d) => d.status === 'uploaded' || d.status === 'processing',
  );

  React.useEffect(() => {
    if (!hasPendingDocs) return;
    const timer = setInterval(() => {
      void fetchOverview();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasPendingDocs, fetchOverview]);

  const triggerProcess = async (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, status: 'processing', errorMessage: undefined } : d,
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
        const updated = mapDocumentRow(data.document as DocumentRow);
        setDocuments((prev) => prev.map((d) => (d.id === docId ? updated : d)));
        window.dispatchEvent(new Event('conversations:refresh'));
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to process document',
      );
      await fetchOverview();
    }
  };

  const handleQuickUpload = async (files: File[]) => {
    setUploadError(null);
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
        const created = mapDocumentRow(data.document as DocumentRow);
        setDocuments((prev) => [created, ...prev]);
        void triggerProcess(created.id);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : `Failed to upload ${file.name}`,
        );
      }
    }
  };

  const readyCount = documents.filter((d) => d.status === 'ready').length;

  return (
    <AppShell headerTitle="Dashboard">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-text">
              Workspace Overview
            </h2>
            <p className="mt-1 text-sm text-muted">
              Upload PDFs, monitor indexing status, and jump back into your conversations.
            </p>
          </div>

          {/* Summary Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-[var(--radius-lg)] border border-border bg-bg p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-medium text-muted">
                <span>Total Documents</span>
                <FileText className="h-4 w-4 text-muted" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-text tabular-nums">
                {documents.length}
              </p>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-border bg-bg p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-medium text-muted">
                <span>Ready to Chat</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-text tabular-nums">
                {readyCount}
              </p>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-border bg-bg p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-medium text-muted">
                <span>Conversations</span>
                <MessageSquare className="h-4 w-4 text-accent" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-text tabular-nums">
                {conversations.length}
              </p>
            </div>
          </div>

          {/* Quick Upload */}
          <UploadDropzone onFilesSelected={handleQuickUpload} />

          {uploadError && (
            <div
              role="alert"
              className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {uploadError}
            </div>
          )}

          {isLoading ? (
            <LoadingState label="Loading workspace overview..." />
          ) : loadError ? (
            <ErrorState
              title="Could not load workspace"
              message={loadError}
              onRetry={fetchOverview}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-[var(--radius-lg)] border border-border bg-bg p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text">Recent Documents</h3>
                  <Link
                    href="/documents"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-text"
                  >
                    View all
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                {documents.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="h-5 w-5 text-muted" />}
                    title="No documents yet"
                    description="Upload a PDF above to get started."
                  />
                ) : (
                  <div className="space-y-2.5">
                    {documents.slice(0, 4).map((doc) => (
                      <Link
                        key={doc.id}
                        href={`/documents/${doc.id}`}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border/70 px-3 py-2.5 hover:bg-surface/60 transition-colors"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <FileText className="h-4 w-4 shrink-0 text-muted" />
                          <span className="truncate text-xs font-medium text-text">
                            {doc.fileName}
                          </span>
                        </div>
                        <StatusBadge status={doc.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-[var(--radius-lg)] border border-border bg-bg p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text">
                    Recent Conversations
                  </h3>
                  {conversations[0] && (
                    <Link href={`/chat/${conversations[0].id}`}>
                      <Button variant="ghost" size="sm">
                        Open Chat
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
                {conversations.length === 0 ? (
                  <EmptyState
                    icon={<MessageSquare className="h-5 w-5 text-muted" />}
                    title="No conversations yet"
                    description="Process a document and click Chat to start asking questions."
                  />
                ) : (
                  <div className="space-y-2.5">
                    {conversations.slice(0, 4).map((conv) => (
                      <Link
                        key={conv.id}
                        href={`/chat/${conv.id}`}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border/70 px-3 py-2.5 hover:bg-surface/60 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-text">
                            {conv.title}
                          </p>
                          <p className="truncate text-[11px] text-muted">
                            {conv.documentName}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted">
                          {conv.updatedAt}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

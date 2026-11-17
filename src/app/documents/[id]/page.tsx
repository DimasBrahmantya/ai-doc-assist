'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, Layers, MessageSquare, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/documents/StatusBadge';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { MOCK_CONVERSATIONS, MOCK_DOCUMENTS } from '@/mocks';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const doc = MOCK_DOCUMENTS.find((d) => d.id === params.id);
  const linkedConversation =
    MOCK_CONVERSATIONS.find((c) => c.documentId === params.id) ??
    MOCK_CONVERSATIONS[0];

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

          {!doc ? (
            <ErrorState
              title="Document not found"
              message="The requested document could not be found in your workspace."
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
                  {doc.status === 'ready' && linkedConversation && (
                    <Link href={`/chat/${linkedConversation.id}`}>
                      <Button variant="primary" size="md">
                        <MessageSquare className="h-4 w-4" />
                        Chat
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="md"
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

              {doc.summary && (
                <div className="mt-6 border-t border-border pt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Summary
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text">
                    {doc.summary}
                  </p>
                </div>
              )}

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
            description={`"${doc?.fileName ?? ''}" will be permanently removed.`}
            confirmLabel="Delete"
            onConfirm={() => {
              setConfirmDelete(false);
              router.push('/documents');
            }}
            onCancel={() => setConfirmDelete(false)}
          />
        </div>
      </div>
    </AppShell>
  );
}

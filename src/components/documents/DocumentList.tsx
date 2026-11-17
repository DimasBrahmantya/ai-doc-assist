'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  FileText,
  MessageSquare,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import type { DocumentItem } from '@/types';
import { StatusBadge } from './StatusBadge';

interface DocumentListProps {
  documents: DocumentItem[];
  onRetry: (docId: string) => void;
  onDelete: (docId: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function DocumentList({ documents, onRetry, onDelete }: DocumentListProps) {
  const [deleteTarget, setDeleteTarget] = React.useState<DocumentItem | null>(null);

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5 text-muted" />}
        title="No documents yet"
        description="Upload a PDF above to start indexing and asking questions."
      />
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface/60 text-xs font-medium text-muted">
            <tr>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Pages</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-surface/40 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/documents/${doc.id}`}
                    className="flex items-center gap-2.5 font-medium text-text hover:underline"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted" />
                    <span className="truncate max-w-[260px]">{doc.fileName}</span>
                  </Link>
                  {doc.status === 'failed' && doc.errorMessage && (
                    <p className="mt-0.5 text-xs text-red-600">{doc.errorMessage}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted tabular-nums">
                  {doc.totalPages ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-muted tabular-nums">
                  {formatBytes(doc.fileSizeBytes)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={doc.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {doc.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRetry(doc.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Retry
                      </Button>
                    )}
                    {doc.status === 'ready' && (
                      <Link href="/chat/conv-1">
                        <Button variant="primary" size="sm">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Chat
                        </Button>
                      </Link>
                    )}
                    <Link href={`/documents/${doc.id}`}>
                      <Button variant="ghost" size="icon" title="Details" aria-label="View details">
                        <ExternalLink className="h-4 w-4 text-muted" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(doc)}
                      title="Delete document"
                      aria-label="Delete document"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="rounded-[var(--radius-lg)] border border-border bg-bg p-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/documents/${doc.id}`}
                className="flex min-w-0 items-center gap-2 font-medium text-sm text-text"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted" />
                <span className="truncate">{doc.fileName}</span>
              </Link>
              <StatusBadge status={doc.status} />
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs text-muted">
              <span>{doc.totalPages ? `${doc.totalPages} pages` : 'Pending pages'}</span>
              <span>•</span>
              <span>{formatBytes(doc.fileSizeBytes)}</span>
            </div>

            {doc.status === 'failed' && doc.errorMessage && (
              <p className="mt-2 text-xs text-red-600">{doc.errorMessage}</p>
            )}

            <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
              {doc.status === 'failed' && (
                <Button variant="outline" size="sm" onClick={() => onRetry(doc.id)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              )}
              {doc.status === 'ready' && (
                <Link href="/chat/conv-1">
                  <Button variant="primary" size="sm">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Chat
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(doc)}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete document?"
        description={`"${deleteTarget?.fileName ?? ''}" and its indexed chunks will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

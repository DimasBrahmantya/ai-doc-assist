'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileText, MessageSquare } from 'lucide-react';
import { UploadDropzone } from '@/components/documents/UploadDropzone';
import { StatusBadge } from '@/components/documents/StatusBadge';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { MOCK_CONVERSATIONS, MOCK_DOCUMENTS } from '@/mocks';
import type { DocumentItem } from '@/types';

export default function DashboardPage() {
  const [documents, setDocuments] = React.useState<DocumentItem[]>(MOCK_DOCUMENTS);
  const readyCount = documents.filter((d) => d.status === 'ready').length;

  const handleQuickUpload = (files: File[]) => {
    const added: DocumentItem[] = files.map((file, idx) => ({
      id: `doc-new-${Date.now()}-${idx}`,
      fileName: file.name,
      fileSizeBytes: file.size,
      totalPages: null,
      status: 'uploaded',
      createdAt: new Date().toISOString(),
    }));
    setDocuments((prev) => [...added, ...prev]);
  };

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
                {MOCK_CONVERSATIONS.length}
              </p>
            </div>
          </div>

          {/* Quick Upload */}
          <UploadDropzone onFilesSelected={handleQuickUpload} />

          {/* Recent Documents & Conversations */}
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
            </section>

            <section className="rounded-[var(--radius-lg)] border border-border bg-bg p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">
                  Recent Conversations
                </h3>
                <Link href="/chat/conv-1">
                  <Button variant="ghost" size="sm">
                    Open Chat
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-2.5">
                {MOCK_CONVERSATIONS.slice(0, 4).map((conv) => (
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
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

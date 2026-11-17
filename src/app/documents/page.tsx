'use client';

import * as React from 'react';
import { UploadDropzone } from '@/components/documents/UploadDropzone';
import { DocumentList } from '@/components/documents/DocumentList';
import { AppShell } from '@/components/layout/AppShell';
import { MOCK_DOCUMENTS } from '@/mocks';
import type { DocumentItem } from '@/types';

export default function DocumentsPage() {
  const [documents, setDocuments] = React.useState<DocumentItem[]>(MOCK_DOCUMENTS);

  const handleFilesSelected = (files: File[]) => {
    const newDocs: DocumentItem[] = files.map((file, idx) => ({
      id: `doc-upload-${Date.now()}-${idx}`,
      fileName: file.name,
      fileSizeBytes: file.size,
      totalPages: null,
      status: 'uploaded',
      createdAt: new Date().toISOString(),
    }));
    setDocuments((prev) => [...newDocs, ...prev]);
  };

  const handleRetry = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? { ...d, status: 'processing', errorMessage: undefined }
          : d,
      ),
    );
  };

  const handleDelete = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
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

          <DocumentList
            documents={documents}
            onRetry={handleRetry}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </AppShell>
  );
}

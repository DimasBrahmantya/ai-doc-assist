'use client';

import * as React from 'react';
import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
}

export function UploadDropzone({ onFilesSelected, className }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const pdfs = Array.from(fileList).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    );
    if (pdfs.length > 0) {
      onFilesSelected(pdfs);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius-lg)] border-2 border-dashed p-6 text-center transition-colors',
        isDragging
          ? 'border-accent bg-accent/10'
          : 'border-border bg-surface/50 hover:bg-surface/80',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rail text-accent shadow-xs">
        <FileUp className="h-5 w-5" />
      </div>

      <h3 className="mt-3 text-sm font-semibold text-text">
        Drop your PDF here, or browse
      </h3>
      <p className="mt-1 text-xs text-muted">
        Text-based PDFs up to 20 MB supported.
      </p>

      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => inputRef.current?.click()}
        className="mt-4"
      >
        Select PDF
      </Button>
    </div>
  );
}

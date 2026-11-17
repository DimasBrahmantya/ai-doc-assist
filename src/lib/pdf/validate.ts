import { z } from 'zod';
import { AppError } from '@/lib/errors/app-error';

const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d] as const; // %PDF-

export const pdfUploadMetaSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1, 'File name is required')
    .max(255, 'File name must be at most 255 characters')
    .refine(
      (name) => name.toLowerCase().endsWith('.pdf'),
      'Only .pdf files are allowed',
    ),
  fileSize: z
    .number()
    .int()
    .positive('File cannot be empty'),
  mimeType: z
    .string()
    .trim()
    .refine(
      (mime) => mime === 'application/pdf',
      'Invalid MIME type: expected application/pdf',
    ),
});

export type PdfUploadMeta = z.infer<typeof pdfUploadMetaSchema>;

/**
 * Checks whether the buffer starts with the `%PDF-` magic header
 * (allowing optional leading UTF-8 BOM or whitespace before `%PDF-` is disallowed
 * for strict security; we require `%PDF-` at byte offset 0).
 */
export function hasPdfMagicBytes(buffer: Uint8Array): boolean {
  if (buffer.byteLength < PDF_MAGIC_BYTES.length) {
    return false;
  }
  for (let i = 0; i < PDF_MAGIC_BYTES.length; i++) {
    if (buffer[i] !== PDF_MAGIC_BYTES[i]) {
      return false;
    }
  }
  return true;
}

export interface PdfUploadMetaInput {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Validates file metadata and byte buffer against size limit, MIME type, and PDF magic bytes.
 */
export function validatePdfUpload(
  meta: PdfUploadMetaInput,
  buffer: Uint8Array,
  maxUploadMb: number,
): PdfUploadMeta {
  const parsed = pdfUploadMetaSchema.parse(meta);
  const maxBytes = maxUploadMb * 1024 * 1024;

  if (buffer.byteLength === 0 || parsed.fileSize === 0) {
    throw new AppError('VALIDATION_ERROR', 'Uploaded PDF file is empty.', 400);
  }

  if (buffer.byteLength > maxBytes || parsed.fileSize > maxBytes) {
    throw new AppError(
      'VALIDATION_ERROR',
      `File exceeds the maximum upload limit of ${maxUploadMb} MB.`,
      400,
    );
  }

  if (!hasPdfMagicBytes(buffer)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Invalid PDF file: missing %PDF- header signature.',
      400,
    );
  }

  return parsed;
}

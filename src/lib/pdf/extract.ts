import { extractText, getDocumentProxy } from 'unpdf';
import { AppError } from '@/lib/errors/app-error';

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedPdfResult {
  totalPages: number;
  pages: ExtractedPdfPage[];
}

function classifyPdfLoadError(error: unknown): AppError {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (
    name === 'PasswordException' ||
    message.includes('password') ||
    message.includes('encrypted')
  ) {
    return new AppError(
      'VALIDATION_ERROR',
      'Encrypted or password-protected PDFs are not supported.',
      400,
    );
  }

  return new AppError(
    'VALIDATION_ERROR',
    'The uploaded PDF appears to be corrupt or unreadable.',
    400,
  );
}

/**
 * Verifies that a PDF buffer can be parsed and is not encrypted or corrupt.
 * Returns total page count.
 */
export async function verifyPdfReadable(
  buffer: Uint8Array,
  maxPages?: number,
): Promise<{ totalPages: number }> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | null = null;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer));
    const totalPages = pdf.numPages;

    if (!Number.isInteger(totalPages) || totalPages <= 0) {
      throw new AppError(
        'VALIDATION_ERROR',
        'The uploaded PDF contains no pages.',
        400,
      );
    }

    if (maxPages !== undefined && totalPages > maxPages) {
      throw new AppError(
        'VALIDATION_ERROR',
        `PDF has ${totalPages} pages, which exceeds the maximum limit of ${maxPages} pages.`,
        400,
      );
    }

    return { totalPages };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw classifyPdfLoadError(error);
  } finally {
    const disposable = pdf as { destroy?: () => Promise<void> } | null;
    if (disposable && typeof disposable.destroy === 'function') {
      await disposable.destroy().catch(() => {});
    }
  }
}

/**
 * Extracts text per page (1-based page numbers) from a PDF buffer.
 * Enforces `maxPages` and rejects encrypted or corrupt PDFs.
 */
export async function extractPdfPages(
  buffer: Uint8Array,
  maxPages: number,
): Promise<ExtractedPdfResult> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | null = null;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer));
    const totalPages = pdf.numPages;

    if (!Number.isInteger(totalPages) || totalPages <= 0) {
      throw new AppError(
        'VALIDATION_ERROR',
        'The uploaded PDF contains no pages.',
        400,
      );
    }

    if (totalPages > maxPages) {
      throw new AppError(
        'VALIDATION_ERROR',
        `PDF has ${totalPages} pages, which exceeds the maximum limit of ${maxPages} pages.`,
        400,
      );
    }

    const extracted = await extractText(pdf, { mergePages: false });
    const pageTexts = Array.isArray(extracted.text) ? extracted.text : [extracted.text];

    const pages: ExtractedPdfPage[] = pageTexts.map((text, idx) => ({
      pageNumber: idx + 1,
      text: text ?? '',
    }));

    return {
      totalPages,
      pages,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw classifyPdfLoadError(error);
  } finally {
    const disposable = pdf as { destroy?: () => Promise<void> } | null;
    if (disposable && typeof disposable.destroy === 'function') {
      await disposable.destroy().catch(() => {});
    }
  }
}

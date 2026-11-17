import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { AppError } from '@/lib/errors/app-error';
import { extractPdfPages, verifyPdfReadable } from '@/lib/pdf/extract';
import { hasPdfMagicBytes, validatePdfUpload } from '@/lib/pdf/validate';

async function createSamplePdf(pagesText: string[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const text of pagesText) {
    const page = pdfDoc.addPage([600, 400]);
    if (text) {
      page.drawText(text, { x: 50, y: 350, size: 12, font });
    }
  }

  return pdfDoc.save();
}

describe('PDF upload validation', () => {
  it('checks %PDF- magic bytes', () => {
    expect(hasPdfMagicBytes(Buffer.from('%PDF-1.7\n...'))).toBe(true);
    expect(hasPdfMagicBytes(Buffer.from('PK\x03\x04'))).toBe(false);
    expect(hasPdfMagicBytes(Buffer.from('%PD'))).toBe(false);
  });

  it('rejects empty files', () => {
    expect(() =>
      validatePdfUpload(
        { fileName: 'empty.pdf', fileSize: 0, mimeType: 'application/pdf' },
        new Uint8Array(0),
        10,
      ),
    ).toThrow();
  });

  it('rejects files exceeding maxUploadMb', () => {
    const twoMb = new Uint8Array(2 * 1024 * 1024);
    twoMb.set(Buffer.from('%PDF-'));
    expect(() =>
      validatePdfUpload(
        { fileName: 'big.pdf', fileSize: twoMb.byteLength, mimeType: 'application/pdf' },
        twoMb,
        1,
      ),
    ).toThrow(AppError);
  });

  it('rejects wrong MIME type and non-pdf extension', () => {
    const buf = Buffer.from('%PDF-1.4\n');
    expect(() =>
      validatePdfUpload(
        { fileName: 'doc.txt', fileSize: buf.byteLength, mimeType: 'application/pdf' },
        buf,
        10,
      ),
    ).toThrow();

    expect(() =>
      validatePdfUpload(
        { fileName: 'doc.pdf', fileSize: buf.byteLength, mimeType: 'text/plain' },
        buf,
        10,
      ),
    ).toThrow();
  });

  it('rejects files without %PDF- magic bytes even if MIME is application/pdf', () => {
    const fakePdf = Buffer.from('not really a pdf');
    expect(() =>
      validatePdfUpload(
        { fileName: 'fake.pdf', fileSize: fakePdf.byteLength, mimeType: 'application/pdf' },
        fakePdf,
        10,
      ),
    ).toThrow(/header signature/i);
  });

  it('rejects corrupt PDFs in verifyPdfReadable', async () => {
    const corrupt = Buffer.from('%PDF-1.7\n%corrupt-body-without-xref');
    await expect(verifyPdfReadable(corrupt, 200)).rejects.toThrow(
      /corrupt or unreadable/i,
    );
  });

  it('rejects PDFs exceeding maxPages', async () => {
    const pdfBytes = await createSamplePdf(['Page 1', 'Page 2', 'Page 3']);
    await expect(verifyPdfReadable(pdfBytes, 2)).rejects.toThrow(
      /exceeds the maximum limit/i,
    );
  });

  it('extracts text per page with 1-based page numbers', async () => {
    const pdfBytes = await createSamplePdf([
      'First page content',
      'Second page content',
    ]);
    const result = await extractPdfPages(pdfBytes, 10);

    expect(result.totalPages).toBe(2);
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]?.pageNumber).toBe(1);
    expect(result.pages[0]?.text).toContain('First page content');
    expect(result.pages[1]?.pageNumber).toBe(2);
    expect(result.pages[1]?.text).toContain('Second page content');
  });

  it('returns empty text for scanned/blank pages', async () => {
    const blankPdf = await createSamplePdf(['', '']);
    const result = await extractPdfPages(blankPdf, 10);

    expect(result.totalPages).toBe(2);
    expect(result.pages.every((p) => p.text.trim() === '')).toBe(true);
  });
});

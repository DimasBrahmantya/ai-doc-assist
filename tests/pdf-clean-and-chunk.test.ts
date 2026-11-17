import { describe, expect, it } from 'vitest';
import { cleanText } from '@/lib/pdf/clean';
import { chunkPages } from '@/lib/rag/chunk';

describe('cleanText', () => {
  it('removes null bytes, control chars, normalizes CRLF, and collapses whitespace', () => {
    const raw = 'Hello\u0000   world!\r\n\r\n\r\n  Line\t\t2 \u0007 \n  ';
    expect(cleanText(raw)).toBe('Hello world!\n\nLine 2');
  });

  it('returns empty string for empty or whitespace-only input', () => {
    expect(cleanText('')).toBe('');
    expect(cleanText('   \n\t\r\n  ')).toBe('');
  });
});

describe('chunkPages', () => {
  it('never crosses page boundaries', () => {
    const chunks = chunkPages(
      [
        { pageNumber: 1, text: 'Alpha beta gamma' },
        { pageNumber: 2, text: 'Delta epsilon zeta' },
      ],
      { chunkSize: 100, chunkOverlap: 20 },
    );

    expect(chunks).toEqual([
      { chunkIndex: 0, pageNumber: 1, content: 'Alpha beta gamma' },
      { chunkIndex: 1, pageNumber: 2, content: 'Delta epsilon zeta' },
    ]);
  });

  it('splits long pages with overlap and preserves sequential chunkIndex', () => {
    const page1Text = 'A'.repeat(120) + ' ' + 'B'.repeat(120);
    const chunks = chunkPages(
      [
        { pageNumber: 1, text: page1Text },
        { pageNumber: 2, text: '' },
        { pageNumber: 3, text: 'Page three short text' },
      ],
      { chunkSize: 150, chunkOverlap: 30 },
    );

    const page1Chunks = chunks.filter((c) => c.pageNumber === 1);
    const page2Chunks = chunks.filter((c) => c.pageNumber === 2);
    const page3Chunks = chunks.filter((c) => c.pageNumber === 3);

    expect(page1Chunks.length).toBeGreaterThanOrEqual(2);
    expect(page2Chunks).toHaveLength(0);
    expect(page3Chunks).toHaveLength(1);
    expect(chunks.map((c) => c.chunkIndex)).toEqual(
      chunks.map((_, i) => i),
    );
  });

  it('includes overlapping characters between consecutive chunks on the same page', () => {
    const text = '0123456789'.repeat(10); // 100 chars, no spaces
    const chunks = chunkPages(
      [{ pageNumber: 1, text }],
      { chunkSize: 40, chunkOverlap: 10 },
    );

    expect(chunks.length).toBeGreaterThan(2);
    // Tail of chunk 0 should match head of chunk 1
    expect(chunks[1]?.content.slice(0, 10)).toBe(chunks[0]?.content.slice(-10));
  });
});

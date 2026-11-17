export interface PageInput {
  pageNumber: number;
  text: string;
}

export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
}

export interface DocumentChunkOutput {
  chunkIndex: number;
  pageNumber: number;
  content: string;
}

/**
 * Finds a natural split point near `end` (within the second half of [start, end])
 * so chunks avoid cutting mid-word or mid-sentence when possible.
 */
function findSplitIndex(text: string, start: number, maxEnd: number): number {
  if (maxEnd >= text.length) return text.length;

  const minBreak = start + Math.floor((maxEnd - start) * 0.5);
  const windowText = text.slice(minBreak, maxEnd);

  const separators = ['\n\n', '\n', '. ', ' '];
  for (const sep of separators) {
    const idx = windowText.lastIndexOf(sep);
    if (idx !== -1) {
      return minBreak + idx + sep.length;
    }
  }

  return maxEnd;
}

/**
 * Splits cleaned per-page text into overlapping chunks.
 * Strictly preserves page boundaries: a chunk never spans across two pages.
 */
export function chunkPages(
  pages: PageInput[],
  options: ChunkOptions,
): DocumentChunkOutput[] {
  const chunkSize = Math.max(1, Math.floor(options.chunkSize));
  const chunkOverlap = Math.max(
    0,
    Math.min(Math.floor(options.chunkOverlap), chunkSize - 1),
  );

  const chunks: DocumentChunkOutput[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue;

    if (text.length <= chunkSize) {
      chunks.push({
        chunkIndex: chunkIndex++,
        pageNumber: page.pageNumber,
        content: text,
      });
      continue;
    }

    let start = 0;
    while (start < text.length) {
      const maxEnd = Math.min(text.length, start + chunkSize);
      const end = findSplitIndex(text, start, maxEnd);
      const slice = text.slice(start, end).trim();

      if (slice.length > 0) {
        chunks.push({
          chunkIndex: chunkIndex++,
          pageNumber: page.pageNumber,
          content: slice,
        });
      }

      if (end >= text.length) {
        break;
      }

      const nextStart = Math.max(start + 1, end - chunkOverlap);
      start = nextStart;
    }
  }

  return chunks;
}

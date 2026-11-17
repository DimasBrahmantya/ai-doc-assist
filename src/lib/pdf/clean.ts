/**
 * Cleans raw extracted PDF text while preserving paragraph breaks.
 * Pure function suitable for unit testing without I/O.
 */
export function cleanText(raw: string): string {
  if (!raw) return '';

  return (
    raw
      // Remove null bytes and ASCII control characters except \t, \n, \r
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      // Normalize CRLF / CR line endings to LF
      .replace(/\r\n?/g, '\n')
      // Collapse horizontal whitespace runs into a single space
      .replace(/[ \t\f\v]+/g, ' ')
      // Trim trailing/leading spaces on each line
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      // Collapse 3+ consecutive newlines into double newline
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

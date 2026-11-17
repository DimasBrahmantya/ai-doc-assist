import type {
  ConversationRow,
  DocumentRow,
  MessageRow,
} from '@/lib/supabase/types';
import type {
  ChatMessageItem,
  ConversationGroup,
  ConversationItemData,
  DocumentItem,
  SourceCitationItem,
} from '@/types';

export function mapDocumentRow(row: DocumentRow): DocumentItem {
  return {
    id: row.id,
    fileName: row.file_name,
    fileSizeBytes: row.file_size,
    totalPages: row.total_pages,
    status: row.status,
    createdAt: row.created_at,
    errorMessage: row.error_message ?? undefined,
  };
}

export function getConversationGroup(isoDate: string): ConversationGroup {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'EARLIER';

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return 'TODAY';
  if (date >= startOfYesterday) return 'YESTERDAY';
  return 'EARLIER';
}

export function formatShortTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  const group = getConversationGroup(isoDate);
  if (group === 'TODAY') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (group === 'YESTERDAY') {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function mapConversationRow(
  row: ConversationRow,
  docsById: Map<string, DocumentItem>,
): ConversationItemData {
  const doc = docsById.get(row.document_id);
  return {
    id: row.id,
    title: row.title,
    documentId: row.document_id,
    documentName: doc?.fileName ?? 'Document',
    group: getConversationGroup(row.created_at),
    updatedAt: formatShortTimestamp(row.created_at),
    messageCount: 0,
  };
}

export function mapMessageRow(
  row: MessageRow,
  documentId: string,
  fileName: string,
  insufficientOverride?: boolean,
): ChatMessageItem {
  const rawSources = Array.isArray(row.sources) ? row.sources : [];
  const citations: SourceCitationItem[] = rawSources.map((src, idx) => ({
    id: `${row.id}-${src.chunkId}-${idx}`,
    page: src.page,
    snippet: src.snippet,
    documentId,
    fileName,
  }));

  const lower = row.content.toLowerCase();
  const isInsufficientInfo =
    insufficientOverride ??
    (row.role === 'assistant' &&
      citations.length === 0 &&
      (lower.includes('does not contain enough information') ||
        lower.includes('tidak memiliki cukup informasi') ||
        lower.includes('tidak cukup informasi')));

  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: formatShortTimestamp(row.created_at),
    citations: citations.length > 0 ? citations : undefined,
    isInsufficientInfo,
  };
}

export function getUserInitials(
  email?: string | null,
  fullName?: string | null,
): string {
  const source = (fullName || email || 'U').trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0];
  const second = parts[1];
  if (first && second) {
    return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

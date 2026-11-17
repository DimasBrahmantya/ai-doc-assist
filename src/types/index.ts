export type DocumentStatus = 'uploaded' | 'processing' | 'ready' | 'failed';

export interface DocumentItem {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  totalPages: number | null;
  status: DocumentStatus;
  createdAt: string;
  errorMessage?: string;
  summary?: string;
}

export interface SourceCitationItem {
  id: string;
  page: number;
  snippet: string;
  documentId: string;
  fileName: string;
}

export type MessageRole = 'user' | 'assistant';

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  citations?: SourceCitationItem[];
  feedback?: 'like' | 'dislike' | null;
  isInsufficientInfo?: boolean;
}

export type ConversationGroup = 'TODAY' | 'YESTERDAY' | 'EARLIER';

export interface ConversationItemData {
  id: string;
  title: string;
  documentId: string;
  documentName: string;
  group: ConversationGroup;
  updatedAt: string;
  messageCount: number;
}

export interface MockUser {
  id: string;
  name: string;
  email: string;
  initials: string;
}

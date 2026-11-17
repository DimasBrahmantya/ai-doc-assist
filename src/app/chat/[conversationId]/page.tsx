'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { AppShell } from '@/components/layout/AppShell';
import { DocBanner } from '@/components/layout/DocBanner';
import type { SelectionAction } from '@/components/pdf/SelectionToolbar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { mapDocumentRow, mapMessageRow } from '@/lib/mappers';
import type {
  ConversationRow,
  DocumentRow,
  MessageRow,
} from '@/lib/supabase/types';
import { cn } from '@/lib/utils';
import type { ChatMessageItem, DocumentItem } from '@/types';

const PdfViewer = dynamic(
  () => import('@/components/pdf/PdfViewer').then((m) => m.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-surface/70">
        <LoadingState label="Loading PDF viewer..." />
      </div>
    ),
  },
);

const SUGGESTED_PROMPTS = [
  'Summarize the key points of this document.',
  'What are the main conclusions or findings?',
  'List any important dates, numbers, or action items.',
];

export default function ChatWorkspacePage() {
  const params = useParams<{ conversationId: string }>();
  const router = useRouter();
  const conversationId = params.conversationId;

  const [document, setDocument] = React.useState<DocumentItem | null>(null);
  const [signedFileUrl, setSignedFileUrl] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessageItem[]>([]);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = React.useState(true);
  const [workspaceError, setWorkspaceError] = React.useState<string | null>(null);

  const [inputValue, setInputValue] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [failedPrompt, setFailedPrompt] = React.useState<string | null>(null);

  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [highlightedPage, setHighlightedPage] = React.useState<number | null>(null);
  const [mobileTab, setMobileTab] = React.useState<'document' | 'chat'>('chat');

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const loadWorkspace = React.useCallback(async () => {
    setIsLoadingWorkspace(true);
    setWorkspaceError(null);
    try {
      const convRes = await fetch(`/api/conversations/${conversationId}`, {
        cache: 'no-store',
      });
      const convJson = await convRes.json();
      if (!convRes.ok) {
        throw new Error(
          convJson?.error?.message ?? 'Conversation not found',
        );
      }

      const conv = convJson.conversation as ConversationRow;
      const rawMessages = (convJson.messages ?? []) as MessageRow[];
      let docRow = convJson.document as DocumentRow | null | undefined;

      if (!docRow) {
        const docRes = await fetch(`/api/documents/${conv.document_id}`, {
          cache: 'no-store',
        });
        const docJson = await docRes.json();
        if (!docRes.ok) {
          throw new Error(docJson?.error?.message ?? 'Document not found');
        }
        docRow = docJson.document as DocumentRow;
      }

      const mappedDoc = mapDocumentRow(docRow);
      setDocument(mappedDoc);
      setSignedFileUrl(
        typeof convJson.signedFileUrl === 'string'
          ? convJson.signedFileUrl
          : null,
      );
      setTotalPages(mappedDoc.totalPages ?? 1);
      setMessages(
        rawMessages.map((msg) =>
          mapMessageRow(msg, mappedDoc.id, mappedDoc.fileName),
        ),
      );
      setCurrentPage(1);
      setHighlightedPage(null);
      setSendError(null);
      setFailedPrompt(null);
    } catch (err) {
      setWorkspaceError(
        err instanceof Error ? err.message : 'Failed to load conversation',
      );
    } finally {
      setIsLoadingWorkspace(false);
    }
  }, [conversationId]);

  React.useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending, sendError]);

  const handleJumpToPage = (page: number) => {
    setCurrentPage(page);
    setHighlightedPage(page);
    setMobileTab('document');
    setTimeout(() => {
      setHighlightedPage((prev) => (prev === page ? null : prev));
    }, 2500);
  };

  const handleSendMessage = React.useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? inputValue).trim();
      if (!text || isSending || !document) return;

      const tempId = `temp-user-${Date.now()}`;
      const optimisticUserMsg: ChatMessageItem = {
        id: tempId,
        conversationId,
        role: 'user',
        content: text,
        createdAt: 'Sending...',
      };

      setMessages((prev) => [...prev, optimisticUserMsg]);
      if (!overrideText) setInputValue('');
      setIsSending(true);
      setSendError(null);
      setFailedPrompt(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55_000);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId, message: text }),
          signal: controller.signal,
        });
        const rawText = await res.text();
        let data: Record<string, unknown> = {};
        try {
          data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
        } catch {
          data = {};
        }

        if (!res.ok) {
          const errObj = data.error as { message?: string } | undefined;
          throw new Error(errObj?.message ?? `Request failed (${res.status})`);
        }

        const persistedUser = mapMessageRow(
          data.userMessage as MessageRow,
          document.id,
          document.fileName,
        );
        const persistedAssistant = mapMessageRow(
          data.assistantMessage as MessageRow,
          document.id,
          document.fileName,
          Boolean(data.insufficientInfo),
        );

        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          persistedUser,
          persistedAssistant,
        ]);
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        const message =
          err instanceof Error && err.name === 'AbortError'
            ? 'Request timed out. Please try again.'
            : err instanceof Error
              ? err.message
              : 'Failed to send message';
        setSendError(message);
        setFailedPrompt(text);
      } finally {
        clearTimeout(timeoutId);
        setIsSending(false);
      }
    },
    [conversationId, document, inputValue, isSending],
  );

  const handleClearChat = async () => {
    if (!document || isSending) return;
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: document.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Failed to start new chat');
      }
      window.dispatchEvent(new Event('conversations:refresh'));
      router.push(`/chat/${data.conversation.id}`);
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : 'Failed to start new chat',
      );
    }
  };

  const handleFeedback = (messageId: string, feedback: 'like' | 'dislike') => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, feedback: m.feedback === feedback ? null : feedback }
          : m,
      ),
    );
  };

  const handleSelectionAction = React.useCallback(
    (action: SelectionAction, selectedText: string) => {
      setMobileTab('chat');
      void handleSendMessage(`${action}: "${selectedText}"`);
    },
    [handleSendMessage],
  );

  const handleTotalPagesLoaded = React.useCallback((n: number) => {
    setTotalPages(n);
  }, []);

  if (isLoadingWorkspace) {
    return (
      <AppShell activeConversationId={conversationId} headerTitle="Document Assistant">
        <div className="flex flex-1 items-center justify-center">
          <LoadingState label="Loading conversation..." />
        </div>
      </AppShell>
    );
  }

  if (workspaceError || !document) {
    return (
      <AppShell activeConversationId={conversationId} headerTitle="Document Assistant">
        <div className="flex flex-1 items-center justify-center p-6">
          <ErrorState
            title="Could not open conversation"
            message={workspaceError ?? 'Conversation or document not found.'}
            onRetry={() => void loadWorkspace()}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeConversationId={conversationId} headerTitle="Document Assistant">
      <DocBanner
        fileName={document.fileName}
        documentId={document.id}
        onViewDoc={() => setMobileTab('document')}
      />

      {/* Tablet & Mobile Tabs */}
      <div className="flex border-b border-border bg-bg lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('document')}
          className={cn(
            'flex-1 py-2.5 text-xs font-semibold transition-colors cursor-pointer',
            mobileTab === 'document'
              ? 'border-b-2 border-rail text-text'
              : 'text-muted hover:text-text',
          )}
        >
          Document
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={cn(
            'flex-1 py-2.5 text-xs font-semibold transition-colors cursor-pointer',
            mobileTab === 'chat'
              ? 'border-b-2 border-rail text-text'
              : 'text-muted hover:text-text',
          )}
        >
          Chat
        </button>
      </div>

      {/* Split Workspace: PDF Viewer (left) + Chat (right) */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* PDF Viewer Pane */}
        <section
          aria-label="PDF viewer"
          className={cn(
            'min-h-0 flex-1 border-border lg:w-1/2 lg:border-r',
            mobileTab === 'document' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col',
          )}
        >
          <PdfViewer
            documentId={document.id}
            fileName={document.fileName}
            totalPages={totalPages}
            currentPage={currentPage}
            highlightedPage={highlightedPage}
            initialSignedUrl={signedFileUrl}
            onPageChange={setCurrentPage}
            onTotalPagesLoaded={handleTotalPagesLoaded}
            onSelectionAction={handleSelectionAction}
          />
        </section>

        {/* Chat Pane */}
        <section
          aria-label="Chat assistant"
          className={cn(
            'min-h-0 flex-1 bg-bg lg:w-1/2',
            mobileTab === 'chat' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col',
          )}
        >
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 && !isSending ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState
                  title={`Ask anything about ${document.fileName}`}
                  description="Get instant answers grounded in your document with clickable page citations."
                  suggestions={SUGGESTED_PROMPTS}
                  onSelectSuggestion={(prompt) => void handleSendMessage(prompt)}
                />
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onSelectCitationPage={handleJumpToPage}
                    onFeedback={handleFeedback}
                  />
                ))}

                {isSending && <LoadingState variant="typing" />}

                {sendError && (
                  <ErrorState
                    title="Message failed"
                    message={sendError}
                    onRetry={
                      failedPrompt
                        ? () => void handleSendMessage(failedPrompt)
                        : undefined
                    }
                  />
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={() => void handleSendMessage()}
            onClearChat={() => void handleClearChat()}
            disabled={isSending || document.status !== 'ready'}
          />
        </section>
      </div>
    </AppShell>
  );
}

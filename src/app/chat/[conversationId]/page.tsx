'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { AppShell } from '@/components/layout/AppShell';
import { DocBanner } from '@/components/layout/DocBanner';
import { PdfViewer } from '@/components/pdf/PdfViewer';
import type { SelectionAction } from '@/components/pdf/SelectionToolbar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  MOCK_CONVERSATIONS,
  MOCK_DOCUMENTS,
  MOCK_MESSAGES_BY_CONVERSATION,
  MOCK_SUGGESTED_PROMPTS,
} from '@/mocks';
import { cn } from '@/lib/utils';
import type { ChatMessageItem } from '@/types';

export default function ChatWorkspacePage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;

  const conversation =
    MOCK_CONVERSATIONS.find((c) => c.id === conversationId) ??
    MOCK_CONVERSATIONS[0];
  const document =
    MOCK_DOCUMENTS.find((d) => d.id === conversation?.documentId) ??
    MOCK_DOCUMENTS[0];

  const [messages, setMessages] = React.useState<ChatMessageItem[]>(
    () => MOCK_MESSAGES_BY_CONVERSATION[conversationId] ?? [],
  );
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [highlightedPage, setHighlightedPage] = React.useState<number | null>(null);
  const [mobileTab, setMobileTab] = React.useState<'document' | 'chat'>('chat');

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMessages(MOCK_MESSAGES_BY_CONVERSATION[conversationId] ?? []);
    setCurrentPage(1);
    setHighlightedPage(null);
  }, [conversationId]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleJumpToPage = (page: number) => {
    setCurrentPage(page);
    setHighlightedPage(page);
    setTimeout(() => {
      setHighlightedPage((prev) => (prev === page ? null : prev));
    }, 2000);
  };

  const handleSendMessage = (overrideText?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessageItem = {
      id: `msg-user-${Date.now()}`,
      conversationId,
      role: 'user',
      content: text,
      createdAt: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!overrideText) setInputValue('');
    setIsLoading(true);

    setTimeout(() => {
      const targetPage = Math.min(4, document?.totalPages ?? 1);
      const botMsg: ChatMessageItem = {
        id: `msg-bot-${Date.now()}`,
        conversationId,
        role: 'assistant',
        content: `This is a Phase 2 UI preview response for "${text}". In Phase 8, this will stream grounded answers from Gemini with verified page citations [p.${targetPage}].`,
        createdAt: 'Just now',
        citations: [
          {
            id: `cit-${Date.now()}`,
            page: targetPage,
            documentId: document?.id ?? 'doc-1',
            fileName: document?.fileName ?? 'Document.pdf',
            snippet:
              'Simulated context snippet from the indexed document page.',
          },
        ],
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsLoading(false);
    }, 650);
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

  const handleSelectionAction = (action: SelectionAction, selectedText: string) => {
    setMobileTab('chat');
    handleSendMessage(`${action}: "${selectedText}"`);
  };

  const fileName = document?.fileName ?? 'Document.pdf';
  const totalPages = document?.totalPages ?? 10;

  return (
    <AppShell activeConversationId={conversationId} headerTitle="Document Assistant">
      <DocBanner
        fileName={fileName}
        documentId={document?.id ?? 'doc-1'}
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
            documentId={document?.id ?? 'doc-1'}
            fileName={fileName}
            totalPages={totalPages}
            currentPage={currentPage}
            highlightedPage={highlightedPage}
            onPageChange={setCurrentPage}
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
            {messages.length === 0 && !isLoading ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState
                  title={`Ask anything about ${fileName}`}
                  description="Get instant answers grounded in your document with clickable page citations."
                  suggestions={MOCK_SUGGESTED_PROMPTS}
                  onSelectSuggestion={(prompt) => handleSendMessage(prompt)}
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

                {isLoading && <LoadingState variant="typing" />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={() => handleSendMessage()}
            onClearChat={() => setMessages([])}
            disabled={isLoading}
          />
        </section>
      </div>
    </AppShell>
  );
}

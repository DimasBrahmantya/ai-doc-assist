'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_CONVERSATIONS, MOCK_DOCUMENTS, MOCK_USER } from '@/mocks';
import type { ConversationItemData } from '@/types';
import { AppHeader } from './AppHeader';
import { ConversationSidebar } from './ConversationSidebar';
import { IconRail } from './IconRail';

interface AppShellProps {
  activeConversationId?: string;
  headerTitle?: string;
  children: React.ReactNode;
}

export function AppShell({
  activeConversationId,
  headerTitle = 'Document Assistant',
  children,
}: AppShellProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [conversations, setConversations] =
    React.useState<ConversationItemData[]>(MOCK_CONVERSATIONS);

  const handleNewConversation = () => {
    const readyDoc = MOCK_DOCUMENTS.find((d) => d.status === 'ready') ?? MOCK_DOCUMENTS[0];
    const id = `conv-${Date.now()}`;
    const newConv: ConversationItemData = {
      id,
      title: 'New conversation',
      documentId: readyDoc?.id ?? 'doc-1',
      documentName: readyDoc?.fileName ?? 'Document.pdf',
      group: 'TODAY',
      updatedAt: 'Just now',
      messageCount: 0,
    };
    setConversations((prev) => [newConv, ...prev]);
    router.push(`/chat/${id}`);
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
    );
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      if (remaining[0]) {
        router.push(`/chat/${remaining[0].id}`);
      } else {
        router.push('/dashboard');
      }
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-text">
      <IconRail
        conversationCount={conversations.length}
        activeConversationId={activeConversationId ?? conversations[0]?.id}
        userInitials={MOCK_USER.initials}
      />

      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <AppHeader
          title={headerTitle}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

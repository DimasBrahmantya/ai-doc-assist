'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  getUserInitials,
  mapConversationRow,
  mapDocumentRow,
} from '@/lib/mappers';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import type { ConversationRow, DocumentRow } from '@/lib/supabase/types';
import type { ConversationItemData, DocumentItem } from '@/types';
import { AppHeader } from './AppHeader';
import { ConversationSidebar } from './ConversationSidebar';
import { IconRail } from './IconRail';
import {
  RailModals,
  type ActiveRailModal,
  type UserProfileInfo,
} from './RailModals';

const SIDEBAR_CACHE_TTL_MS = 15_000;
let sidebarCache: {
  conversations: ConversationItemData[];
  readyDocuments: DocumentItem[];
  fetchedAt: number;
} | null = null;

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
  const [conversations, setConversations] = React.useState<ConversationItemData[]>(
    () => sidebarCache?.conversations ?? [],
  );
  const [readyDocuments, setReadyDocuments] = React.useState<DocumentItem[]>(
    () => sidebarCache?.readyDocuments ?? [],
  );
  const [userInitials, setUserInitials] = React.useState('U');
  const [userProfile, setUserProfile] = React.useState<UserProfileInfo | null>(null);
  const [activeRailModal, setActiveRailModal] = React.useState<ActiveRailModal>(null);
  const [newChatModalOpen, setNewChatModalOpen] = React.useState(false);
  const [selectedDocId, setSelectedDocId] = React.useState<string>('');
  const [isCreatingChat, setIsCreatingChat] = React.useState(false);
  const [modalError, setModalError] = React.useState<string | null>(null);

  const loadSidebarData = React.useCallback(async (force = false) => {
    if (
      !force &&
      sidebarCache &&
      Date.now() - sidebarCache.fetchedAt < SIDEBAR_CACHE_TTL_MS
    ) {
      setConversations(sidebarCache.conversations);
      setReadyDocuments(sidebarCache.readyDocuments);
      return;
    }

    try {
      const [convRes, docRes] = await Promise.all([
        fetch('/api/conversations', { cache: 'no-store' }),
        fetch('/api/documents', { cache: 'no-store' }),
      ]);

      if (!convRes.ok || !docRes.ok) return;

      const convJson = await convRes.json();
      const docJson = await docRes.json();

      const docs = ((docJson.documents ?? []) as DocumentRow[]).map(mapDocumentRow);
      const docsById = new Map(docs.map((d) => [d.id, d]));
      const ready = docs.filter((d) => d.status === 'ready');

      setReadyDocuments(ready);
      if (ready.length > 0 && ready[0]) {
        const firstReadyId = ready[0].id;
        setSelectedDocId((prev) =>
          ready.some((d) => d.id === prev) ? prev : firstReadyId,
        );
      }

      const mappedConvs = ((convJson.conversations ?? []) as ConversationRow[]).map(
        (row) => mapConversationRow(row, docsById),
      );
      setConversations(mappedConvs);
      sidebarCache = {
        conversations: mappedConvs,
        readyDocuments: ready,
        fetchedAt: Date.now(),
      };
    } catch {
      // Sidebar refresh failures are non-fatal; user can retry via navigation
    }
  }, []);

  React.useEffect(() => {
    void loadSidebarData(false);
  }, [loadSidebarData, activeConversationId]);

  React.useEffect(() => {
    const handleRefresh = () => {
      sidebarCache = null;
      void loadSidebarData(true);
    };
    window.addEventListener('conversations:refresh', handleRefresh);
    return () => window.removeEventListener('conversations:refresh', handleRefresh);
  }, [loadSidebarData]);

  React.useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getSession().then((res: { data: { session: { user?: { id?: string; email?: string; user_metadata?: Record<string, unknown> } } | null } }) => {
      const user = res.data.session?.user;
      if (user) {
        const fullName =
          typeof user.user_metadata?.full_name === 'string'
            ? user.user_metadata.full_name
            : null;
        const initials = getUserInitials(user.email, fullName);
        setUserInitials(initials);
        setUserProfile({
          id: user.id ?? '',
          email: user.email ?? '',
          fullName,
          initials,
        });
      }
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    setActiveRailModal(null);
    router.push('/login');
    router.refresh();
  };

  const createAndNavigate = async (documentId: string) => {
    setIsCreatingChat(true);
    setModalError(null);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Failed to create conversation');
      }
      setNewChatModalOpen(false);
      await loadSidebarData();
      router.push(`/chat/${data.conversation.id}`);
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Failed to create conversation',
      );
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleNewConversation = () => {
    setModalError(null);
    if (readyDocuments.length === 1 && readyDocuments[0]) {
      void createAndNavigate(readyDocuments[0].id);
      return;
    }
    setNewChatModalOpen(true);
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    const previous = conversations;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
    );

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) {
        setConversations(previous);
      }
    } catch {
      setConversations(previous);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    const remaining = conversations.filter((c) => c.id !== id);
    const previous = conversations;
    setConversations(remaining);

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setConversations(previous);
        return;
      }

      if (activeConversationId === id) {
        if (remaining[0]) {
          router.push(`/chat/${remaining[0].id}`);
        } else {
          router.push('/dashboard');
        }
      }
    } catch {
      setConversations(previous);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-text">
      <IconRail
        conversationCount={conversations.length}
        activeConversationId={activeConversationId ?? conversations[0]?.id}
        userInitials={userInitials}
        onOpenHelp={() => setActiveRailModal('help')}
        onOpenSettings={() => setActiveRailModal('settings')}
        onOpenProfile={() => setActiveRailModal('profile')}
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

      {newChatModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-chat-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-bg p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 id="new-chat-title" className="text-base font-semibold text-text">
                Start New Conversation
              </h3>
              <button
                type="button"
                onClick={() => setNewChatModalOpen(false)}
                aria-label="Close modal"
                className="rounded-lg p-1 text-muted hover:bg-surface hover:text-text cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              </div>

            {readyDocuments.length === 0 ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted">
                  You don&apos;t have any processed PDFs ready for chat yet. Upload a
                  PDF first to start asking questions.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewChatModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setNewChatModalOpen(false);
                      router.push('/documents');
                    }}
                  >
                    Go to Documents
                  </Button>
                  </div>
                </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-muted">
                  Select a ready document to chat with:
                </p>
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {readyDocuments.map((doc) => (
                    <label
                      key={doc.id}
                      className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border border-border p-3 hover:bg-surface/60"
                    >
                      <input
                        type="radio"
                        name="new-chat-doc"
                        value={doc.id}
                        checked={selectedDocId === doc.id}
                        onChange={() => setSelectedDocId(doc.id)}
                        className="accent-rail"
                      />
                      <FileText className="h-4 w-4 shrink-0 text-muted" />
                      <span className="truncate text-sm font-medium text-text">
                        {doc.fileName}
                      </span>
                    </label>
                  ))}
                  </div>

                {modalError && (
                  <p className="text-xs text-red-600">{modalError}</p>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewChatModalOpen(false)}
                    disabled={isCreatingChat}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!selectedDocId || isCreatingChat}
                    onClick={() => void createAndNavigate(selectedDocId)}
                  >
                    {isCreatingChat ? 'Starting...' : 'Start Chat'}
                  </Button>
                  </div>
                </div>
            )}
            </div>
          </div>
      )}

      <RailModals
        activeModal={activeRailModal}
        onClose={() => setActiveRailModal(null)}
        user={userProfile}
        documentCount={readyDocuments.length}
        conversationCount={conversations.length}
        onRefreshCache={() => {
          sidebarCache = null;
          void loadSidebarData(true);
        }}
        onLogout={() => void handleLogout()}
      />
    </div>
  );
}

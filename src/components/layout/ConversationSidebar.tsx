'use client';

import * as React from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { ConversationGroup, ConversationItemData } from '@/types';
import { ConversationItem } from './ConversationItem';

const GROUP_ORDER: ConversationGroup[] = ['TODAY', 'YESTERDAY', 'EARLIER'];

interface ConversationSidebarProps {
  conversations: ConversationItemData[];
  activeConversationId?: string;
  onNewConversation: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  mobileOpen = false,
  onCloseMobile,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<ConversationItemData | null>(null);

  const filtered = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) || c.documentName.toLowerCase().includes(q),
    );
  }, [conversations, searchQuery]);

  const grouped = React.useMemo(() => {
    const map: Record<ConversationGroup, ConversationItemData[]> = {
      TODAY: [],
      YESTERDAY: [],
      EARLIER: [],
    };
    for (const item of filtered) {
      map[item.group].push(item);
    }
    return map;
  }, [filtered]);

  const sidebarBody = (
    <div className="flex h-full w-[280px] flex-col border-r border-border bg-bg">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <span className="text-base font-semibold tracking-tight text-text">
          AI Doc Assist
        </span>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-text lg:hidden cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-4 pb-3 space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for conversation"
            className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-surface/60 pl-9 pr-3 text-xs text-text placeholder:text-muted focus:bg-bg focus:outline-none focus:ring-2 focus:ring-rail/15"
          />
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            onNewConversation();
            onCloseMobile?.();
          }}
          className="w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {filtered.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-muted">
            No conversations found.
          </p>
        ) : (
          <div className="space-y-5">
            {GROUP_ORDER.map((group) => {
              const items = grouped[group];
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <p className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-muted">
                    {group}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === activeConversationId}
                        onRename={onRenameConversation}
                        onRequestDelete={setDeleteTarget}
                        onNavigate={onCloseMobile}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete conversation?"
        description={`"${deleteTarget?.title ?? ''}" will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteConversation(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <div className="hidden lg:block shrink-0">{sidebarBody}</div>

      {/* Tablet & Mobile slide-over drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden transition-opacity duration-200',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={onCloseMobile}
        />
        <div
          className={cn(
            'relative h-full w-[280px] transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {sidebarBody}
        </div>
      </div>
    </>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConversationItemData } from '@/types';

interface ConversationItemProps {
  conversation: ConversationItemData;
  isActive: boolean;
  onRename: (id: string, newTitle: string) => void;
  onRequestDelete: (conversation: ConversationItemData) => void;
  onNavigate?: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onRename,
  onRequestDelete,
  onNavigate,
}: ConversationItemProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState(conversation.title);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setDraftTitle(conversation.title);
  }, [conversation.title]);

  React.useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== conversation.title) {
      onRename(conversation.id, trimmed);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form onSubmit={handleRenameSubmit} className="px-2 py-1">
        <input
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={handleRenameSubmit}
          autoFocus
          className="w-full rounded-[var(--radius-sm)] border border-border bg-bg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-rail/20"
        />
      </form>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2 text-sm transition-colors',
        isActive ? 'bg-surface font-medium text-text' : 'text-text/80 hover:bg-surface/70',
      )}
    >
      <Link
        href={`/chat/${conversation.id}`}
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center gap-2.5"
      >
        <MessageSquare className="h-4 w-4 shrink-0 text-muted" />
        <span className="truncate text-[13px]">{conversation.title}</span>
      </Link>

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          aria-label="Conversation options"
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md text-muted transition-opacity hover:bg-bg hover:text-text cursor-pointer',
            menuOpen || isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-8 z-30 w-36 rounded-[var(--radius-md)] border border-border bg-bg py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setIsEditing(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text hover:bg-surface cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5 text-muted" />
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onRequestDelete(conversation);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

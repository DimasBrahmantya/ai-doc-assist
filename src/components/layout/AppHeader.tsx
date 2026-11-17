'use client';

import Link from 'next/link';
import { Bot, FileStack, Menu } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AppHeaderProps {
  title?: string;
  onOpenSidebar?: () => void;
}

export function AppHeader({
  title = 'Document Assistant',
  onOpenSidebar,
}: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-bg px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open conversations"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-border text-text hover:bg-surface lg:hidden cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-rail text-accent">
          <Bot className="h-4 w-4" />
          <span
            title="Online"
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg bg-emerald-500"
          />
        </div>

        <div>
          <h1 className="text-sm font-semibold text-text leading-tight">{title}</h1>
          <p className="text-[11px] text-emerald-600 font-medium">Online</p>
        </div>
      </div>

      <Link href="/documents">
        <Button variant="outline" size="sm">
          <FileStack className="h-4 w-4" />
          <span>Documents</span>
        </Button>
      </Link>
    </header>
  );
}

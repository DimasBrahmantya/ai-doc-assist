'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconRailProps {
  conversationCount: number;
  activeConversationId?: string;
  userInitials?: string;
}

export function IconRail({
  conversationCount,
  activeConversationId = 'conv-1',
  userInitials = 'DU',
}: IconRailProps) {
  const pathname = usePathname();

  const isChat = pathname.startsWith('/chat');
  const isDashboard = pathname.startsWith('/dashboard');
  const isDocuments = pathname.startsWith('/documents');

  const navItems = [
    {
      label: 'Chat',
      href: `/chat/${activeConversationId}`,
      icon: MessageSquare,
      active: isChat,
      badge: conversationCount,
    },
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: isDashboard,
    },
    {
      label: 'Upload',
      href: '/documents',
      icon: Upload,
      active: isDocuments,
    },
  ];

  return (
    <>
      {/* Desktop & Tablet Left Rail */}
      <aside
        aria-label="Primary navigation"
        className="hidden md:flex w-[72px] shrink-0 flex-col items-center justify-between bg-rail py-4 text-white"
      >
        <div className="flex flex-col items-center gap-6">
          <Link
            href="/dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-accent text-accent-foreground font-bold shadow-sm transition-transform hover:scale-105"
            title="AI Document Assistant"
          >
            <FileText className="h-5 w-5" />
          </Link>

          <nav className="flex flex-col items-center gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  className={cn(
                    'relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] transition-colors',
                    item.active
                      ? 'bg-white/15 text-accent'
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            title="Help"
            aria-label="Help"
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
          <button
            type="button"
            title="Settings"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <Settings className="h-5 w-5" />
          </button>
          <div
            title="Profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white"
          >
            {userInitials}
          </div>
          <Link
            href="/login"
            title="Logout"
            aria-label="Logout"
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
          </Link>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-white/10 bg-rail px-2 text-white md:hidden"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 px-3 py-1 text-[11px]',
                item.active ? 'text-accent' : 'text-white/70',
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/login"
          className="flex flex-col items-center justify-center gap-1 px-3 py-1 text-[11px] text-white/70"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </Link>
      </nav>
    </>
  );
}

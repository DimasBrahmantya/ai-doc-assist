'use client';

import * as React from 'react';
import {
  Check,
  FileText,
  HelpCircle,
  LogOut,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export type ActiveRailModal = 'help' | 'settings' | 'profile' | null;

export interface UserProfileInfo {
  id: string;
  email: string;
  fullName: string | null;
  initials: string;
}

interface RailModalsProps {
  activeModal: ActiveRailModal;
  onClose: () => void;
  user: UserProfileInfo | null;
  documentCount: number;
  conversationCount: number;
  onRefreshCache: () => void;
  onLogout: () => void;
}

const PREFS_STORAGE_KEY = 'ai_doc_assist_prefs_v1';

interface WorkspacePrefs {
  autoScrollCitations: boolean;
  compactCitations: boolean;
}

const DEFAULT_PREFS: WorkspacePrefs = {
  autoScrollCitations: true,
  compactCitations: false,
};

function loadPrefs(): WorkspacePrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<WorkspacePrefs>;
    return {
      autoScrollCitations:
        typeof parsed.autoScrollCitations === 'boolean'
          ? parsed.autoScrollCitations
          : DEFAULT_PREFS.autoScrollCitations,
      compactCitations:
        typeof parsed.compactCitations === 'boolean'
          ? parsed.compactCitations
          : DEFAULT_PREFS.compactCitations,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function RailModals({
  activeModal,
  onClose,
  user,
  documentCount,
  conversationCount,
  onRefreshCache,
  onLogout,
}: RailModalsProps) {
  const [prefs, setPrefs] = React.useState<WorkspacePrefs>(DEFAULT_PREFS);
  const [cacheRefreshed, setCacheRefreshed] = React.useState(false);

  React.useEffect(() => {
    if (activeModal === 'settings') {
      setPrefs(loadPrefs());
      setCacheRefreshed(false);
    }
  }, [activeModal]);

  React.useEffect(() => {
    if (!activeModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModal, onClose]);

  if (!activeModal) return null;

  const updatePref = (key: keyof WorkspacePrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  };

  const handleRefresh = () => {
    onRefreshCache();
    setCacheRefreshed(true);
    setTimeout(() => setCacheRefreshed(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rail-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-bg p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            {activeModal === 'help' && <HelpCircle className="h-5 w-5 text-rail" />}
            {activeModal === 'settings' && <Settings className="h-5 w-5 text-rail" />}
            {activeModal === 'profile' && <UserIcon className="h-5 w-5 text-rail" />}
            <h3 id="rail-modal-title" className="text-base font-semibold text-text">
              {activeModal === 'help' && 'Help & Quick Guide'}
              {activeModal === 'settings' && 'Workspace Settings'}
              {activeModal === 'profile' && 'Account Profile'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-muted hover:bg-surface hover:text-text cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {activeModal === 'help' && (
          <div className="mt-4 space-y-3 text-sm text-text">
            <div className="rounded-[var(--radius-md)] border border-border bg-surface/50 p-3 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <FileText className="h-4 w-4 text-rail" />
                <span>1. Upload & Index PDFs</span>
              </div>
              <p className="text-xs text-muted">
                Upload digital PDFs (max 10 MB, 200 pages). Each page is extracted,
                chunked, and indexed for semantic search.
              </p>
            </div>

            <div className="rounded-[var(--radius-md)] border border-border bg-surface/50 p-3 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <Sparkles className="h-4 w-4 text-rail" />
                <span>2. Ask & Jump to Citations</span>
              </div>
              <p className="text-xs text-muted">
                Ask questions in natural language. Click any <code>[p.N]</code>{' '}
                citation badge to jump directly to that page in the PDF viewer, or
                select text in the PDF to Summarize, Explain, or Translate.
              </p>
            </div>

            <div className="rounded-[var(--radius-md)] border border-border bg-surface/50 p-3 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4 text-rail" />
                <span>3. Grounded & Private</span>
              </div>
              <p className="text-xs text-muted">
                Answers are generated strictly from your document context. Your
                documents and conversations are isolated to your account.
              </p>
            </div>
          </div>
        )}

        {activeModal === 'settings' && (
          <div className="mt-4 space-y-4">
            <label className="flex cursor-pointer items-start justify-between gap-3 rounded-[var(--radius-md)] border border-border p-3 hover:bg-surface/40">
              <div>
                <p className="text-sm font-medium text-text">
                  Auto-jump on citation click
                </p>
                <p className="text-xs text-muted">
                  Smoothly scroll the PDF viewer when clicking a page citation.
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.autoScrollCitations}
                onChange={(e) => updatePref('autoScrollCitations', e.target.checked)}
                className="mt-1 h-4 w-4 accent-rail"
              />
            </label>

            <label className="flex cursor-pointer items-start justify-between gap-3 rounded-[var(--radius-md)] border border-border p-3 hover:bg-surface/40">
              <div>
                <p className="text-sm font-medium text-text">
                  Compact citation cards
                </p>
                <p className="text-xs text-muted">
                  Show shorter source previews below assistant responses.
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.compactCitations}
                onChange={(e) => updatePref('compactCitations', e.target.checked)}
                className="mt-1 h-4 w-4 accent-rail"
              />
            </label>

            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-surface/40 p-3">
              <div>
                <p className="text-xs font-medium text-text">Workspace Cache</p>
                <p className="text-xs text-muted">
                  {documentCount} ready docs · {conversationCount} conversations
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                {cacheRefreshed ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Synced
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {activeModal === 'profile' && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface/40 p-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rail text-sm font-semibold text-white">
                {user?.initials ?? 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {user?.fullName || user?.email || 'Authenticated User'}
                </p>
                {user?.email && (
                  <p className="truncate text-xs text-muted">{user.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <p className="text-lg font-semibold text-text">{documentCount}</p>
                <p className="text-xs text-muted">Ready PDFs</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <p className="text-lg font-semibold text-text">{conversationCount}</p>
                <p className="text-xs text-muted">Conversations</p>
              </div>
            </div>

            {user?.id && (
              <p className="truncate text-[11px] text-muted">
                Account ID: <code>{user.id}</code>
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={onLogout}>
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </Button>
            </div>
          </div>
        )}

        {activeModal !== 'profile' && (
          <div className="mt-5 flex justify-end">
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

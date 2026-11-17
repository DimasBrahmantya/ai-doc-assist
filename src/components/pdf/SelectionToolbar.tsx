'use client';

import { BookOpen, FileEdit, Sparkles } from 'lucide-react';

export type SelectionAction = 'Explain' | 'Summarise' | 'Rewrite';

interface SelectionToolbarProps {
  selectedText: string;
  onAction: (action: SelectionAction, text: string) => void;
  onDismiss: () => void;
}

export function SelectionToolbar({
  selectedText,
  onAction,
  onDismiss,
}: SelectionToolbarProps) {
  if (!selectedText.trim()) return null;

  const actions: Array<{ label: SelectionAction; icon: React.ComponentType<{ className?: string }> }> = [
    { label: 'Explain', icon: Sparkles },
    { label: 'Summarise', icon: BookOpen },
    { label: 'Rewrite', icon: FileEdit },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Text selection actions"
      className="sticky top-3 z-20 mx-auto flex w-fit items-center gap-1 rounded-full border border-border bg-rail px-2 py-1.5 text-white shadow-lg"
    >
      {actions.map(({ label, icon: Icon }) => (
        <button
          key={label}
          type="button"
          onClick={() => {
            onAction(label, selectedText);
            onDismiss();
          }}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white/90 transition-colors hover:bg-white/15 hover:text-accent cursor-pointer"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

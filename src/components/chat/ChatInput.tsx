'use client';

import * as React from 'react';
import { BrushCleaning, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onClearChat: () => void;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onClearChat,
  disabled = false,
}: ChatInputProps) {
  const canSend = value.trim().length > 0 && !disabled;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    onSend();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-border bg-bg p-3 sm:px-4"
    >
      <Button
        type="button"
        variant="accent"
        size="icon"
        onClick={onClearChat}
        title="Clear chat"
        aria-label="Clear chat"
        className="shrink-0 rounded-full"
      >
        <BrushCleaning className="h-4 w-4" />
      </Button>

      <div className="relative flex flex-1 items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Ask any question about your document"
          className="h-10 w-full rounded-full border border-border bg-surface/70 pl-4 pr-12 text-sm text-text placeholder:text-muted focus:bg-bg focus:outline-none focus:ring-2 focus:ring-rail/15 disabled:opacity-50"
        />
        <Button
          type="submit"
          variant="primary"
          size="icon"
          disabled={!canSend}
          aria-label="Send message"
          className="absolute right-1 h-8 w-8 rounded-full"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </form>
  );
}

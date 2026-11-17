'use client';

import * as React from 'react';
import { Bot, Check, Copy, Info, ThumbsDown, ThumbsUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessageItem } from '@/types';
import { SourceCitation } from './SourceCitation';

interface ChatMessageProps {
  message: ChatMessageItem;
  onSelectCitationPage: (page: number) => void;
  onFeedback?: (messageId: string, feedback: 'like' | 'dislike') => void;
}

export function ChatMessage({
  message,
  onSelectCitationPage,
  onFeedback,
}: ChatMessageProps) {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable in non-HTTPS contexts
    }
  };

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2.5">
        <div className="flex max-w-[82%] flex-col items-end">
          <div className="rounded-[var(--radius-bubble)] bg-rail px-4 py-3 text-sm leading-relaxed text-white shadow-xs">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className="mt-1 px-1 text-[11px] text-muted">{message.createdAt}</span>
        </div>
        <div className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-text border border-border">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rail text-accent">
        <Bot className="h-4 w-4" />
      </div>

      <div className="flex max-w-[85%] flex-col">
        <div className="rounded-[var(--radius-bubble)] border border-border bg-bg px-4 py-3 text-sm leading-relaxed text-text shadow-xs">
          {message.isInsufficientInfo && (
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-muted">
              <Info className="h-3 w-3" />
              <span>Insufficient information in document</span>
            </div>
          )}

          <p className="whitespace-pre-wrap">{message.content}</p>

          {message.citations && message.citations.length > 0 && (
            <SourceCitation
              citations={message.citations}
              onSelectPage={onSelectCitationPage}
            />
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-3 px-1 text-[11px] text-muted">
          <span>{message.createdAt}</span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy answer"
              aria-label="Copy answer"
              className="rounded p-1 hover:bg-surface hover:text-text cursor-pointer"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onFeedback?.(message.id, 'like')}
              title="Helpful"
              aria-label="Like answer"
              className={cn(
                'rounded p-1 hover:bg-surface hover:text-text cursor-pointer',
                message.feedback === 'like' && 'text-emerald-600',
              )}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onFeedback?.(message.id, 'dislike')}
              title="Not helpful"
              aria-label="Dislike answer"
              className={cn(
                'rounded p-1 hover:bg-surface hover:text-text cursor-pointer',
                message.feedback === 'dislike' && 'text-red-600',
              )}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

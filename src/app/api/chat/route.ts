import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError } from '@/lib/errors/app-error';
import { parseJsonBody } from '@/lib/validations/common';
import { chatRequestSchema } from '@/lib/validations/messages';
import { chatService } from '@/services/chat.service';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuth();
    const body = await parseJsonBody(request, chatRequestSchema);
    const result = await chatService.sendMessage(supabase, user.id, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

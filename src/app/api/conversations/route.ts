import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError } from '@/lib/errors/app-error';
import { parseJsonBody } from '@/lib/validations/common';
import { createConversationSchema } from '@/lib/validations/conversations';
import { conversationsService } from '@/services/conversations.service';

export async function GET() {
  try {
    const { supabase, user } = await requireAuth();
    const conversations = await conversationsService.listConversations(
      supabase,
      user.id,
    );
    return NextResponse.json({ conversations });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuth();
    const body = await parseJsonBody(request, createConversationSchema);
    const conversation = await conversationsService.createConversation(
      supabase,
      user.id,
      body,
    );
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

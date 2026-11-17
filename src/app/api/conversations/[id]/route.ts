import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError } from '@/lib/errors/app-error';
import { parseJsonBody } from '@/lib/validations/common';
import {
  conversationIdParamSchema,
  updateConversationSchema,
} from '@/lib/validations/conversations';
import { conversationsService } from '@/services/conversations.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = conversationIdParamSchema.parse(await context.params);
    const result = await conversationsService.getConversationWithMessages(
      supabase,
      id,
      user.id,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = conversationIdParamSchema.parse(await context.params);
    const body = await parseJsonBody(request, updateConversationSchema);
    const conversation = await conversationsService.renameConversation(
      supabase,
      id,
      user.id,
      body.title,
    );
    return NextResponse.json({ conversation });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = conversationIdParamSchema.parse(await context.params);
    const result = await conversationsService.deleteConversation(
      supabase,
      id,
      user.id,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

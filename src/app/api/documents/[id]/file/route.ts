import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError } from '@/lib/errors/app-error';
import { documentIdParamSchema } from '@/lib/validations/documents';
import { documentsService } from '@/services/documents.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = documentIdParamSchema.parse(await context.params);
    const result = await documentsService.getSignedFileUrl(supabase, id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

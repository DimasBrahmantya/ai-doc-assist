import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError } from '@/lib/errors/app-error';
import { documentIdParamSchema } from '@/lib/validations/documents';
import { documentsService } from '@/services/documents.service';

/**
 * Vercel Serverless Function max execution duration (seconds).
 * - Hobby plan: max 10s (60s with Fluid Compute enabled)
 * - Pro plan: up to 300s
 * Large PDFs with many pages/chunks may hit this limit; UI polls document status
 * and users can retry failed documents. For very large PDFs, a background queue
 * (e.g. Inngest / Trigger.dev) would be required.
 */
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { supabase, user } = await requireAuth();
    const { id } = documentIdParamSchema.parse(await context.params);
    const result = await documentsService.processDocument(supabase, id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

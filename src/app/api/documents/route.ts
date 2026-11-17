import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError } from '@/lib/errors/app-error';
import { documentsService } from '@/services/documents.service';

export async function GET() {
  try {
    const { supabase, user } = await requireAuth();
    const documents = await documentsService.listDocuments(supabase, user.id);
    return NextResponse.json({ documents });
  } catch (error) {
    return handleApiError(error);
  }
}

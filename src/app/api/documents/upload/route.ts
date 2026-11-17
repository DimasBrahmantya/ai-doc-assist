import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { AppError, handleApiError } from '@/lib/errors/app-error';
import { documentsService } from '@/services/documents.service';

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuth();

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new AppError(
        'BAD_REQUEST',
        'Invalid multipart/form-data request.',
        400,
      );
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new AppError(
        'VALIDATION_ERROR',
        'A PDF file is required in the "file" field.',
        400,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await documentsService.uploadDocument(supabase, user.id, {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      buffer,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

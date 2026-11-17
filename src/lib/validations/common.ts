import { z } from 'zod';
import { AppError } from '@/lib/errors/app-error';

export const uuidSchema = z.string().uuid('Invalid UUID format');

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AppError('BAD_REQUEST', 'Invalid JSON request body', 400);
  }
  return schema.parse(raw);
}

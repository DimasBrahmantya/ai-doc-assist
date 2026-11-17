import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(code: ErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  statusCode: number,
) {
  return NextResponse.json({ error: { code, message } }, { status: statusCode });
}

/**
 * Central API error handler. Logs full details on the server and returns a
 * safe `{ error: { code, message } }` payload without stack traces or internals.
 */
export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      console.error('[API Error]', error.code, error.message);
    }
    return errorResponse(error.code, error.message, error.statusCode);
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const detail = firstIssue
      ? `${firstIssue.path.join('.') || 'input'}: ${firstIssue.message}`
      : 'Invalid request input';
    return errorResponse('VALIDATION_ERROR', detail, 400);
  }

  console.error('[Unhandled API Error]', error);
  return errorResponse(
    'INTERNAL_ERROR',
    'An unexpected error occurred. Please try again later.',
    500,
  );
}

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError, ValidationError } from './errors';
import { logger } from './logger';

export function toApiResponse(e: unknown): NextResponse {
  if (e instanceof ZodError) {
    const message = e.issues.map((issue) => issue.message).join(', ');
    e = new ValidationError(message);
  }

  if (e instanceof AppError) {
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.httpStatus });
  }

  logger.error({ err: e }, 'unhandled_error');
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: '予期しないエラーが発生しました' } },
    { status: 500 }
  );
}

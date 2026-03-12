import { NextResponse } from 'next/server';
import { AppError, httpStatusFromError } from '@/core/errors';

export function handleApiError(error: unknown): NextResponse {
  const status = httpStatusFromError(error);

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status }
    );
  }

  console.error('Unhandled API error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

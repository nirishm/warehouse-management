import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const next = requestUrl.searchParams.get('next') || '/';
    const response = NextResponse.redirect(new URL(next, request.url));
    const supabase = createMiddlewareClient(request, response);
    await supabase.auth.exchangeCodeForSession(code);
    return response;
  }

  return NextResponse.redirect(new URL('/login', request.url));
}

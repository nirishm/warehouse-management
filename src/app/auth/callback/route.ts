import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '';
  // Only allow relative paths to prevent open-redirect attacks
  const next = rawNext.startsWith('/') ? rawNext : '';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url));
  }

  const cookieStore = await cookies();

  // Collect cookies emitted by Supabase so we can copy them onto the redirect
  // response. NextResponse.redirect() creates a new Response that does not
  // inherit cookies written to cookieStore, so we must replay them manually.
  // Use a Map keyed by cookie name so later setAll() calls overwrite earlier
  // values for the same cookie rather than duplicating them.
  const pendingCookies = new Map<
    string,
    { name: string; value: string; options: Record<string, unknown> }
  >();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Only update the Map — no cookieStore.set() needed because this
          // route always redirects; cookies are replayed onto the response below.
          cookiesToSet.forEach((c) => pendingCookies.set(c.name, c));
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', {
      code: error.code,
      message: error.message,
    });
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }

  // For password reset and email confirmation (?next=/set-password etc.)
  // go directly to the destination. For all other flows (OAuth, invite
  // acceptance) go to /auth/post-oauth which handles metadata sync.
  const destination = next || '/auth/post-oauth';

  const response = NextResponse.redirect(new URL(destination, request.url));
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(
      name,
      value,
      options as Parameters<typeof response.cookies.set>[2]
    );
  });

  return response;
}

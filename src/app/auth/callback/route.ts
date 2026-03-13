import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { syncUserAppMetadata } from '@/core/auth/sync-metadata';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/';
  const next = rawNext.startsWith('/') ? rawNext : '/';

  if (code) {
    const cookieStore = await cookies();
    // Capture cookies that Supabase sets during code exchange so we can
    // copy them onto the redirect response (NextResponse.redirect creates
    // a new Response that does NOT inherit cookieStore.set() calls).
    let responseCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            responseCookies = cookiesToSet;
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Sync app_metadata from DB on every login — catches stale JWTs,
      // role changes, and manually-added user_tenants records.
      // Wrapped in try/catch so sync failure doesn't block login.
      if (data.session?.user?.id) {
        try {
          await syncUserAppMetadata(data.session.user.id);
          // Force JWT re-mint so the redirect carries fresh app_metadata.
          // refreshSession() triggers setAll() internally, which overwrites
          // responseCookies with the new JWT containing updated claims.
          await supabase.auth.refreshSession();
        } catch (e) {
          console.error('Failed to sync app_metadata on login:', e);
        }
      }

      const response = NextResponse.redirect(new URL(next, request.url));
      // Explicitly set session cookies on the redirect response
      responseCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url));
}

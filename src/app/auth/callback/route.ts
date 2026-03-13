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
    // Map keyed by name so that a second setAll() call (from refreshSession)
    // merges with the first rather than replacing it entirely.
    const responseCookieMap = new Map<string, { name: string; value: string; options: Record<string, unknown> }>();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(c => responseCookieMap.set(c.name, c));
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log('[auth/callback] exchangeCodeForSession:', {
      success: !error,
      errorCode: error?.code,
      errorMessage: error?.message,
      userId: data.session?.user?.id ?? null,
      cookiesAfterExchange: Array.from(responseCookieMap.keys()),
    });

    if (error) {
      return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
    }

    // Sync app_metadata from DB on every login — catches stale JWTs,
    // role changes, and manually-added user_tenants records.
    // Wrapped in try/catch so sync failure doesn't block login.
    if (data.session?.user?.id) {
      // Snapshot the cookies from exchangeCodeForSession BEFORE refresh,
      // so we can restore them if refreshSession clears them.
      const preRefreshCookies = new Map(responseCookieMap);

      try {
        await syncUserAppMetadata(data.session.user.id);
        // Force JWT re-mint so the redirect carries fresh app_metadata.
        const { error: refreshError } = await supabase.auth.refreshSession();
        console.log('[auth/callback] refreshSession:', {
          success: !refreshError,
          errorMessage: refreshError?.message ?? null,
          cookiesAfterRefresh: Array.from(responseCookieMap.keys()),
        });

        // If refreshSession wiped the session cookies (rare but possible when
        // Supabase rejects the refresh), restore the original ones.
        const hasSessionAfterRefresh = Array.from(responseCookieMap.values()).some(
          c => c.value && c.value.length > 10
        );
        if (!hasSessionAfterRefresh) {
          console.log('[auth/callback] refreshSession cleared cookies — restoring from pre-refresh snapshot');
          preRefreshCookies.forEach((v, k) => responseCookieMap.set(k, v));
        }
      } catch (e) {
        // Restore cookies if something threw during refresh
        preRefreshCookies.forEach((v, k) => responseCookieMap.set(k, v));
        console.error('[auth/callback] sync/refresh failed:', {
          userId: data.session.user.id,
          error: e instanceof Error ? e.message : String(e),
          hasDbUrl: !!process.env.DATABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        });
      }
    }

    console.log('[auth/callback] redirecting to:', next, '— cookies being set:', Array.from(responseCookieMap.keys()));

    const response = NextResponse.redirect(new URL(next, request.url));
    // Explicitly set session cookies on the redirect response
    responseCookieMap.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url));
}

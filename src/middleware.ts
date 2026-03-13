import { type NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';
import { decodeJwt } from '@/core/auth/session';

/**
 * Routes that do not require authentication.
 * IMPORTANT: ZERO database calls in this middleware — JWT decode only.
 */
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/auth/callback',
  '/auth/post-oauth',
  '/reset-password',
  '/set-password',
  '/no-tenant',
  '/api/inngest',
  '/api/auth/sync',
];

function isPublicRoute(pathname: string): boolean {
  // Static assets are already excluded by the matcher config below,
  // but guard _next paths defensively.
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
    return true;
  }
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh Supabase session cookies (required by @supabase/ssr).
  const { supabase, response } = createMiddlewareClient(request);

  // Retrieve the current session. This is the ONLY Supabase call allowed here.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Allow unauthenticated access to public routes.
  if (isPublicRoute(pathname)) {
    return response;
  }

  // No session → redirect to login, preserving the intended destination.
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode JWT — no signature verification needed here; Supabase already
  // validated it when issuing the session above.
  const jwt = decodeJwt(session.access_token);

  if (!jwt) {
    // Malformed token — force re-login.
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { app_metadata } = jwt;

  const isSuperAdmin = app_metadata.is_super_admin === true;

  // Super-admins accessing /admin routes: allow without tenant context
  if (isSuperAdmin && (pathname.startsWith('/admin') || pathname.startsWith('/api/v1/admin'))) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', jwt.sub);
    requestHeaders.set('x-user-email', jwt.email);

    const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie);
    });
    return finalResponse;
  }

  // Determine which tenant context to use for this request.
  // Default to the primary tenant from app_metadata.
  let tenantId = app_metadata.tenant_id;
  let tenantSlug = app_metadata.tenant_slug;
  let role = app_metadata.role;
  let enabledModules = app_metadata.enabled_modules ?? [];

  // If the URL contains a [tenantSlug] segment that differs from the primary
  // tenant, check the memberships array for a matching entry and switch context.
  const urlSlugMatch = pathname.match(/^\/t\/([^/]+)/);
  if (urlSlugMatch) {
    const urlSlug = urlSlugMatch[1];
    if (urlSlug !== tenantSlug) {
      const membership = (app_metadata.memberships ?? []).find(
        (m) => m.slug === urlSlug,
      );
      if (membership) {
        tenantId = membership.tenantId;
        tenantSlug = membership.slug;
        role = membership.role;
        // Memberships do not carry module lists; fall back to an empty array.
        enabledModules = [];
      }
    }
  }

  // No tenant at all → super-admins go to /admin, others to /no-tenant.
  if (!tenantId) {
    if (isSuperAdmin) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/no-tenant', request.url));
  }

  // Inject tenant + user context as request headers so API routes can read
  // them via withTenantContext() without touching the database.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenantId);
  requestHeaders.set('x-tenant-slug', tenantSlug);
  requestHeaders.set('x-tenant-role', role);
  requestHeaders.set('x-tenant-modules', JSON.stringify(enabledModules));
  requestHeaders.set('x-user-id', jwt.sub);
  requestHeaders.set('x-user-email', jwt.email);

  // Build the final response, propagating Supabase cookie refreshes and our
  // new request headers.
  const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });

  // Copy any Supabase-set cookies from the session-refresh response.
  response.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie);
  });

  return finalResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

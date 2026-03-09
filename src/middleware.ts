import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

const PUBLIC_ROUTES = ['/login', '/register', '/auth/callback', '/reset-password', '/set-password', '/no-tenant'];
const LANDING_ROUTES = ['/'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Landing page — always accessible (no auth required)
  if (LANDING_ROUTES.includes(path)) {
    // Authenticated users: redirect to their default tenant dashboard
    if (user) {
      const { data: memberships } = await supabase
        .from('user_tenants')
        .select('tenant_id, is_default, tenants(slug)')
        .eq('user_id', user.id);

      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (superAdmin) return NextResponse.redirect(new URL('/admin', request.url));

      if (memberships?.length) {
        const defaultTenant = memberships.find(m => m.is_default) || memberships[0];
        const tenantData = defaultTenant.tenants as unknown as { slug: string };
        return NextResponse.redirect(new URL(`/t/${tenantData.slug}`, request.url));
      }

      // Auth'd but no memberships → access pending page
      return NextResponse.redirect(new URL('/no-tenant', request.url));
    }
    // Unauthenticated: show landing page
    return response;
  }

  // Public routes
  if (PUBLIC_ROUTES.some(r => path.startsWith(r))) {
    if (user) {
      // /set-password: users arrive authenticated from invite callback — let through
      if (path.startsWith('/set-password')) return response;

      // /reset-password: users arrive authenticated after code exchange — let through
      if (path.startsWith('/reset-password')) return response;

      // /no-tenant: let through, but if they now have memberships redirect to tenant
      if (path.startsWith('/no-tenant')) {
        const { data: memberships } = await supabase
          .from('user_tenants')
          .select('tenant_id, is_default, tenants(slug)')
          .eq('user_id', user.id);
        if (memberships?.length) {
          const defaultTenant = memberships.find(m => m.is_default) || memberships[0];
          const tenantData = defaultTenant.tenants as unknown as { slug: string };
          return NextResponse.redirect(new URL(`/t/${tenantData.slug}`, request.url));
        }
        return response;
      }

      // All other public routes: redirect auth'd users to home
      return NextResponse.redirect(new URL('/', request.url));
    }
    return response;
  }

  // Require auth
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Super admin routes
  if (path.startsWith('/admin')) {
    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!superAdmin) return NextResponse.redirect(new URL('/', request.url));
    return response;
  }

  // Tenant routes — resolve tenant from URL (both /t/[slug] and /api/t/[slug])
  const tenantMatch = path.match(/^(?:\/api)?\/t\/([^/]+)/);
  if (tenantMatch) {
    const slug = tenantMatch[1];
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, schema_name, status, enabled_modules')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (!tenant) return NextResponse.redirect(new URL('/', request.url));

    const { data: membership } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant.id)
      .single();

    if (!membership) return NextResponse.redirect(new URL('/', request.url));

    // Pass tenant context via request headers (forwarded to route handlers)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', tenant.id);
    requestHeaders.set('x-tenant-schema', tenant.schema_name);
    requestHeaders.set('x-tenant-role', membership.role);
    requestHeaders.set('x-tenant-modules', JSON.stringify(tenant.enabled_modules));
    const tenantResponse = NextResponse.next({ request: { headers: requestHeaders } });
    // Preserve cookies from original response (refreshed Supabase session tokens)
    response.cookies.getAll().forEach(cookie => {
      tenantResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return tenantResponse;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

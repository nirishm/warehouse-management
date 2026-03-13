import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { syncUserAppMetadata } from '@/core/auth/sync-metadata';

export async function POST() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user?.id) {
    return NextResponse.json({ error: 'No active session' }, { status: 401 });
  }

  try {
    await syncUserAppMetadata(session.user.id);
    const { data: refreshData } = await supabase.auth.refreshSession();
    const appMeta = refreshData.session?.user?.app_metadata ?? {};
    const tenantSlug = appMeta.tenant_slug ?? null;
    const isSuperAdmin = appMeta.is_super_admin === true;

    return NextResponse.json({ tenant_slug: tenantSlug, is_super_admin: isSuperAdmin });
  } catch (e) {
    console.error('Failed to sync metadata on password login:', e);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

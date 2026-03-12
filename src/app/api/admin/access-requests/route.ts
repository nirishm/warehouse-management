import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/core/auth/admin-guard';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  return withSuperAdmin(request, async () => {
    const admin = createAdminClient();
    const { data: requests, error } = await admin
      .from('access_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: requests });
  });
}

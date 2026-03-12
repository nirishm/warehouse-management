import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface SuperAdminContext {
  userId: string;
  userEmail: string;
}

export async function withSuperAdmin(
  request: NextRequest,
  handler: (ctx: SuperAdminContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: superAdmin } = await adminClient
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (!superAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return handler({ userId: user.id, userEmail: user.email ?? '' });
}

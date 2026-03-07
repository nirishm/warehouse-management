export interface Tenant {
  id: string;
  name: string;
  slug: string;
  schema_name: string;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  billing_notes: string | null;
  settings: Record<string, unknown>;
  enabled_modules: string[];
  max_users: number;
  max_locations: number;
  created_at: string;
  updated_at: string;
}

export interface UserTenant {
  id: string;
  user_id: string;
  tenant_id: string;
  role: 'tenant_admin' | 'manager' | 'employee';
  is_default: boolean;
  created_at: string;
}

export interface SuperAdmin {
  id: string;
  user_id: string;
  created_at: string;
}

export interface TenantModule {
  id: string;
  tenant_id: string;
  module_id: string;
  status: 'enabled' | 'disabled' | 'installing' | 'error';
  config: Record<string, unknown>;
  enabled_at: string | null;
  disabled_at: string | null;
}

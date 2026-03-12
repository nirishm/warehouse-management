export type Role = 'owner' | 'admin' | 'manager' | 'operator' | 'viewer';

export interface AppJwtPayload {
  sub: string; // user ID
  email: string;
  app_metadata: {
    tenant_id: string;
    tenant_slug: string;
    role: Role;
    enabled_modules: string[];
    memberships: Array<{
      tenantId: string;
      slug: string;
      role: Role;
    }>;
  };
}

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  role: Role;
  userId: string;
  userEmail: string;
  enabledModules: string[];
}

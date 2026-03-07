-- Tenants (organizations/companies)
CREATE TABLE public.tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    schema_name     TEXT NOT NULL UNIQUE,
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','trial','cancelled')),
    plan            TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free','starter','pro','enterprise')),
    billing_notes   TEXT,
    settings        JSONB NOT NULL DEFAULT '{}',
    enabled_modules TEXT[] NOT NULL DEFAULT ARRAY['inventory','user_management'],
    max_users       INT NOT NULL DEFAULT 5,
    max_locations   INT NOT NULL DEFAULT 3,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maps auth users to tenants (many-to-many)
CREATE TABLE public.user_tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'employee'
                    CHECK (role IN ('tenant_admin','manager','employee')),
    is_default      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, tenant_id)
);

-- Super admins (platform owners)
CREATE TABLE public.super_admins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Module enablement per tenant
CREATE TABLE public.tenant_modules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    module_id       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'enabled'
                    CHECK (status IN ('enabled','disabled','installing','error')),
    config          JSONB NOT NULL DEFAULT '{}',
    enabled_at      TIMESTAMPTZ DEFAULT now(),
    disabled_at     TIMESTAMPTZ,
    UNIQUE(tenant_id, module_id)
);

-- Indexes
CREATE INDEX idx_user_tenants_user ON public.user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant ON public.user_tenants(tenant_id);
CREATE INDEX idx_tenant_modules_tenant ON public.tenant_modules(tenant_id);

-- RLS on public tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

-- Policies: users see their own tenants
CREATE POLICY "Users view own tenants" ON public.tenants
    FOR SELECT USING (
        id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
    );

CREATE POLICY "Super admins manage tenants" ON public.tenants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
    );

CREATE POLICY "Users see own memberships" ON public.user_tenants
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admins manage memberships" ON public.user_tenants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
    );

CREATE POLICY "Super admins only" ON public.super_admins
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
    );

CREATE POLICY "Users view own tenant modules" ON public.tenant_modules
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
    );

CREATE POLICY "Super admins manage modules" ON public.tenant_modules
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
    );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

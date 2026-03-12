-- Rename underscore module IDs to kebab-case in all tenant rows
UPDATE public.tenants
SET enabled_modules = array_replace(
      array_replace(
        array_replace(enabled_modules, 'shortage_tracking', 'shortage-tracking'),
        'user_management', 'user-management'),
      'audit_trail', 'audit-trail');

-- Also update tenant_modules table (currently unused but may be activated later)
UPDATE public.tenant_modules SET module_id = 'shortage-tracking' WHERE module_id = 'shortage_tracking';
UPDATE public.tenant_modules SET module_id = 'user-management' WHERE module_id = 'user_management';
UPDATE public.tenant_modules SET module_id = 'audit-trail' WHERE module_id = 'audit_trail';

-- Update the default value for new tenants
ALTER TABLE public.tenants
  ALTER COLUMN enabled_modules SET DEFAULT ARRAY['inventory','user-management'];

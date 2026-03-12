-- Rename underscore module IDs to kebab-case in all tenant rows
UPDATE public.tenants
SET enabled_modules = array_replace(
      array_replace(
        array_replace(enabled_modules, 'shortage_tracking', 'shortage-tracking'),
        'user_management', 'user-management'),
      'audit_trail', 'audit-trail');

-- Update the default value for new tenants
ALTER TABLE public.tenants
  ALTER COLUMN enabled_modules SET DEFAULT ARRAY['inventory','user-management'];

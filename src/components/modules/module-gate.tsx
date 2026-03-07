'use client';

import { useTenant } from '@/components/layout/tenant-provider';

interface ModuleGateProps {
  moduleId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ModuleGate({ moduleId, children, fallback }: ModuleGateProps) {
  const tenant = useTenant();
  if (!tenant.enabledModules.includes(moduleId)) {
    return fallback ?? (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        <p>This module is not enabled for your organization.</p>
      </div>
    );
  }
  return <>{children}</>;
}

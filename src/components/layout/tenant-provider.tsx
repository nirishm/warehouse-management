'use client';

import { createContext, useContext } from 'react';
import type { TenantContext } from '@/core/auth/types';

const TenantCtx = createContext<TenantContext | null>(null);

export function TenantProvider({
  value,
  children,
}: {
  value: TenantContext;
  children: React.ReactNode;
}) {
  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantCtx);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}

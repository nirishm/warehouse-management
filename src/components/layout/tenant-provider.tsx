"use client";

import { createContext, useContext } from "react";

interface TenantContextValue {
  tenantId: string;
  tenantSlug: string;
  role: string;
  userId: string;
  userEmail: string;
  enabledModules: string[];
}

const TenantCtx = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: TenantContextValue;
}) {
  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantCtx);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}

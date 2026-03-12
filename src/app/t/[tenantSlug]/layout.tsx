import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TenantProvider } from "@/components/layout/tenant-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { ShortcutsProvider } from "@/components/keyboard-shortcuts/shortcuts-provider";
import { ShortcutsHelp } from "@/components/keyboard-shortcuts/shortcuts-help";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";
import { StockRealtimeListener } from "@/components/realtime/stock-realtime-listener";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");
  const tenantSlug = headersList.get("x-tenant-slug");
  const role = headersList.get("x-tenant-role");
  const modulesJson = headersList.get("x-tenant-modules");
  const userId = headersList.get("x-user-id");
  const userEmail = headersList.get("x-user-email");

  if (!tenantId || !tenantSlug || !role || !userId || !userEmail) {
    redirect("/login");
  }

  const enabledModules: string[] = modulesJson ? JSON.parse(modulesJson) : [];

  return (
    <TenantProvider
      value={{ tenantId, tenantSlug, role, userId, userEmail, enabledModules }}
    >
      <RealtimeProvider>
      <div className="flex min-h-screen">
        {/* Desktop sidebar — fixed, hidden on mobile */}
        <aside className="hidden md:flex md:w-[var(--sidebar-w)] md:flex-col md:fixed md:inset-y-0">
          <Sidebar />
        </aside>

        {/* Main content area */}
        <div className="flex-1 md:ml-[var(--sidebar-w)]">
          <Header />
          <main
            style={{ paddingBottom: "calc(var(--mobile-nav-h) + 24px)" }}
            className="px-[var(--content-px)] py-6 md:pb-6"
          >
            {children}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <MobileBottomNav />
      </div>

      {/* Onboarding wizard — renders as overlay when tenant has no data */}
      <OnboardingWizard />

      {/* Supabase Realtime — stock level + transfer change notifications */}
      <StockRealtimeListener />

      {/* Global keyboard shortcuts */}
      <ShortcutsProvider />
      <ShortcutsHelp />
      </RealtimeProvider>
    </TenantProvider>
  );
}

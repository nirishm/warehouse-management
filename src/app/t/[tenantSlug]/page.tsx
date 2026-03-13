import { headers } from "next/headers";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";
  return (
    <div style={{ backgroundColor: "var(--bg-off)" }} className="min-h-full">
      <DashboardClient tenantSlug={tenantSlug} />
    </div>
  );
}

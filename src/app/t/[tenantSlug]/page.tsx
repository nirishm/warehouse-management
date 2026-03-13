import { headers } from "next/headers";
import { DashboardClient } from "./dashboard-client";
import { OperatorHome } from "./operator-home";

export default async function TenantRootPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";
  const role = headersList.get("x-tenant-role") ?? "";

  if (role === "operator") {
    return (
      <div style={{ backgroundColor: "var(--bg-off)" }} className="min-h-full">
        <OperatorHome tenantSlug={tenantSlug} />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--bg-off)" }} className="min-h-full">
      <DashboardClient tenantSlug={tenantSlug} />
    </div>
  );
}

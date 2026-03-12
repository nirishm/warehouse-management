import { headers } from "next/headers";
import { StockAlertsClient } from "./stock-alerts-client";

export default async function StockAlertsPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";
  return (
    <div style={{ background: "var(--bg-off)" }} className="min-h-full">
      <StockAlertsClient tenantSlug={tenantSlug} />
    </div>
  );
}

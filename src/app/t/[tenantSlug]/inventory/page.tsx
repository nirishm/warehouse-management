import { headers } from "next/headers";
import { StockClient } from "./stock-client";

export default async function InventoryPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";

  return (
    <div style={{ background: "var(--bg-off)" }} className="min-h-full">
      <StockClient tenantSlug={tenantSlug} />
    </div>
  );
}

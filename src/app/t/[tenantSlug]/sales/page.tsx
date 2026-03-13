import { headers } from "next/headers";
import { SalesClient } from "./sales-client";

export default async function SalesPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";
  return (
    <div style={{ backgroundColor: "var(--bg-off)" }} className="min-h-full">
      <SalesClient tenantSlug={tenantSlug} />
    </div>
  );
}

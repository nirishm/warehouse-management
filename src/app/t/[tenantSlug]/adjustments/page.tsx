import { headers } from "next/headers";
import { AdjustmentsClient } from "./adjustments-client";

export default async function AdjustmentsPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";
  return (
    <div style={{ backgroundColor: "var(--bg-off)" }} className="min-h-full">
      <AdjustmentsClient tenantSlug={tenantSlug} />
    </div>
  );
}

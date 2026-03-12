import { headers } from "next/headers";
import { PurchasesClient } from "./purchases-client";

export default async function PurchasesPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";
  return (
    <div style={{ background: "var(--bg-off)" }} className="min-h-full">
      <PurchasesClient tenantSlug={tenantSlug} />
    </div>
  );
}

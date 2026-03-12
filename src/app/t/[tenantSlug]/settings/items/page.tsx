import { headers } from "next/headers";
import { ItemsClient } from "./items-client";

export default async function ItemsPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";

  return (
    <div style={{ background: "var(--bg-off)" }} className="min-h-full">
      <ItemsClient tenantSlug={tenantSlug} />
    </div>
  );
}

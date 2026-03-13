import { headers } from "next/headers";
import { TransfersClient } from "./transfers-client";

export default async function TransfersPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";
  return (
    <div style={{ backgroundColor: "var(--bg-off)" }} className="min-h-full">
      <TransfersClient tenantSlug={tenantSlug} />
    </div>
  );
}

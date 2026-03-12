import { headers } from "next/headers";
import { UnitsClient } from "./units-client";

export default async function UnitsPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";

  return (
    <div style={{ background: "var(--bg-off)" }} className="min-h-full">
      <UnitsClient tenantSlug={tenantSlug} />
    </div>
  );
}

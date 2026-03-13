import { headers } from "next/headers";
import { LocationsClient } from "./locations-client";

export default async function LocationsPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";

  return (
    <div style={{ backgroundColor: "var(--bg-off)" }} className="min-h-full">
      <LocationsClient tenantSlug={tenantSlug} />
    </div>
  );
}

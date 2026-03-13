import { headers } from "next/headers";
import { ShortageClient } from "./shortage-client";

export default async function ShortageTrackingPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";
  return (
    <div style={{ backgroundColor: "var(--bg-off)" }} className="min-h-full">
      <ShortageClient tenantSlug={tenantSlug} />
    </div>
  );
}

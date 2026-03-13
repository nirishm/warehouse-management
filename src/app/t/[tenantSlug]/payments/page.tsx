import { headers } from "next/headers";
import { PaymentsClient } from "./payments-client";

export default async function PaymentsPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";
  return (
    <div style={{ backgroundColor: "var(--bg-off)" }} className="min-h-full">
      <PaymentsClient tenantSlug={tenantSlug} />
    </div>
  );
}

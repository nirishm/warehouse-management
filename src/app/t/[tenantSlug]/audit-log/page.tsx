import { headers } from "next/headers";
import { AuditLogClient } from "./audit-log-client";

export default async function AuditLogPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";
  return (
    <div style={{ background: "var(--bg-off)" }} className="min-h-full">
      <AuditLogClient tenantSlug={tenantSlug} />
    </div>
  );
}

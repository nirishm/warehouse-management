import { headers } from "next/headers";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";

  return (
    <div style={{ background: "var(--bg-off)" }} className="min-h-full">
      <UsersClient tenantSlug={tenantSlug} />
    </div>
  );
}

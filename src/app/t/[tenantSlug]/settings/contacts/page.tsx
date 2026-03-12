import { headers } from "next/headers";
import { ContactsClient } from "./contacts-client";

export default async function ContactsPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";

  return (
    <div style={{ background: "var(--bg-off)" }} className="min-h-full">
      <ContactsClient tenantSlug={tenantSlug} />
    </div>
  );
}

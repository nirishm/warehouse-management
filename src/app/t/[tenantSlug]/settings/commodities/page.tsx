import { redirect } from 'next/navigation';

export default async function CommoditiesRedirect({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  redirect(`/t/${tenantSlug}/settings/items`);
}

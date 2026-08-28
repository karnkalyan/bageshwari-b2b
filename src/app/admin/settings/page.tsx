import Page from "@/app/s/[sellerSlug]/admin/settings/page";

export default async function AdminSettingsPage() {
  return Page({ params: Promise.resolve({ sellerSlug: "bageshwari" }) });
}

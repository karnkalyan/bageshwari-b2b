import Page from "@/app/s/[sellerSlug]/admin/brands/page";

export default function AdminBrandsAlias(props: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  return Page({
    params: Promise.resolve({ sellerSlug: "bageshwari" }),
    searchParams: props.searchParams,
  });
}

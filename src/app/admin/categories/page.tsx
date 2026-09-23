import Page from "@/app/s/[sellerSlug]/admin/categories/page";

export default function AdminCategoriesAlias(props: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  return Page({
    params: Promise.resolve({ sellerSlug: "bageshwari" }),
    searchParams: props.searchParams,
  });
}

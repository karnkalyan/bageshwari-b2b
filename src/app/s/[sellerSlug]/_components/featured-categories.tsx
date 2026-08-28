import Link from "next/link";
import { ArrowRight, BatteryCharging, Cog, Droplets, Package, Tractor, Wrench } from "lucide-react";

type Category = { id: string; name: string; slug: string; description?: string | null; _count: { products: number } };
type Props = { categories: Category[]; sellerSlug: string; section?: { title?: string | null; subtitle?: string | null } | null };

export function FeaturedCategories({ categories, sellerSlug, section }: Props) {
  const icons = [Tractor, Cog, Wrench, Package, Droplets, BatteryCharging];
  return <section className="bg-[#f7f9fc] py-12">
    <div className="site-container">
      <div className="mb-6 flex items-end justify-between"><div><div className="section-kicker">Browse the catalogue</div><h2 className="mt-1 text-2xl font-black text-[#092f5c]">{section?.title || "Featured product categories"}</h2></div><Link href="/products" className="hidden items-center gap-1 text-xs font-extrabold text-red-600 sm:flex">View all categories <ArrowRight className="h-4 w-4" /></Link></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {categories.map((category, index) => { const Icon = icons[index % icons.length]; return <Link key={category.id} href={`/products?category=${category.slug}`} className="group flex min-h-36 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-lg">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-[#0e4f94] group-hover:bg-red-50 group-hover:text-red-600"><Icon className="h-5 w-5" /></div>
          <div className="text-sm font-black text-[#092f5c]">{category.name}</div><div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{category.description || "Dealer-ready products and genuine parts"}</div><div className="mt-auto pt-3 text-[10px] font-bold text-red-600">{category._count.products.toLocaleString()} products</div>
        </Link>; })}
      </div>
    </div>
  </section>;
}

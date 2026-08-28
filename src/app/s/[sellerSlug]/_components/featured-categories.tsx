import Link from "next/link";
import { ArrowRight, BatteryCharging, Cog, Droplets, Package, Tractor, Wrench } from "lucide-react";

type Category = { id: string; name: string; slug: string; description?: string | null; _count: { products: number } };
type Props = { categories: Category[]; sellerSlug: string; section?: { title?: string | null; subtitle?: string | null } | null };

export function FeaturedCategories({ categories, sellerSlug, section }: Props) {
  const icons = [Tractor, Cog, Wrench, Package, Droplets, BatteryCharging];
  
  return (
    <section className="bg-[#050505] py-16 border-b border-slate-800">
      <div className="site-container">
        <div className="mb-10 flex items-end justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="inline-block rounded-full bg-blue-950 px-3 py-1 text-[10px] font-bold text-blue-400 mb-3">
              Browse the catalogue
            </div>
            <h2 className="text-3xl font-black text-white">{section?.title || "Featured Product Categories"}</h2>
          </div>
          <Link href="/products" className="group hidden items-center gap-2 text-sm font-bold text-red-500 hover:text-red-400 sm:flex transition-colors">
            View all categories <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {categories.map((category, index) => { 
            const Icon = icons[index % icons.length]; 
            return (
              <Link 
                key={category.id} 
                href={`/products?category=${category.slug}`} 
                className="group flex min-h-40 flex-col rounded-2xl bg-slate-900 p-5 shadow-xl transition-all hover:-translate-y-2 hover:bg-slate-800 hover:shadow-2xl hover:shadow-blue-900/20 border-none"
              >
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-slate-800 text-blue-400 group-hover:bg-red-950 group-hover:text-red-400 transition-colors">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-sm font-black text-white">{category.name}</div>
                <div className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-400">
                  {category.description || "Dealer-ready products and genuine parts"}
                </div>
                <div className="mt-auto pt-4 text-xs font-bold text-red-500">
                  {category._count.products.toLocaleString()} products
                </div>
              </Link>
            ); 
          })}
        </div>
      </div>
    </section>
  );
}

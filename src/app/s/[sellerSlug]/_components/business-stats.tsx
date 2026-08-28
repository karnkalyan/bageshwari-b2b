import { Grid3X3, Package, Users, Warehouse } from "lucide-react";

export function BusinessStats({ stats }: { stats: { products: number; categories: number; dealers: number; warehouses: number } }) {
  const items = [
    [Package, stats.products, "Catalogue products"], 
    [Grid3X3, stats.categories, "Product categories"], 
    [Users, stats.dealers, "Active dealers"], 
    [Warehouse, stats.warehouses, "Active warehouses"]
  ];
  return (
    <section className="bg-[#0A0A0B] py-12 border-b border-slate-800">
      <div className="site-container grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map(([Icon, value, label]) => { 
          const StatIcon = Icon as React.ElementType; 
          return (
            <div key={label as string} className="flex items-center justify-center gap-4 px-6 py-5 rounded-2xl bg-[#111113] border-none shadow-xl transition-transform hover:-translate-y-1 hover:bg-slate-900">
              <StatIcon className="h-10 w-10 text-red-600" />
              <div>
                <div className="text-3xl font-black text-white">{Number(value).toLocaleString()}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-1">{label as string}</div>
              </div>
            </div>
          ); 
        })}
      </div>
    </section>
  );
}

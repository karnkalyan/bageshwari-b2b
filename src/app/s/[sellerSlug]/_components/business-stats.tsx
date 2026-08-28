import { Grid3X3, Package, Users, Warehouse } from "lucide-react";

export function BusinessStats({ stats }: { stats: { products: number; categories: number; dealers: number; warehouses: number } }) {
  const items = [[Package, stats.products, "Catalogue products"], [Grid3X3, stats.categories, "Product categories"], [Users, stats.dealers, "Active dealers"], [Warehouse, stats.warehouses, "Active warehouses"]];
  return <section className="border-y border-slate-200 bg-white py-8"><div className="site-container grid grid-cols-2 divide-x divide-slate-200 lg:grid-cols-4">{items.map(([Icon, value, label]) => { const StatIcon = Icon as React.ElementType; return <div key={label as string} className="flex items-center justify-center gap-3 px-4 py-3"><StatIcon className="h-7 w-7 text-red-600" /><div><div className="text-xl font-black text-[#092f5c]">{Number(value).toLocaleString()}</div><div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label as string}</div></div></div>; })}</div></section>;
}

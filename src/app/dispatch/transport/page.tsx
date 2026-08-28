import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";

export default async function TransportPage() {
  const ctx = await getTenantContext("bageshwari");
  const companies = await prisma.transportCompany.findMany({
    where: { sellerId: ctx.sellerId, status: "ACTIVE" },
    include: { drivers: { where: { status: "ACTIVE" } }, vehicles: { where: { status: "ACTIVE" } } },
    orderBy: { name: "asc" },
  });
  return <section className="p-6"><div className="mb-5"><h2 className="text-2xl font-black text-[#092f5c]">Transportation directory</h2><p className="mt-1 text-sm text-slate-500">Drivers and vehicles are constrained to their selected transport company.</p></div><div className="grid gap-4 lg:grid-cols-2">{companies.map((company) => <article key={company.id} className="rounded-xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><h3 className="font-black text-[#092f5c]">{company.name}</h3><span className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{company.status}</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Drivers</div>{company.drivers.map((driver) => <div key={driver.id} className="mt-2 text-xs font-semibold text-slate-700">{driver.name}</div>)}</div><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Vehicles</div>{company.vehicles.map((vehicle) => <div key={vehicle.id} className="mt-2 text-xs font-semibold text-slate-700">{vehicle.vehicleNumber}</div>)}</div></div></article>)}</div></section>;
}

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Boxes, FileCheck2, LockKeyhole, PackageCheck, Truck, ShoppingCart, LayoutDashboard, ChevronRight } from "lucide-react";

type HeroSectionProps = {
  section?: { title?: string | null; subtitle?: string | null } | null;
  seller: { tradingName: string };
  sellerSlug: string;
  isDealer?: boolean;
  isStaff?: boolean;
};

export function HeroSection({ section, seller, sellerSlug, isDealer = false, isStaff = false }: HeroSectionProps) {
  const base = "";
  return (
    <section className="relative overflow-hidden bg-[#0A0A0B] dark:bg-[#050505] min-h-[700px] flex items-center">
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-red-600/20 blur-[120px] mix-blend-screen" />
        <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen" />
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] mix-blend-screen" />
      </div>
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
      
      <div className="site-container relative z-10 grid min-h-[520px] items-center gap-12 py-20 lg:grid-cols-[1fr_1fr] lg:py-16">
        <div className="relative z-10 max-w-2xl animate-in slide-in-from-bottom-8 duration-700 fade-in fill-mode-both">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-sm font-semibold text-red-400 mb-6 backdrop-blur-md">
            <BadgeCheck className="h-4 w-4" /> B2B Dealer Network Active
          </div>
          <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-white md:text-7xl">
            Powering Dealers with{" "}
            <span className="block mt-2 bg-gradient-to-r from-red-500 via-rose-400 to-orange-500 bg-clip-text text-transparent">
              Smart Tractor Ordering
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-slate-300">
            {section?.subtitle || `${seller.tradingName} connects authorized dealers with tractors, genuine spare parts, implements and workshop products through one secure B2B ordering platform.`}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={`${base}/products`}
              className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-red-500 px-8 py-4 text-sm font-bold text-white shadow-[0_0_40px_-10px_rgba(220,38,38,0.5)] transition-all hover:scale-105 hover:shadow-[0_0_60px_-15px_rgba(220,38,38,0.7)]"
            >
              Explore Catalogue 
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            {isDealer ? (
              <Link
                href="/dealer/dashboard"
                className="group inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 backdrop-blur-md px-8 py-4 text-sm font-bold text-white transition-all hover:bg-slate-700/50 hover:border-slate-600"
              >
                <LayoutDashboard className="h-4 w-4 text-blue-400" /> Dealer Portal
              </Link>
            ) : isStaff ? (
              <Link
                href="/admin/dashboard"
                className="group inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 backdrop-blur-md px-8 py-4 text-sm font-bold text-white transition-all hover:bg-slate-700/50 hover:border-slate-600"
              >
                <LayoutDashboard className="h-4 w-4 text-emerald-400" /> Staff Workspace
              </Link>
            ) : (
              <Link
                href="/dealer/login"
                className="group inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 backdrop-blur-md px-8 py-4 text-sm font-bold text-white transition-all hover:bg-slate-700/50 hover:border-slate-600"
              >
                <LockKeyhole className="h-4 w-4 text-amber-400" /> Dealer Login
              </Link>
            )}
          </div>
          
          <div className="mt-14 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4 animate-in slide-in-from-bottom-8 duration-700 delay-200 fade-in fill-mode-both">
            {[ [Boxes,"Complete Catalogue","text-blue-400", "bg-blue-500/10"], [FileCheck2,"Proforma Workflow","text-emerald-400", "bg-emerald-500/10"], [PackageCheck,"Warehouse Picking","text-violet-400", "bg-violet-500/10"], [Truck,"Dispatch Tracking","text-amber-400", "bg-amber-500/10"] ].map(([Icon, label, color, bg]) => {
              const ItemIcon = Icon as React.ElementType;
              return (
                <div key={label as string} className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-4 text-center transition-all hover:-translate-y-1 hover:bg-slate-800/80 hover:border-slate-700">
                  <div className={`p-3 rounded-full ${bg as string}`}>
                    <ItemIcon className={`h-6 w-6 ${color as string}`} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-300 leading-tight">{label as string}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative min-h-[400px] lg:min-h-[600px] flex items-center justify-center animate-in zoom-in-95 duration-1000 delay-300 fade-in fill-mode-both">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-transparent to-transparent z-10 lg:hidden" />
          <Image
            src="/images/bageshwari-tractor-hero.png"
            alt="Red agricultural tractor available through the Bageshwari Tractors dealer platform"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain object-center drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-0 transition-transform duration-700 hover:scale-105"
          />
          
          {/* Floating Glass Card */}
          <div className="absolute bottom-10 right-4 lg:-right-4 w-[280px] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-2xl z-20 transition-transform hover:-translate-y-2 duration-300">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-sm font-black text-white">B2B Dealer Portal</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {isDealer ? "Unlocked Pricing Active" : "Secure order workspace"}
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 border border-red-500/30">
                <LockKeyhole className="h-5 w-5 text-red-400" />
              </div>
            </div>
            <div className="space-y-3 text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-3"><FileCheck2 className="h-4 w-4 text-blue-400" /> Review and confirm proforma</div>
              <div className="flex items-center gap-3"><PackageCheck className="h-4 w-4 text-emerald-400" /> Follow warehouse fulfillment</div>
              <div className="flex items-center gap-3"><Truck className="h-4 w-4 text-amber-400" /> Track dispatched shipments</div>
            </div>
            {isDealer ? (
              <Link
                href="/dealer/dashboard"
                className="group mt-5 flex items-center justify-between rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-xs font-extrabold text-white hover:bg-white/20 transition-all"
              >
                Go to dealer portal <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <Link
                href="/dealer/login"
                className="group mt-5 flex items-center justify-between rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-xs font-extrabold text-white hover:bg-white/20 transition-all"
              >
                Access secure portal <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

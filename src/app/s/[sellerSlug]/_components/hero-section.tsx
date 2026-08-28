import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Boxes, FileCheck2, LockKeyhole, PackageCheck, Truck, ShoppingCart, LayoutDashboard } from "lucide-react";

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
    <section className="relative overflow-hidden bg-card">
      {/* Gradient background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-transparent to-red-50/50" />
      <div className="absolute inset-0 b2b-grid" />

      <div className="site-container relative grid min-h-[520px] items-center gap-8 py-14 lg:grid-cols-[.9fr_1.1fr] lg:py-10">
        <div className="relative z-10 max-w-2xl animate-fade-in">
          <div className="section-kicker mb-4 flex items-center gap-2">
            <BadgeCheck className="h-4 w-4" /> Authorized dealer ordering
          </div>
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-foreground md:text-6xl">
            Powering Dealers with{" "}
            <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
              Smart Tractor Ordering
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-muted-foreground md:text-base">
            {section?.subtitle || `${seller.tradingName} connects authorized dealers with tractors, genuine spare parts, implements and workshop products through one secure B2B ordering platform.`}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`${base}/products`}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-red-600/20 hover:shadow-xl hover:shadow-red-600/30 hover:-translate-y-0.5 transition-all duration-200"
            >
              Explore catalogue <ArrowRight className="h-4 w-4" />
            </Link>
            {isDealer ? (
              <Link
                href="/dealer/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border-none bg-card shadow-sm px-6 py-3.5 text-sm font-extrabold text-foreground hover:bg-accent transition-all"
              >
                <LayoutDashboard className="h-4 w-4" /> Dealer portal
              </Link>
            ) : isStaff ? (
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border-none bg-card shadow-sm px-6 py-3.5 text-sm font-extrabold text-foreground hover:bg-accent transition-all"
              >
                <LayoutDashboard className="h-4 w-4" /> Staff workspace
              </Link>
            ) : (
              <Link
                href="/dealer/login"
                className="inline-flex items-center gap-2 rounded-xl border-none bg-card shadow-sm px-6 py-3.5 text-sm font-extrabold text-foreground hover:bg-accent transition-all"
              >
                <LockKeyhole className="h-4 w-4" /> Dealer login
              </Link>
            )}
          </div>
          <div className="mt-8 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4 stagger-children">
            {[ [Boxes,"Complete catalogue","text-blue-500"], [FileCheck2,"Proforma workflow","text-emerald-500"], [PackageCheck,"Warehouse picking","text-violet-500"], [Truck,"Dispatch tracking","text-amber-500"] ].map(([Icon, label, color]) => {
              const ItemIcon = Icon as React.ElementType;
              return (
                <div key={label as string} className="flex items-center gap-2 rounded-xl border-none bg-card px-3 py-2.5 text-[10px] font-bold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <ItemIcon className={`h-4 w-4 ${color as string}`} />
                  {label as string}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative min-h-[340px] lg:min-h-[500px]">
          <Image
            src="/images/bageshwari-tractor-hero.png"
            alt="Red agricultural tractor available through the Bageshwari Tractors dealer platform"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="object-contain object-center"
          />
          <div className="absolute bottom-3 right-0 w-[210px] bg-card shadow-xl rounded-2xl border-none p-4 sm:w-[240px] lg:bottom-10">
            <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="text-xs font-black text-foreground">B2B Dealer Portal</div>
                <div className="text-[9px] text-muted-foreground">
                  {isDealer ? "Unlocked Pricing Active" : "Secure order workspace"}
                </div>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <LockKeyhole className="h-4 w-4 text-red-500" />
              </div>
            </div>
            <div className="space-y-2 text-[10px] font-semibold text-muted-foreground">
              <div className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-blue-500" /> Review and confirm proforma</div>
              <div className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-emerald-500" /> Follow warehouse fulfillment</div>
              <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-amber-500" /> Track dispatched shipments</div>
            </div>
            {isDealer ? (
              <Link
                href="/dealer/dashboard"
                className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-2.5 text-[10px] font-extrabold text-white hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                Go to dealer portal <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <Link
                href="/dealer/login"
                className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-2.5 text-[10px] font-extrabold text-white hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                Go to portal <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

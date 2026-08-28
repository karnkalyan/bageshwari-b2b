import Link from "next/link";
import { ArrowRight, BadgePercent, CreditCard, Headphones, ShieldCheck, ShoppingCart, LayoutDashboard } from "lucide-react";

export function DealerCTA({
  sellerSlug,
  isDealer = false,
}: {
  section?: unknown;
  sellerSlug: string;
  isDealer?: boolean;
}) {
  return (
    <section id="dealer-network" className="bg-[#050505] py-16">
      <div className="site-container">
        <div className="rounded-3xl bg-slate-900 px-8 py-10 text-white shadow-2xl md:flex md:items-center md:gap-10 border-none relative overflow-hidden">
          {/* subtle glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-slate-800 relative z-10">
            <ShieldCheck className="h-8 w-8 text-red-500" />
          </div>
          <div className="mt-6 flex-1 md:mt-0 relative z-10">
            <div className="text-3xl font-black text-white">
              {isDealer ? "Authorized Bageshwari Dealer Workspace" : "Become an authorized Bageshwari dealer"}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400 max-w-2xl">
              {isDealer
                ? "Your dealer pricing is active. Access proforma reviews, live shipments, invoices and place orders anytime."
                : "Access protected dealer pricing, transparent invoices, order history, credit workflows and dedicated dispatch support."}
            </p>
            <div className="mt-5 flex flex-wrap gap-5 text-xs font-bold text-slate-300">
              <span className="flex items-center gap-2">
                <BadgePercent className="h-4 w-4 text-red-500" /> Dealer pricing
              </span>
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-red-500" /> Credit review
              </span>
              <span className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-red-500" /> Dedicated support
              </span>
            </div>
          </div>
          <div className="mt-8 grid shrink-0 gap-3 md:mt-0 relative z-10">
            {isDealer ? (
              <>
                <Link
                  href="/products"
                  className="group flex items-center justify-center gap-2 rounded-xl bg-red-600 px-8 py-4 text-sm font-black hover:bg-red-500 transition-colors border-none"
                >
                  <ShoppingCart className="h-4 w-4" /> Order Products <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/dealer/dashboard"
                  className="rounded-xl bg-slate-800 px-8 py-4 text-center text-sm font-black text-white hover:bg-slate-700 transition-colors border-none"
                >
                  <LayoutDashboard className="inline-block mr-2 h-4 w-4 text-blue-400" /> Dealer Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/request-dealership"
                  className="group flex items-center justify-center gap-2 rounded-xl bg-red-600 px-8 py-4 text-sm font-black hover:bg-red-500 transition-colors border-none"
                >
                  Apply for dealership <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/dealer/login"
                  className="rounded-xl bg-slate-800 px-8 py-4 text-center text-sm font-black text-white hover:bg-slate-700 transition-colors border-none"
                >
                  Dealer login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

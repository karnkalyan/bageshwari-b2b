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
    <section id="dealer-network" className="bg-[#f7f9fc] py-10">
      <div className="site-container rounded-2xl bg-[#072d57] px-6 py-7 text-white shadow-xl md:flex md:items-center md:gap-8">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10">
          <ShieldCheck className="h-7 w-7 text-red-400" />
        </div>
        <div className="mt-4 flex-1 md:mt-0">
          <div className="text-xl font-black">
            {isDealer ? "Authorized Bageshwari Dealer Workspace" : "Become an authorized Bageshwari dealer"}
          </div>
          <p className="mt-1 text-xs leading-5 text-blue-100/75">
            {isDealer
              ? "Your dealer pricing is active. Access proforma reviews, live shipments, invoices and place orders anytime."
              : "Access protected dealer pricing, transparent invoices, order history, credit workflows and dedicated dispatch support."}
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-[10px] font-bold text-blue-100">
            <span className="flex items-center gap-1">
              <BadgePercent className="h-3 w-3 text-red-400" /> Dealer pricing
            </span>
            <span className="flex items-center gap-1">
              <CreditCard className="h-3 w-3 text-red-400" /> Credit review
            </span>
            <span className="flex items-center gap-1">
              <Headphones className="h-3 w-3 text-red-400" /> Dedicated support
            </span>
          </div>
        </div>
        <div className="mt-5 grid shrink-0 gap-2 md:mt-0">
          {isDealer ? (
            <>
              <Link
                href="/products"
                className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-xs font-black hover:bg-red-700 transition"
              >
                <ShoppingCart className="h-4 w-4" /> Order Products <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dealer/dashboard"
                className="rounded-lg bg-white px-6 py-3 text-center text-xs font-black text-[#072d57] hover:bg-slate-100 transition"
              >
                <LayoutDashboard className="inline-block mr-1 h-3.5 w-3.5" /> Dealer Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/request-dealership"
                className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-xs font-black hover:bg-red-700 transition"
              >
                Apply for dealership <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dealer/login"
                className="rounded-lg bg-white px-6 py-3 text-center text-xs font-black text-[#072d57] hover:bg-slate-100 transition"
              >
                Dealer login
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

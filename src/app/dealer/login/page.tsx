import Link from "next/link";
import { Suspense } from "react";
import { Boxes, ShieldCheck, TrendingUp, CreditCard, PackageCheck } from "lucide-react";
import { CredentialsLoginForm } from "@/components/auth/credentials-login-form";
import { DevelopmentCredentials } from "@/components/auth/development-credentials";

export default function DealerLoginPage() {
  return (
    <main className="relative grid min-h-screen lg:grid-cols-2">
      {/* Left Panel - Hero */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#1a0a0a] via-[#3d1111] to-[#5c1a1a] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Decorative elements */}
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-red-500/15 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute inset-0 b2b-grid opacity-20" />

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-3 font-black uppercase">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-xl shadow-red-950/50 transition-transform hover:scale-105">
            <Boxes className="h-6 w-6" />
          </span>
          <span className="text-lg tracking-wide">Bageshwari Tractors</span>
        </Link>

        {/* Hero content */}
        <div className="relative z-10 max-w-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[.2em] text-blue-300 backdrop-blur-sm border border-blue-500/20">
            <ShieldCheck className="h-3 w-3" /> Authorized B2B Portal
          </div>
          <h1 className="text-5xl font-black leading-[1.1] tracking-tight">
            Dealer pricing, ordering, invoices &amp;{" "}
            <span className="bg-gradient-to-r from-red-300 to-amber-300 bg-clip-text text-transparent">
              shipments
            </span>{" "}
            in one place.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-red-100/50">
            Authorized dealer accounts only. Protected pricing and instant order placement.
          </p>

          {/* Feature pills */}
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { icon: TrendingUp, label: "Dealer tier pricing" },
              { icon: CreditCard, label: "Credit management" },
              { icon: PackageCheck, label: "Order tracking" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 rounded-xl bg-white/6 backdrop-blur-sm border border-white/10 px-4 py-2 text-xs font-medium text-white/70">
                <f.icon className="h-3.5 w-3.5 text-red-300" />
                {f.label}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-red-200/40">
          Commercial confidentiality &amp; B2B tier pricing protected by secure session authentication.
        </div>
      </section>

      {/* Right Panel - Login Form */}
      <section className="relative flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-transparent to-blue-50/30 dark:from-red-950/20 dark:via-transparent dark:to-blue-950/10" />

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg">
              <Boxes className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-wide text-foreground">Bageshwari Tractors</div>
              <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Dealer Portal</div>
            </div>
          </div>

          {/* Login card */}
          <div className="glass-card p-8">
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading secure login…</p>}>
              <CredentialsLoginForm
                scope="dealer"
                title="Dealer login"
                description="Sign in to view protected pricing and place orders."
              />
            </Suspense>
            {process.env.NODE_ENV === "development" && (
              <DevelopmentCredentials
                accounts={[
                  { label: "Dealer Owner (DLR-001)", email: "dealer1@bageshwari.local" },
                  { label: "Banke Farm Solutions (DLR-003)", email: "dealer3@bageshwari.local" },
                ]}
              />
            )}
            <p className="mt-6 border-t border-border pt-5 text-center text-xs text-muted-foreground">
              Bageshwari staff?{" "}
              <Link href="/staff/login" className="font-bold text-red-600 dark:text-red-400 hover:underline">
                Use staff login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

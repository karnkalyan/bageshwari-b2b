import { ArrowRight, BadgeCheck, ClipboardCheck, FileText, PackageCheck, Receipt, Send, Truck } from "lucide-react";

export function HowItWorks() {
  const steps = [
    [ClipboardCheck, "Create order", "Dealer or salesperson"], [FileText, "Accounts review", "Availability and terms"],
    [BadgeCheck, "Dealer confirms", "Final revised order"], [Receipt, "Proforma invoice", "Dealer approval"],
    [PackageCheck, "Warehouse pick", "Actual quantities"], [FileText, "Final invoice", "Payment or credit"],
    [Truck, "Dispatch", "Shipment tracking"],
  ];
  return <section id="how-it-works" className="border-y border-border bg-card py-12"><div className="site-container"><div className="text-center"><div className="section-kicker">Simple and controlled</div><h2 className="mt-1 text-2xl font-black text-foreground">Seven-step B2B ordering process</h2></div><div className="mt-8 grid gap-3 md:grid-cols-4 xl:grid-cols-7 stagger-children">{steps.map(([Icon, title, detail], index) => { const StepIcon = Icon as React.ElementType; return <div key={title as string} className="relative glass-card p-4 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-primary shadow-sm"><StepIcon className="h-5 w-5" /></div><div className="mt-3 text-[9px] font-black uppercase tracking-wider text-red-500">Step {index + 1}</div><div className="mt-1 text-xs font-black text-foreground">{title as string}</div><div className="mt-1 text-[9px] leading-4 text-muted-foreground">{detail as string}</div>{index < steps.length - 1 && <ArrowRight className="absolute -right-3 top-9 z-10 hidden h-4 w-4 text-blue-400 xl:block" />}</div>; })}</div></div></section>;
}

import { ArrowRight, BadgeCheck, ClipboardCheck, FileText, PackageCheck, Receipt, Send, Truck } from "lucide-react";

export function HowItWorks() {
  const steps = [
    [ClipboardCheck, "Create order", "Dealer or salesperson"], [FileText, "Accounts review", "Availability and terms"],
    [BadgeCheck, "Dealer confirms", "Final revised order"], [Receipt, "Proforma invoice", "Dealer approval"],
    [PackageCheck, "Warehouse pick", "Actual quantities"], [FileText, "Final invoice", "Payment or credit"],
    [Truck, "Dispatch", "Shipment tracking"],
  ];
  return (
    <section id="how-it-works" className="bg-[#050505] py-16 border-b border-slate-800">
      <div className="site-container">
        <div className="text-center">
          <div className="inline-block rounded-full bg-blue-950 px-3 py-1 text-[10px] font-bold text-blue-400 mb-3">
            Simple and controlled
          </div>
          <h2 className="text-3xl font-black text-white">Seven-step B2B ordering process</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-4 xl:grid-cols-7 animate-in slide-in-from-bottom-8 duration-700 fade-in fill-mode-both">
          {steps.map(([Icon, title, detail], index) => { 
            const StepIcon = Icon as React.ElementType; 
            return (
              <div key={title as string} className="relative bg-slate-900 rounded-2xl p-5 text-center border-none shadow-xl transition-transform hover:-translate-y-2 hover:bg-slate-800">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-800 text-blue-400">
                  <StepIcon className="h-6 w-6" />
                </div>
                <div className="mt-4 text-[10px] font-black uppercase tracking-wider text-red-500">Step {index + 1}</div>
                <div className="mt-1 text-sm font-black text-white">{title as string}</div>
                <div className="mt-1.5 text-[10px] leading-4 text-slate-400">{detail as string}</div>
                {index < steps.length - 1 && <ArrowRight className="absolute -right-4 top-10 z-10 hidden h-5 w-5 text-slate-600 xl:block" />}
              </div>
            ); 
          })}
        </div>
      </div>
    </section>
  );
}

import { Tag, Package, CreditCard, Headphones, Zap, FileText } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Tag, Package, CreditCard, Headphones, Zap, FileText,
};

export function DealerBenefits({ content }: { content: any }) {
  const items = content?.items || [
    { title: "Exclusive B2B Pricing", description: "Access special dealer prices on all products", icon: "Tag" },
    { title: "Bulk Order Discounts", description: "Volume-based pricing for large orders", icon: "Package" },
    { title: "Credit Facility", description: "Flexible credit terms for trusted dealers", icon: "CreditCard" },
    { title: "Priority Support", description: "Dedicated support line for dealers", icon: "Headphones" },
    { title: "Fast Dispatch", description: "Priority processing and dispatch for dealer orders", icon: "Zap" },
    { title: "Digital Invoicing", description: "Automated proforma and final invoices", icon: "FileText" },
  ];

  return (
    <section className="bg-[#0A0A0B] py-16 border-b border-slate-800">
      <div className="site-container">
        <div className="mb-10 text-center">
          <div className="inline-block rounded-full bg-red-950 px-3 py-1 text-[10px] font-bold text-red-400 mb-3">
            Dealer advantages
          </div>
          <h2 className="text-3xl font-black text-white">Why dealers choose Bageshwari Tractors</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {items.map((item: any, i: number) => {
            const Icon = iconMap[item.icon] || Tag;
            return (
              <div
                key={i}
                className="flex flex-col items-center rounded-2xl bg-[#111113] p-5 text-center transition-all hover:-translate-y-2 hover:bg-slate-900 border-none shadow-xl"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-950/50">
                  <Icon className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-sm font-extrabold text-white">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

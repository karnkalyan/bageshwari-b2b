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
    <section className="border-y border-slate-200 bg-slate-50 py-8">
      <div className="site-container">
        <div className="mb-5 text-center"><div className="section-kicker">Dealer advantages</div><h2 className="mt-1 text-xl font-black text-[#0b2d55]">Why dealers choose Bageshwari Tractors</h2></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {items.map((item: any, i: number) => {
            const Icon = iconMap[item.icon] || Tag;
            return (
              <div
                key={i}
                className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                  <Icon className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-xs font-extrabold text-[#0b2d55]">{item.title}</h3>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

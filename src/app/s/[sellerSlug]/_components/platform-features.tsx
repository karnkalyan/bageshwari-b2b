import { ShoppingBag, Tag, ClipboardList, FileText, Truck, CreditCard } from "lucide-react";

const featureIcons: Record<string, React.ElementType> = {
  "Product Catalogue": ShoppingBag,
  "Dealer Pricing": Tag,
  "Order Management": ClipboardList,
  "Invoice Management": FileText,
  "Shipment Tracking": Truck,
  "Credit Management": CreditCard,
};

export function PlatformFeatures({ content }: { content: any }) {
  const features = content?.features || [
    { title: "Product Catalogue", description: "Browse thousands of products with detailed specifications" },
    { title: "Dealer Pricing", description: "View exclusive B2B pricing after login" },
    { title: "Order Management", description: "Create, track, and manage orders from a single dashboard" },
    { title: "Invoice Management", description: "Access proforma and final invoices digitally" },
    { title: "Shipment Tracking", description: "Real-time tracking of all dispatched orders" },
    { title: "Credit Management", description: "View credit limits, outstanding balances, and payment history" },
  ];

  return (
    <section className="bg-[#050505] py-16 border-b border-slate-800">
      <div className="site-container">
        <div className="mb-10 text-center">
          <div className="inline-block rounded-full bg-blue-950 px-3 py-1 text-[10px] font-bold text-blue-400 mb-3">
            One connected platform
          </div>
          <h2 className="text-3xl font-black text-white">Everything needed to run your dealer business</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {features.map((feature: any, i: number) => {
            const Icon = featureIcons[feature.title] || ShoppingBag;
            return (
              <div
                key={i}
                className="group rounded-2xl bg-[#111113] p-5 text-center transition-all hover:-translate-y-2 hover:bg-slate-900 border-none shadow-xl"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 transition-colors group-hover:bg-blue-950">
                  <Icon className="h-6 w-6 text-slate-400 group-hover:text-blue-400" />
                </div>
                <h3 className="text-sm font-extrabold text-white">{feature.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

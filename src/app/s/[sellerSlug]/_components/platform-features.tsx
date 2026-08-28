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
    <section className="bg-white py-9">
      <div className="site-container">
        <div className="mb-6 text-center">
          <div className="section-kicker">One connected platform</div>
          <h2 className="mt-1 text-xl font-black text-[#0b2d55]">Everything needed to run your dealer business</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {features.map((feature: any, i: number) => {
            const Icon = featureIcons[feature.title] || ShoppingBag;
            return (
              <div
                key={i}
                className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-red-200 hover:shadow-md"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 transition group-hover:bg-red-50">
                  <Icon className="h-5 w-5 text-[#0b4f91] group-hover:text-red-600" />
                </div>
                <h3 className="text-xs font-extrabold text-[#0b2d55]">{feature.title}</h3>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
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

import { PublicInfoPage } from "@/components/commerce/public-info-page";

const steps = ["Browse products", "Create order", "Accounts review", "Dealer confirmation", "Proforma invoice", "Warehouse pick list", "Final invoice", "Packing and transport", "Dispatch"];

export default function HowItWorksPage() {
  return <PublicInfoPage title="From catalogue to delivery, every stage is controlled" eyebrow="How ordering works">{() => (
    <ol className="grid gap-3 md:grid-cols-3">{steps.map((step, index) => <li key={step} className="rounded-lg border border-slate-200 bg-white p-5"><span className="text-xs font-black text-red-600">{String(index + 1).padStart(2, '0')}</span><div className="mt-2 font-bold text-[#092f5c]">{step}</div></li>)}</ol>
  )}</PublicInfoPage>;
}

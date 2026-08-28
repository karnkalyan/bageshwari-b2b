import { PublicInfoPage } from "@/components/commerce/public-info-page";

export default function DealerBenefitsPage() {
  return <PublicInfoPage title="Built for authorized agricultural dealers" eyebrow="Dealer benefits">{() => (
    <div className="grid gap-4 md:grid-cols-3">{[
      ["Protected pricing", "See dealer-specific, group and quantity pricing only after authorization."],
      ["Clear documents", "Track confirmations, proforma invoices, final invoices and payments."],
      ["Fulfilment visibility", "Follow warehouse picking, packing, transport and delivery."],
    ].map(([title, body]) => <article key={title} className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="font-black text-[#092f5c]">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{body}</p></article>)}</div>
  )}</PublicInfoPage>;
}

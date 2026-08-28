import { PublicInfoPage } from "@/components/commerce/public-info-page";

export default function ContactPage() {
  return <PublicInfoPage title="Contact Bageshwari Tractors" eyebrow="Contact">{(company) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[['Address', company.address], ['Phone', company.phone || 'Available from the dealer desk'], ['Email', company.email || 'Available from the dealer desk']].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-6"><div className="text-xs font-black uppercase tracking-wider text-red-600">{label}</div><p className="mt-3 text-sm font-semibold text-[#092f5c]">{value}</p></div>)}
    </div>
  )}</PublicInfoPage>;
}

import { PublicInfoPage } from "@/components/commerce/public-info-page";

export default function AboutPage() {
  return <PublicInfoPage title="Agricultural commerce built around dealer relationships" eyebrow="About us">{(company) => (
    <div className="grid gap-6 lg:grid-cols-2">
      <article className="rounded-xl border border-slate-200 bg-white p-7"><h2 className="text-xl font-black text-[#092f5c]">{company.companyName}</h2><p className="mt-4 text-sm leading-7 text-slate-600">{company.seller.description}</p></article>
      <article className="rounded-xl border border-slate-200 bg-white p-7"><h2 className="text-xl font-black text-[#092f5c]">Our base</h2><p className="mt-4 text-sm leading-7 text-slate-600">{company.address}</p><p className="mt-2 text-sm text-slate-600">Serving authorized dealers with a connected ordering, accounts, warehouse and dispatch workflow.</p></article>
    </div>
  )}</PublicInfoPage>;
}

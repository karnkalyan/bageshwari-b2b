import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PublicInfoPage } from "@/components/commerce/public-info-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const inquirySchema = z.object({
  contactName: z.string().trim().min(2).max(100),
  companyName: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().min(7).max(30),
  message: z.string().trim().min(10).max(2000),
});

async function createInquiry(formData: FormData) {
  "use server";
  const parsed = inquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/inquiry?error=validation");
  const seller = await prisma.seller.findFirst({ where: { code: "BAGESHWARI", status: "ACTIVE" }, select: { id: true } });
  if (!seller) redirect("/inquiry?error=setup");
  await prisma.inquiry.create({ data: { sellerId: seller.id, ...parsed.data, status: "SUBMITTED" } });
  redirect("/inquiry?submitted=1");
}

export default async function InquiryPage({ searchParams }: { searchParams: Promise<{ submitted?: string; error?: string }> }) {
  const state = await searchParams;
  return <PublicInfoPage title="Send a product or bulk-order inquiry" eyebrow="Product inquiry">{() => (
    <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-7">
      {state.submitted === "1" && <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Your inquiry was submitted. Our team will follow up.</div>}
      {state.error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">Please review the form and try again.</div>}
      <form action={createInquiry} className="grid gap-4 sm:grid-cols-2">
        <Input name="contactName" placeholder="Contact name" required minLength={2} />
        <Input name="companyName" placeholder="Business name" required minLength={2} />
        <Input name="email" type="email" placeholder="Email" required />
        <Input name="phone" placeholder="Phone (+977)" required minLength={7} />
        <textarea name="message" required minLength={10} maxLength={2000} placeholder="Products, quantities and delivery location" className="min-h-36 rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-red-500 sm:col-span-2" />
        <Button type="submit" className="bg-red-600 hover:bg-red-700 sm:col-span-2">Submit inquiry</Button>
      </form>
    </div>
  )}</PublicInfoPage>;
}

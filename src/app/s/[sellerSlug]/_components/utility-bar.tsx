import { BadgeCheck, Headphones, LockKeyhole, ReceiptText } from "lucide-react";

export function UtilityBar({ content }: { content?: { items?: string[] } | null }) {
  const items = content?.items || ["B2B Dealer Platform", "Bulk Orders", "Exclusive Dealer Pricing"];
  return <div className="bg-[#06294f] text-white"><div className="site-container flex h-8 items-center justify-between gap-4 overflow-hidden text-[9px] font-bold"><div className="flex min-w-0 items-center gap-4 overflow-x-auto whitespace-nowrap">{items.slice(0, 3).map((item) => <span key={item} className="flex items-center gap-1.5 text-blue-100"><BadgeCheck className="h-3 w-3 text-red-400" />{item}</span>)}</div><div className="hidden shrink-0 items-center gap-5 text-blue-100 md:flex"><span className="flex items-center gap-1"><ReceiptText className="h-3 w-3" /> Tax invoices</span><span className="flex items-center gap-1"><LockKeyhole className="h-3 w-3" /> Secure accounts</span><span className="flex items-center gap-1"><Headphones className="h-3 w-3" /> Dealer support</span></div></div></div>;
}

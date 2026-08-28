import { MapPin, Phone, Mail, Clock } from "lucide-react";

interface ServiceContactProps {
  content: any;
  seller: any;
}

export function ServiceContact({ content, seller }: ServiceContactProps) {
  const address = content?.address || `${seller.addressLine1 || "Nepalgunj"}, ${seller.district || "Banke"}, ${seller.country || "Nepal"}`;
  const phone = content?.phone || seller.phone;
  const email = content?.email || seller.email;
  const hours = content?.hours || "Sun-Fri: 9:00 AM - 6:00 PM";

  return (
    <section className="py-16 bg-card border-t">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs text-white/80 mb-4">
                <MapPin className="h-3.5 w-3.5 text-red-400" />
                Headquarters & Service Center
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">{seller.tradingName}</h2>
              <p className="mt-3 text-white/70 text-sm leading-relaxed">
                Visit our official showroom and service center for direct consultations, genuine spare parts, and authorized service support.
              </p>
            </div>

            <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-white/50">Location</div>
                  <div className="text-sm font-medium">{address}</div>
                </div>
              </div>

              {phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-white/50">Contact Phone</div>
                    <div className="text-sm font-medium">{phone}</div>
                  </div>
                </div>
              )}

              {email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-white/50">Email Support</div>
                    <div className="text-sm font-medium">{email}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-white/50">Working Hours</div>
                  <div className="text-sm font-medium">{hours}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

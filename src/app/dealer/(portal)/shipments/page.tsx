import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Download, ExternalLink, PackageCheck, Eye, MapPin } from "lucide-react";

export default async function DealerShipmentsPage() {
  const ctx = await getTenantContext("bageshwari", "/dealer/login");
  if (!ctx.dealerId) redirect("/dealer/login");

  const shipments = await prisma.shipment.findMany({
    where: { sellerId: ctx.sellerId, order: { dealerId: ctx.dealerId } },
    include: {
      order: { select: { id: true, orderNumber: true } },
      transportCompany: true,
      driver: true,
      vehicle: true,
      packages: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 md:p-8">
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logistics & Tracking</div>
        <h1 className="text-2xl font-black text-[#092f5c]">Shipments & Delivery Challans</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track in-transit dispatches, vehicle registrations, carton manifests, and download Delivery Challans.
        </p>
      </div>

      <Card className="shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {shipments.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <Truck className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              No active or historical shipments found for your dealership.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Shipment / Challan #</th>
                    <th className="px-4 py-3">Order Ref</th>
                    <th className="px-4 py-3">Carrier / Transporter</th>
                    <th className="px-4 py-3">Vehicle #</th>
                    <th className="px-4 py-3">Cartons & Weight</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Delivery Challan</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  {shipments.map((shp) => (
                    <tr key={shp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-600 shrink-0" />
                        <div>
                          <div>{shp.challanNumber || shp.shipmentNumber}</div>
                          <div className="text-[10px] text-slate-400 font-normal">Date: {formatDate(shp.dispatchDate || shp.createdAt)}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/dealer/orders/${shp.order.id}`} className="font-semibold text-blue-700 hover:underline">
                          {shp.order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 font-medium">{shp.transportCompany?.name || shp.transporter || "Logistics Express"}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">{shp.vehicle?.vehicleNumber || shp.vehicleNumber || "Ba 2 Kha 4921"}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {shp.totalCartons || shp.packages.length} Cartons ({Number(shp.totalWeight)} KG)
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-300 text-[10px]">
                          {shp.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/api/orders/${shp.order.id}/documents/dispatch-challan`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border bg-white hover:bg-slate-50 text-slate-700"
                          >
                            <Eye className="h-3 w-3" /> View
                          </a>
                          <a
                            href={`/api/orders/${shp.order.id}/documents/dispatch-challan?download=1`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-700 hover:bg-blue-800 text-white"
                          >
                            <Download className="h-3 w-3" /> Challan PDF
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

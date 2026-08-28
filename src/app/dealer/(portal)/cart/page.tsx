import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext } from "@/lib/tenant";
import { getDealerCart, updateCartItemQuantity, removeCartItem, clearDealerCart } from "@/services/cart.service";
import { executeOrderWorkflowAction } from "@/services/order-workflow.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Trash2, ArrowRight, Package, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { revalidatePath } from "next/cache";

export default async function DealerCartPage() {
  const ctx = await getTenantContext("bageshwari", "/dealer/login");
  if (!ctx.dealerId) redirect("/dealer/login");

  const draft = await getDealerCart(ctx.sellerId, ctx.dealerId);

  async function updateQuantityAction(formData: FormData) {
    "use server";
    const actionCtx = await getTenantContext("bageshwari", "/dealer/login");
    if (!actionCtx.dealerId) redirect("/dealer/login");
    const itemId = String(formData.get("itemId") || "");
    const qty = Number(formData.get("quantity") || 1);
    if (!itemId) return;

    await updateCartItemQuantity({
      sellerId: actionCtx.sellerId,
      dealerId: actionCtx.dealerId,
      itemId,
      quantity: qty,
    });
    revalidatePath("/dealer/cart");
  }

  async function removeItemAction(formData: FormData) {
    "use server";
    const actionCtx = await getTenantContext("bageshwari", "/dealer/login");
    if (!actionCtx.dealerId) redirect("/dealer/login");
    const itemId = String(formData.get("itemId") || "");
    if (!itemId) return;

    await removeCartItem({
      sellerId: actionCtx.sellerId,
      dealerId: actionCtx.dealerId,
      itemId,
    });
    revalidatePath("/dealer/cart");
  }

  async function clearCartAction() {
    "use server";
    const actionCtx = await getTenantContext("bageshwari", "/dealer/login");
    if (!actionCtx.dealerId) redirect("/dealer/login");

    await clearDealerCart({
      sellerId: actionCtx.sellerId,
      dealerId: actionCtx.dealerId,
    });
    revalidatePath("/dealer/cart");
  }

  async function submitDraft(formData: FormData) {
    "use server";
    const actionCtx = await getTenantContext("bageshwari", "/dealer/login");
    const orderId = String(formData.get("orderId") || "");
    if (!orderId) return;

    await executeOrderWorkflowAction({
      sellerId: actionCtx.sellerId,
      orderId,
      targetStatus: "PENDING_ACCOUNTS_REVIEW",
      actor: {
        userId: actionCtx.userId,
        permissions: actionCtx.permissions,
        roles: actionCtx.roles,
      },
      reason: "Submitted by dealer from portal cart",
    });
    redirect("/dealer/orders");
  }

  if (!draft || !draft.items.length) {
    return (
      <section className="p-4 sm:p-7 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-[#092f5c]">Your dealer cart is empty</h1>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Browse our catalogue with your unlocked dealer pricing and add items to build your draft order.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/products">
              <Button className="bg-red-600 hover:bg-red-700 font-bold">
                Browse Products Catalogue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dealer/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="p-4 sm:p-7 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white text-[10px]">Active Draft</Badge>
            <span className="text-xs text-slate-400 font-mono">{draft.orderNumber}</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-[#092f5c]">Dealer Order Cart</h1>
          <p className="text-xs text-slate-500">
            {draft.items.length} product line{draft.items.length > 1 ? "s" : ""} added to draft order.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/products">
            <Button variant="outline" size="sm" className="text-xs">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Add More Products
            </Button>
          </Link>
          <form action={clearCartAction}>
            <Button variant="ghost" size="sm" type="submit" className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700">
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear Cart
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Cart Items Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {draft.items.map((item) => {
              const qty = Number(item.originalQuantity);
              const dp = Number(item.dealerPrice);
              const mrp = Number(item.mrp);
              const lineTotal = Number(item.lineTotal);
              const discountPercent = mrp > 0 ? Math.round(((mrp - dp) / mrp) * 100) : 0;

              return (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                      <Package className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-[#092f5c] truncate">{item.productName}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span>SKU: {item.sku}</span>
                        {item.variantName && <span>• {item.variantName}</span>}
                        {discountPercent > 0 && (
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            {discountPercent}% DP Discount
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-400 line-through">{formatCurrency(mrp)}</div>
                      <div className="text-sm font-bold text-emerald-700">{formatCurrency(dp)}</div>
                    </div>

                    {/* Quantity Update Controls */}
                    <div className="flex items-center gap-1.5">
                      <form action={updateQuantityAction}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="quantity" value={Math.max(1, qty - 1)} />
                        <button
                          type="submit"
                          disabled={qty <= 1}
                          className="h-8 w-8 rounded border border-slate-200 bg-slate-50 font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        >
                          -
                        </button>
                      </form>
                      <span className="w-9 text-center font-bold text-xs">{qty}</span>
                      <form action={updateQuantityAction}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="quantity" value={qty + 1} />
                        <button
                          type="submit"
                          className="h-8 w-8 rounded border border-slate-200 bg-slate-50 font-bold text-slate-600 hover:bg-slate-100"
                        >
                          +
                        </button>
                      </form>
                    </div>

                    <div className="text-right min-w-24">
                      <div className="font-extrabold text-sm text-[#092f5c]">{formatCurrency(lineTotal)}</div>
                      <div className="text-[10px] text-slate-400">incl. 13% VAT</div>
                    </div>

                    <form action={removeItemAction}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button
                        type="submit"
                        aria-label="Remove item"
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary & Submit Form */}
        <Card className="border-slate-200 shadow-sm sticky top-24">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-black text-lg text-[#092f5c] border-b pb-3">Order Summary</h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Net DP)</span>
                <span className="font-semibold text-slate-800">{formatCurrency(Number(draft.subtotal))}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Value Added Tax (13% VAT)</span>
                <span className="font-semibold text-slate-800">{formatCurrency(Number(draft.taxTotal))}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping / Freight</span>
                <span className="font-semibold text-emerald-700">Calculated on Dispatch</span>
              </div>
            </div>

            <div className="border-t pt-3 flex justify-between items-baseline">
              <div>
                <div className="font-black text-sm text-[#092f5c]">Grand Total</div>
                <div className="text-[10px] text-slate-400">NPR Currency</div>
              </div>
              <strong className="text-2xl font-black text-red-600">{formatCurrency(Number(draft.grandTotal))}</strong>
            </div>

            <form action={submitDraft} className="pt-2">
              <input type="hidden" name="orderId" value={draft.id} />
              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 font-extrabold h-12 text-sm shadow-md">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Submit for Accounts Review
              </Button>
            </form>

            <div className="border-t pt-3 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Submitted orders are immediately routed to accounts for confirmation.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

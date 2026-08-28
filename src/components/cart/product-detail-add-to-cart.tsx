"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ShoppingCart, Check, Loader2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProductDetailAddToCartProps = {
  productId: string;
  moq: number;
  unitCode: string;
  quantityIncrement?: number;
  initialCartCount?: number;
  action: (formData: FormData) => Promise<void>;
};

export function ProductDetailAddToCart({
  productId,
  moq,
  unitCode,
  quantityIncrement = 1,
  initialCartCount = 0,
  action,
}: ProductDetailAddToCartProps) {
  const [quantity, setQuantity] = useState(moq);
  const [isPending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState(false);
  const [cartCount, setCartCount] = useState(initialCartCount);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("quantity", String(quantity));

    startTransition(async () => {
      await action(formData);
      setJustAdded(true);
      setCartCount((prev) => prev + 1);
      setTimeout(() => {
        setJustAdded(false);
      }, 2500);
    });
  };

  const increment = () => setQuantity((prev) => prev + quantityIncrement);
  const decrement = () => setQuantity((prev) => Math.max(moq, prev - quantityIncrement));

  return (
    <form onSubmit={handleAdd} className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-700 font-bold">
            Quantity ({unitCode}):
          </Label>
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={decrement}
              disabled={quantity <= moq || isPending}
              className="grid h-10 w-10 place-items-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(moq, Number(e.target.value) || moq))}
              min={moq}
              step={quantityIncrement}
              className="h-10 w-20 border-0 text-center font-black text-sm shadow-none focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={increment}
              disabled={isPending}
              className="grid h-10 w-10 place-items-center rounded-md text-slate-600 hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1">
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className={`h-12 w-full font-extrabold text-sm shadow-md transition-all duration-200 ${
              justAdded
                ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Adding to Cart...
              </>
            ) : justAdded ? (
              <>
                <Check className="h-5 w-5 mr-2 text-white" /> Added to Dealer Cart!
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5 mr-2" /> Add to Dealer Cart
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t">
        <Link
          href="/dealer/cart"
          className="text-red-600 hover:text-red-700 hover:underline font-bold flex items-center gap-1.5"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>View Draft Cart</span>
          {cartCount > 0 && (
            <span className="rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-black">
              {cartCount}
            </span>
          )}
        </Link>
        <Link href="/products" className="text-slate-500 hover:text-slate-900 hover:underline">
          Continue browsing catalogue
        </Link>
      </div>
    </form>
  );
}

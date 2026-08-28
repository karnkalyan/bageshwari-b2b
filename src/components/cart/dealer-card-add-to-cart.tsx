"use client";

import { useState, useTransition } from "react";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DealerCardAddToCart({
  productId,
  minQuantity = 1,
  action,
}: {
  productId: string;
  minQuantity?: number;
  action: (formData: FormData) => Promise<void>;
}) {
  const [qty, setQty] = useState(minQuantity);
  const [isPending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("quantity", String(qty));

    startTransition(async () => {
      await action(formData);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2200);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-slate-600 font-bold">Qty:</Label>
        <Input
          type="number"
          value={qty}
          onChange={(e) => setQty(Math.max(minQuantity, Number(e.target.value) || minQuantity))}
          min={minQuantity}
          className="h-8 text-xs w-20 text-center font-bold"
        />
        <Button
          size="sm"
          type="submit"
          disabled={isPending}
          className={`flex-1 text-white text-xs h-8 font-bold transition-all ${
            justAdded
              ? "bg-emerald-700 hover:bg-emerald-800"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Adding...
            </>
          ) : justAdded ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1" /> Added!
            </>
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Add to Cart
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

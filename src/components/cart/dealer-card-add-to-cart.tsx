"use client";

import { useState, useTransition } from "react";
import { ShoppingCart, Check, Loader2, Minus, Plus } from "lucide-react";
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
  // Allow free typing of any numeric quantity (e.g. 50, 70, etc.) without rigid clamping
  const [qty, setQty] = useState<string>(String(minQuantity > 0 ? minQuantity : 1));
  const [isPending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState(false);

  const handleDecrement = () => {
    const current = parseInt(qty, 10);
    const next = isNaN(current) || current <= 1 ? 1 : current - 1;
    setQty(String(next));
  };

  const handleIncrement = () => {
    const current = parseInt(qty, 10);
    const next = isNaN(current) ? 1 : current + 1;
    setQty(String(next));
  };

  const handleBlur = () => {
    const num = parseInt(qty, 10);
    if (isNaN(num) || num < 1) {
      setQty("1");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(qty, 10);
    const finalQty = isNaN(parsed) || parsed < 1 ? 1 : parsed;

    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("quantity", String(finalQty));

    startTransition(async () => {
      await action(formData);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2200);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-slate-600 font-bold shrink-0">Qty:</Label>

        {/* Stepper + Free Typing Input */}
        <div className="flex items-center border border-slate-200 rounded-md bg-white overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={handleDecrement}
            className="h-8 w-7 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 border-r border-slate-200 transition"
            aria-label="Decrease quantity"
          >
            <Minus className="h-3 w-3" />
          </button>

          <Input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onBlur={handleBlur}
            min={1}
            step={1}
            className="h-8 text-xs w-16 text-center font-bold border-0 rounded-none focus-visible:ring-0 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          <button
            type="button"
            onClick={handleIncrement}
            className="h-8 w-7 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 border-l border-slate-200 transition"
            aria-label="Increase quantity"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {minQuantity > 1 && (
          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap hidden sm:inline">
            MOQ: {minQuantity}
          </span>
        )}

        <Button
          size="sm"
          type="submit"
          disabled={isPending}
          className={`flex-1 text-white text-xs h-8 font-bold transition-all ml-auto ${
            justAdded
              ? "bg-emerald-700 hover:bg-emerald-800"
              : "bg-emerald-600 hover:bg-emerald-700"
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

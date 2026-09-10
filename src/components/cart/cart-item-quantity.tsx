"use client";

import { useState, useEffect, useTransition } from "react";
import { Minus, Plus, Loader2 } from "lucide-react";

interface CartItemQuantityProps {
  itemId: string;
  initialQuantity: number;
  updateAction: (formData: FormData) => Promise<void>;
}

export function CartItemQuantity({
  itemId,
  initialQuantity,
  updateAction,
}: CartItemQuantityProps) {
  const [qty, setQty] = useState<string>(String(initialQuantity));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setQty(String(initialQuantity));
  }, [initialQuantity]);

  const handleUpdate = (newQty: number) => {
    const validQty = Math.max(1, newQty);
    setQty(String(validQty));
    const formData = new FormData();
    formData.append("itemId", itemId);
    formData.append("quantity", String(validQty));
    startTransition(async () => {
      await updateAction(formData);
    });
  };

  const handleBlur = () => {
    const parsed = parseInt(qty, 10);
    if (isNaN(parsed) || parsed < 1) {
      setQty(String(initialQuantity));
    } else if (parsed !== initialQuantity) {
      handleUpdate(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const parsed = parseInt(qty, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed !== initialQuantity) {
        handleUpdate(parsed);
      }
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={isPending || (parseInt(qty, 10) || 1) <= 1}
        onClick={() => handleUpdate(Math.max(1, (parseInt(qty, 10) || 1) - 1))}
        className="h-8 w-7 rounded border border-slate-200 bg-slate-50 font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition flex items-center justify-center text-xs"
        aria-label="Decrease quantity"
      >
        <Minus className="h-3 w-3" />
      </button>

      <div className="relative">
        <input
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          min={1}
          step={1}
          className="h-8 w-14 text-center font-bold text-xs border border-slate-200 rounded px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
        />
        {isPending && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70 rounded">
            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={() => handleUpdate((parseInt(qty, 10) || 1) + 1)}
        className="h-8 w-7 rounded border border-slate-200 bg-slate-50 font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition flex items-center justify-center text-xs"
        aria-label="Increase quantity"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

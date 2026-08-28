"use client";

import { useState, useTransition } from "react";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type AddToCartButtonProps = {
  productId: string;
  quantity?: number;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  label?: string;
  addedLabel?: string;
  action: (formData: FormData) => Promise<void>;
};

export function AddToCartButton({
  productId,
  quantity = 1,
  className,
  size = "sm",
  variant = "default",
  label = "Add to Cart",
  addedLabel = "Added to Cart!",
  action,
}: AddToCartButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("quantity", String(quantity));

    startTransition(async () => {
      await action(formData);
      setJustAdded(true);
      setTimeout(() => {
        setJustAdded(false);
      }, 2200);
    });
  };

  return (
    <Button
      type="button"
      size={size}
      variant={justAdded ? "secondary" : variant}
      onClick={handleClick}
      disabled={isPending}
      className={`${
        justAdded
          ? "bg-emerald-700 text-white hover:bg-emerald-800 border border-emerald-600"
          : className || "bg-emerald-600 hover:bg-emerald-700 text-white"
      } transition-all duration-200`}
    >
      {isPending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Adding...
        </>
      ) : justAdded ? (
        <>
          <Check className="h-3.5 w-3.5 mr-1.5 text-white" /> {addedLabel}
        </>
      ) : (
        <>
          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> {label}
        </>
      )}
    </Button>
  );
}

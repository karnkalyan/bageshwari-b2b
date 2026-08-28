import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import { addItemToDealerCart, getDealerCart, updateCartItemQuantity, removeCartItem, clearDealerCart } from "@/services/cart.service";

describe("Dealer Cart Service Tests", () => {
  let sellerId: string;
  let dealerId: string;
  let userId: string;
  let product1: any;
  let product2: any;

  beforeAll(async () => {
    const seller = await prisma.seller.findFirst({ where: { status: "ACTIVE" } });
    if (!seller) throw new Error("No seller found");
    sellerId = seller.id;

    const dealer = await prisma.dealer.findFirst({ where: { sellerId, status: "ACTIVE" } });
    if (!dealer) throw new Error("No dealer found");
    dealerId = dealer.id;

    const membership = await prisma.userSellerMembership.findFirst({
      where: { sellerId, dealerId },
      include: { user: true },
    });
    if (!membership) throw new Error("No dealer membership found");
    userId = membership.userId;

    const products = await prisma.product.findMany({
      where: { sellerId, status: "ACTIVE" },
      take: 2,
      include: { variants: true, prices: true },
    });
    product1 = products[0];
    product2 = products[1];

    // Clear any leftover draft orders for this dealer
    await clearDealerCart({ sellerId, dealerId });
  });

  it("should add multiple items into one unified draft order cart", async () => {
    // Add product 1 with quantity 2
    const cartAfterFirst = await addItemToDealerCart({
      sellerId,
      dealerId,
      userId,
      productId: product1.id,
      quantity: 2,
    });

    expect(cartAfterFirst).not.toBeNull();
    expect(cartAfterFirst.status).toBe("DRAFT");
    expect(cartAfterFirst.items.length).toBe(1);
    expect(Number(cartAfterFirst.items[0].originalQuantity)).toBe(2);

    // Add product 2 with quantity 3 into the same draft cart
    const cartAfterSecond = await addItemToDealerCart({
      sellerId,
      dealerId,
      userId,
      productId: product2.id,
      quantity: 3,
    });

    expect(cartAfterSecond.id).toBe(cartAfterFirst.id); // Same order!
    expect(cartAfterSecond.items.length).toBe(2);

    // Add product 1 again with quantity 1 (should increment product 1 quantity to 3)
    const cartAfterIncrement = await addItemToDealerCart({
      sellerId,
      dealerId,
      userId,
      productId: product1.id,
      quantity: 1,
    });

    expect(cartAfterIncrement.items.length).toBe(2);
    const item1 = cartAfterIncrement.items.find((i) => i.productId === product1.id);
    expect(Number(item1?.originalQuantity)).toBe(3);

    // Verify tax calculation is ~13% of subtotal
    const subtotal = Number(cartAfterIncrement.subtotal);
    const taxTotal = Number(cartAfterIncrement.taxTotal);
    expect(taxTotal).toBeCloseTo(subtotal * 0.13, 0);
  });

  it("should update quantity in the cart", async () => {
    const cart = await getDealerCart(sellerId, dealerId);
    expect(cart).not.toBeNull();
    const item = cart!.items[0];

    const updated = await updateCartItemQuantity({
      sellerId,
      dealerId,
      itemId: item.id,
      quantity: 5,
    });

    const updatedItem = updated.items.find((i) => i.id === item.id);
    expect(Number(updatedItem?.originalQuantity)).toBe(5);
  });

  it("should remove item from cart", async () => {
    const cart = await getDealerCart(sellerId, dealerId);
    expect(cart).not.toBeNull();
    const initialItemCount = cart!.items.length;
    const itemToRemove = cart!.items[0];

    const updated = await removeCartItem({
      sellerId,
      dealerId,
      itemId: itemToRemove.id,
    });

    expect(updated.items.length).toBe(initialItemCount - 1);
  });
});

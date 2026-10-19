import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, gt, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@repo/db';
import {
  cartItems, carts, couponUses, coupons, customers, orderAddresses, orderItems,
  orderReservations, orders, payments, prices, products, stocks, variants, wishlists, wishlistItems,
} from '@repo/db/schema';
import { ApiError } from '../../lib/api-error';

const cents = (value: string | number): bigint => {
  const str = String(value);
  const [whole, fraction = ''] = str.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
};
const money = (value: bigint) => `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
const formatOrderNumber = () => `AM-${randomUUID().replaceAll('-', '').slice(0, 20).toUpperCase()}`;
const reservationMinutes = 15;

export type CheckoutInput = {
  shippingAddress: { recipientName: string; phone: string; division: string; district: string; addressLine: string };
  couponCode?: string;
  idempotencyKey: string;
};

export class CommerceService {
  private async getOrCreateCart(tx: typeof db, customerId: string) {
    await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).for('update');
    let [cart] = await tx.select().from(carts).where(eq(carts.customerId, customerId)).for('update').limit(1);
    if (!cart) [cart] = await tx.insert(carts).values({ customerId }).returning();
    return cart;
  }

  async getCart(customerId: string) {
    return db.transaction(async (tx) => {
      const cart = await this.getOrCreateCart(tx, customerId);
      const now = new Date();
      const rows = await tx.select({
        item: cartItems, variant: variants, product: products,
        price: prices,
      }).from(cartItems)
        .innerJoin(variants, eq(variants.id, cartItems.variantId))
        .innerJoin(products, eq(products.id, variants.productId))
        .leftJoin(prices, and(eq(prices.variantId, variants.id), lte(prices.validFrom, now), or(isNull(prices.validUntil), gt(prices.validUntil, now))))
        .where(eq(cartItems.cartId, cart.id)).orderBy(asc(cartItems.createdAt));
      return { id: cart.id, items: rows.map(({ item, variant, product, price }) => ({
        id: item.id, variantId: variant.id, sku: variant.sku, productName: product.name,
        quantity: item.quantity, currentPrice: price ? price.salePrice ?? price.listPrice : null,
      })) };
    });
  }

  async addCartItem(customerId: string, variantId: string, quantity: number) {
    return db.transaction(async (tx) => {
      const cart = await this.getOrCreateCart(tx, customerId);
      const [existing] = await tx.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId))).for('update').limit(1);
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      if (nextQuantity > 1_000_000) throw new ApiError(400, 'Cart quantity exceeds the allowed limit');
      if (existing) {
        const [row] = await tx.update(cartItems).set({ quantity: nextQuantity }).where(eq(cartItems.id, existing.id)).returning();
        return row;
      }
      const [row] = await tx.insert(cartItems).values({ cartId: cart.id, variantId, quantity }).returning();
      return row;
    });
  }

  async updateCartItem(customerId: string, itemId: string, quantity: number) {
    return db.transaction(async (tx) => {
      const cart = await this.getOrCreateCart(tx, customerId);
      const [row] = await tx.update(cartItems).set({ quantity })
        .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id))).returning();
      return row ?? null;
    });
  }

  async removeCartItem(customerId: string, itemId: string) {
    return db.transaction(async (tx) => {
      const cart = await this.getOrCreateCart(tx, customerId);
      const [row] = await tx.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id))).returning();
      return Boolean(row);
    });
  }

  async listWishlists(customerId: string) {
    return db.select().from(wishlists).where(eq(wishlists.customerId, customerId)).orderBy(asc(wishlists.createdAt));
  }
  async getWishlist(customerId: string, wishlistId: string) {
    const [list] = await db.select().from(wishlists).where(and(eq(wishlists.id, wishlistId), eq(wishlists.customerId, customerId))).limit(1);
    if (!list) return null;
    const items = await db.select().from(wishlistItems).where(eq(wishlistItems.wishlistId, list.id)).orderBy(asc(wishlistItems.createdAt));
    return { ...list, items };
  }
  async createWishlist(customerId: string, name: string) {
    const [row] = await db.insert(wishlists).values({ customerId, name }).returning();
    return row;
  }
  async deleteWishlist(customerId: string, wishlistId: string) {
    const [row] = await db.delete(wishlists).where(and(eq(wishlists.id, wishlistId), eq(wishlists.customerId, customerId))).returning();
    return Boolean(row);
  }
  async addWishlistItem(customerId: string, wishlistId: string, target: { productId?: string; variantId?: string }) {
    const [list] = await db.select({ id: wishlists.id }).from(wishlists).where(and(eq(wishlists.id, wishlistId), eq(wishlists.customerId, customerId))).limit(1);
    if (!list) return null;
    const [row] = await db.insert(wishlistItems).values({ wishlistId, productId: target.productId, variantId: target.variantId }).returning();
    return row;
  }
  async removeWishlistItem(customerId: string, wishlistId: string, itemId: string) {
    const [row] = await db.delete(wishlistItems).where(and(
      eq(wishlistItems.id, itemId), eq(wishlistItems.wishlistId, wishlistId),
      sql`exists (select 1 from ${wishlists} where ${wishlists.id} = ${wishlistItems.wishlistId} and ${wishlists.customerId} = ${customerId})`
    )).returning();
    return Boolean(row);
  }

  private async cartLines(tx: typeof db, customerId: string) {
    const cart = await this.getOrCreateCart(tx, customerId);
    const now = new Date();
    const lines = await tx.select({ item: cartItems, variant: variants, product: products, price: prices })
      .from(cartItems).innerJoin(variants, eq(variants.id, cartItems.variantId))
      .innerJoin(products, eq(products.id, variants.productId))
      .leftJoin(prices, and(eq(prices.variantId, variants.id), lte(prices.validFrom, now), or(isNull(prices.validUntil), gt(prices.validUntil, now))))
      .where(eq(cartItems.cartId, cart.id)).orderBy(asc(variants.id)).for('update', { of: cartItems });
    if (!lines.length) throw new ApiError(400, 'Cart is empty');
    if (lines.some((line) => !line.price)) throw new ApiError(409, 'A cart item has no current price');
    return { cart, lines };
  }

  private async couponDiscount(tx: typeof db, couponCode: string | undefined, subtotal: bigint) {
    if (!couponCode) return { couponId: null as string | null, discount: 0n };
    const normalized = couponCode.trim().toUpperCase();
    const [coupon] = await tx.select().from(coupons).where(eq(coupons.code, normalized)).for('update').limit(1);
    if (!coupon || !coupon.isActive || (coupon.expiryDate && coupon.expiryDate <= new Date()) ||
      (coupon.usageLimit !== null && coupon.timesUsed >= coupon.usageLimit) || subtotal < cents(coupon.minOrderAmount)) {
      throw new ApiError(400, 'Coupon is invalid or not applicable');
    }
    const discount = coupon.discountType === 'fixed'
      ? (cents(coupon.discountValue) < subtotal ? cents(coupon.discountValue) : subtotal)
      : (subtotal * cents(coupon.discountValue) + 5000n) / 10000n;
    return { couponId: coupon.id, discount };
  }

  async validateCoupon(customerId: string, couponCode: string) {
    return db.transaction(async (tx) => {
      const { lines } = await this.cartLines(tx, customerId);
      const subtotal = lines.reduce((sum, line) => sum + cents(line.price!.salePrice ?? line.price!.listPrice) * BigInt(line.item.quantity), 0n);
      const quote = await this.couponDiscount(tx, couponCode, subtotal);
      return { itemsTotal: money(subtotal), discountTotal: money(quote.discount), grandTotal: money(subtotal - quote.discount) };
    });
  }

  async checkout(customerId: string, input: CheckoutInput) {
    return db.transaction(async (tx) => {
      // Customer/cart row locks serialize cart mutation and duplicate submissions for this cart.
      await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).for('update');
      // Expire first so an idempotent retry cannot return an expired order as pending.
      await this.expireReservations(tx);
      const [prior] = await tx.select({ id: orders.id, orderNumber: orders.orderNumber, status: orders.status })
        .from(orders).where(and(eq(orders.customerId, customerId), eq(orders.checkoutKey, input.idempotencyKey))).limit(1);
      if (prior) return { id: prior.id, orderNumber: prior.orderNumber, status: prior.status, replayed: true };

      const { cart, lines } = await this.cartLines(tx, customerId);
      const subtotal = lines.reduce((sum, line) => sum + cents(line.price!.salePrice ?? line.price!.listPrice) * BigInt(line.item.quantity), 0n);
      const coupon = await this.couponDiscount(tx, input.couponCode, subtotal);
      const grandTotal = subtotal - coupon.discount;
      const [order] = await tx.insert(orders).values({
        customerId, orderNumber: formatOrderNumber(), status: 'pending', itemsTotal: money(subtotal),
        discountTotal: money(coupon.discount), shippingFee: '0.00', taxTotal: '0.00', grandTotal: money(grandTotal),
        checkoutKey: input.idempotencyKey,
      }).returning();
      await tx.insert(orderAddresses).values({ orderId: order.id, ...input.shippingAddress });
      if (coupon.couponId) await tx.insert(couponUses).values({ couponId: coupon.couponId, orderId: order.id, customerId, discountGiven: money(coupon.discount) });

      const expiresAt = new Date(Date.now() + reservationMinutes * 60_000);
      const orderLines = await tx.insert(orderItems).values(lines.map(({ item, variant, product, price }) => ({
        orderId: order.id, variantId: variant.id, name: product.name, sku: variant.sku,
        purchasedPrice: price!.salePrice ?? price!.listPrice, taxAmount: '0.00', sellerId: product.vendorId, quantity: item.quantity,
      }))).returning();

      for (const line of orderLines) {
        let remaining = line.quantity;
        const availableStocks = await tx.select().from(stocks).where(and(eq(stocks.variantId, line.variantId), sql`${stocks.onHandQty} > ${stocks.reservedQty}`))
          .orderBy(asc(stocks.id)).for('update');
        for (const stock of availableStocks) {
          if (remaining === 0) break;
          const allocated = Math.min(remaining, stock.onHandQty - stock.reservedQty);
          // The reservation trigger conditionally increments stock counters and aborts on insufficiency.
          await tx.insert(orderReservations).values({ orderItemId: line.id, stockId: stock.id, quantity: allocated, expiresAt });
          remaining -= allocated;
        }
        if (remaining > 0) throw new ApiError(409, 'Insufficient inventory for one or more items');
      }
      await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
      await tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
      return { id: order.id, orderNumber: order.orderNumber, status: order.status, grandTotal: order.grandTotal, reservationExpiresAt: expiresAt.toISOString(), replayed: false };
    });
  }

  private async expireReservations(tx: typeof db, now = new Date()) {
    const candidates = await tx.selectDistinct({ orderId: orderItems.orderId }).from(orderReservations)
      .innerJoin(orderItems, eq(orderItems.id, orderReservations.orderItemId))
      .where(and(eq(orderReservations.status, 'reserved'), lte(orderReservations.expiresAt, now)));
    if (!candidates.length) return;
    const orderIds = candidates.map((row) => row.orderId);
    // Lock orders before allocations, matching cancellation's lock order and avoiding inversion.
    await tx.select({ id: orders.id }).from(orders).where(inArray(orders.id, orderIds)).orderBy(asc(orders.id)).for('update');
    const expired = await tx.select({ reservation: orderReservations, orderId: orderItems.orderId }).from(orderReservations)
      .innerJoin(orderItems, eq(orderItems.id, orderReservations.orderItemId))
      .where(and(inArray(orderItems.orderId, orderIds), eq(orderReservations.status, 'reserved'), lte(orderReservations.expiresAt, now)))
      .orderBy(asc(orderReservations.stockId)).for('update', { of: orderReservations });
    const touchedOrders = new Set<string>();
    for (const { reservation, orderId } of expired) {
      const [updated] = await tx.update(orderReservations).set({ status: 'expired', updatedAt: now }).where(eq(orderReservations.id, reservation.id)).returning({ id: orderReservations.id });
      if (!updated) throw new ApiError(409, 'Inventory reservation is inconsistent');
      touchedOrders.add(orderId);
    }
    for (const orderId of touchedOrders) {
      const [stillReserved] = await tx.select({ id: orderReservations.id }).from(orderReservations)
        .innerJoin(orderItems, eq(orderItems.id, orderReservations.orderItemId))
        .where(and(eq(orderItems.orderId, orderId), eq(orderReservations.status, 'reserved'))).limit(1);
      if (!stillReserved) await tx.update(orders).set({ status: 'cancelled', updatedAt: now }).where(and(eq(orders.id, orderId), eq(orders.status, 'pending')));
    }
  }

  async listOrders(customerId: string, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const [data, [{ count }]] = await Promise.all([
      db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.orderDate)).limit(pageSize).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(orders).where(eq(orders.customerId, customerId)),
    ]);
    return { data, meta: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) } };
  }
  async getOrder(customerId: string, orderId: string) {
    const [order] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.customerId, customerId))).limit(1);
    if (!order) return null;
    const [address] = await db.select().from(orderAddresses).where(eq(orderAddresses.orderId, order.id)).limit(1);
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(asc(orderItems.createdAt));
    return { ...order, address: address ?? null, items };
  }
  async cancelOrder(customerId: string, orderId: string) {
    return db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.customerId, customerId))).for('update').limit(1);
      if (!order) return null;
      if (order.status !== 'pending') throw new ApiError(409, 'Only pending orders can be cancelled');
      const [authorizedPayment] = await tx.select({ id: payments.id }).from(payments)
        .where(and(eq(payments.orderId, order.id), eq(payments.status, 'authorized'))).limit(1);
      if (authorizedPayment) throw new ApiError(409, 'Cancel or capture the authorized payment before cancelling this order');
      const allocations = await tx.select().from(orderReservations).innerJoin(orderItems, eq(orderItems.id, orderReservations.orderItemId))
        .where(and(eq(orderItems.orderId, order.id), eq(orderReservations.status, 'reserved')))
        .orderBy(asc(orderReservations.stockId)).for('update', { of: orderReservations });
      for (const { order_reservations: allocation } of allocations) {
        const [updated] = await tx.update(orderReservations).set({ status: 'released', updatedAt: new Date() })
          .where(eq(orderReservations.id, allocation.id)).returning({ id: orderReservations.id });
        if (!updated) throw new ApiError(409, 'Inventory reservation is inconsistent');
      }
      const [updatedOrder] = await tx.update(orders).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(orders.id, order.id)).returning();
      return updatedOrder;
    });
  }
}

export const commerceService = new CommerceService();

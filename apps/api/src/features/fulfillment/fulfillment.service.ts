import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@repo/db';
import { orderItems, orders, reviews, shipmentItems, shipments } from '@repo/db/schema';
import { ApiError } from '../../lib/api-error';
import type { Principal } from '../../middleware/auth.middleware';
import { shipmentQuantityFits } from './fulfillment.rules';

export class FulfillmentService {
  async createShipment(principal: Principal, orderId: string, input: { courierName?: string; trackingNumber?: string; items: { orderItemId: string; quantity: number }[] }) {
    return db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update').limit(1);
      if (!order || !['confirmed', 'processing', 'shipped'].includes(order.status)) throw new ApiError(404, 'Fulfillable order not found');
      const ids = [...new Set(input.items.map((x) => x.orderItemId))];
      if (!ids.length || ids.length !== input.items.length) throw new ApiError(400, 'Shipment items are invalid');
      const lines = await tx.select().from(orderItems).where(and(eq(orderItems.orderId, orderId), inArray(orderItems.id, ids))).orderBy(asc(orderItems.id)).for('update');
      if (lines.length !== ids.length) throw new ApiError(400, 'Shipment item does not belong to the order');
      const vendors = [...new Set(lines.map((x) => x.sellerId))];
      if (vendors.length !== 1 || (principal.role === 'vendor' && vendors[0] !== principal.vendorId) || !['admin', 'vendor'].includes(principal.role)) throw new ApiError(403, 'Forbidden');
      const existingAllocations = await tx.select({
        orderItemId: shipmentItems.orderItemId,
        quantity: sql<number>`coalesce(sum(${shipmentItems.quantity}), 0)::int`,
      }).from(shipmentItems).innerJoin(shipments, eq(shipments.id, shipmentItems.shipmentId))
        .where(and(eq(shipments.orderId, orderId), inArray(shipmentItems.orderItemId, ids)))
        .groupBy(shipmentItems.orderItemId);
      const allocatedByItem = new Map(existingAllocations.map((allocation) => [allocation.orderItemId, allocation.quantity]));
      for (const line of lines) {
        const request = input.items.find((item) => item.orderItemId === line.id);
        if (!request || !shipmentQuantityFits(line.quantity, allocatedByItem.get(line.id) ?? 0, request.quantity)) {
          throw new ApiError(409, 'Shipment quantities exceed the remaining order quantity');
        }
      }
      const [shipment] = await tx.insert(shipments).values({ orderId, vendorId: vendors[0]!, courierName: input.courierName, trackingNumber: input.trackingNumber }).returning();
      await tx.insert(shipmentItems).values(input.items.map((item) => ({ shipmentId: shipment.id, orderItemId: item.orderItemId, quantity: item.quantity })));
      return { ...shipment, items: input.items };
    });
  }
  async listShipments(principal: Principal, orderId: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return null;
    const rows = await db.select({ shipment: shipments, item: shipmentItems, orderItem: orderItems }).from(shipments).leftJoin(shipmentItems, eq(shipmentItems.shipmentId, shipments.id)).leftJoin(orderItems, eq(orderItems.id, shipmentItems.orderItemId)).where(and(
      eq(shipments.orderId, orderId),
      ...(principal.role === 'vendor' && principal.vendorId ? [eq(shipments.vendorId, principal.vendorId)] : [])
    ));
    if (principal.role === 'customer' && order.customerId !== principal.customerId) return null;
    return rows;
  }
  async updateShipment(principal: Principal, id: string, status: 'shipped' | 'in_transit' | 'delivered', details: { courierName?: string; trackingNumber?: string }) {
    return db.transaction(async (tx) => {
      const [found] = await tx.select({ orderId: shipments.orderId }).from(shipments).where(eq(shipments.id, id)).limit(1);
      if (!found) return null;
      // Serialize completion calculations for every shipment belonging to this order.
      await tx.select({ id: orders.id }).from(orders).where(eq(orders.id, found.orderId)).for('update');
      const [s] = await tx.select().from(shipments).where(eq(shipments.id, id)).for('update').limit(1);
      if (!s) return null;
      if (principal.role !== 'admin' && (principal.role !== 'vendor' || principal.vendorId !== s.vendorId)) throw new ApiError(403, 'Forbidden');
      const allowed: Record<string, string[]> = { pending: ['shipped'], shipped: ['in_transit', 'delivered'], in_transit: ['delivered'] };
      if (!allowed[s.status]?.includes(status)) throw new ApiError(409, 'Invalid shipment status transition');
      const now = new Date();
      const [updated] = await tx.update(shipments).set({ status, courierName: details.courierName ?? s.courierName, trackingNumber: details.trackingNumber ?? s.trackingNumber, shippedAt: s.shippedAt ?? (status === 'shipped' ? now : null), deliveredAt: status === 'delivered' ? now : null }).where(eq(shipments.id, id)).returning();
      if (status === 'delivered') {
        const [pending] = await tx.select({ id: shipmentItems.id }).from(shipmentItems).innerJoin(shipments, eq(shipments.id, shipmentItems.shipmentId)).where(and(eq(shipments.orderId, s.orderId), sql`${shipments.status} <> 'delivered'`)).limit(1);
        const [unallocated] = await tx.select({ id: orderItems.id }).from(orderItems).where(and(eq(orderItems.orderId, s.orderId), sql`${orderItems.quantity} > coalesce((select sum(si.quantity) from ${shipmentItems} si join ${shipments} sh on sh.shipment_id = si.shipment_id where si.order_item_id = ${orderItems.id} and sh.status = 'delivered'),0)`)).limit(1);
        if (!pending && !unallocated) await tx.update(orders).set({ status: 'delivered', updatedAt: now }).where(eq(orders.id, s.orderId));
        else await tx.update(orders).set({ status: 'shipped', updatedAt: now }).where(eq(orders.id, s.orderId));
      } else if (status === 'shipped' || status === 'in_transit') await tx.update(orders).set({ status: 'shipped', updatedAt: now }).where(eq(orders.id, s.orderId));
      return updated;
    });
  }
  async createReview(customerId: string, orderItemId: string, rating: number, comment?: string) {
    const [line] = await db.select({ orderId: orderItems.orderId }).from(orderItems).where(eq(orderItems.id, orderItemId)).limit(1);
    if (!line) throw new ApiError(404, 'Delivered purchase not found');
    const [order] = await db.select().from(orders).where(and(eq(orders.id, line.orderId), eq(orders.customerId, customerId), eq(orders.status, 'delivered'))).limit(1);
    if (!order) throw new ApiError(404, 'Delivered purchase not found');
    const [row] = await db.insert(reviews).values({ customerId, orderItemId, rating, comment, isApproved: false }).returning({ id: reviews.id, rating: reviews.rating, comment: reviews.comment, isApproved: reviews.isApproved, createdAt: reviews.createdAt });
    return row;
  }
  async listReviews(productId: string) {
    return db.execute(sql`select r.review_id as id, r.rating, r.comment, r.created_at as "createdAt" from ${reviews} r join ${orderItems} oi on oi.order_item_id = r.order_item_id where oi.variant_id in (select variant_id from variants where product_id = ${productId}) and r.is_approved = true order by r.created_at desc`);
  }
  async moderateReview(id: string, approved: boolean) {
    const [row] = await db.update(reviews).set({ isApproved: approved, updatedAt: new Date() }).where(eq(reviews.id, id)).returning({ id: reviews.id, isApproved: reviews.isApproved });
    return row ?? null;
  }
}
export const fulfillmentService = new FulfillmentService();

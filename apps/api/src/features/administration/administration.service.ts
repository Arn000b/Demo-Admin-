import { and, asc, count, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { db } from '@repo/db';
import { customers, orderAddresses, orderItems, orders, payments, products, shipmentItems, shipments, stocks, users, variants, vendors } from '@repo/db/schema';
import { ApiError } from '../../lib/api-error';

export type VendorFilter = { page: number; pageSize: number; q?: string; status?: 'pending' | 'active' | 'suspended' | 'closed' };
export type VendorInput = { name: string; email: string; phone?: string | null; address?: string | null; commissionRate?: string };
export type VendorUpdate = Partial<VendorInput> & { status?: 'pending' | 'active' | 'suspended' | 'closed' };

export class AdministrationService {
  async listVendors(input: VendorFilter) {
    const filters = [];
    if (input.status) filters.push(eq(vendors.status, input.status));
    if (input.q) filters.push(ilike(vendors.name, `%${input.q}%`));
    const where = filters.length ? and(...filters) : undefined;
    const offset = (input.page - 1) * input.pageSize;
    const [data, [{ total }]] = await Promise.all([
      db.select({ id: vendors.id, name: vendors.name, email: vendors.email, phone: vendors.phone, address: vendors.address, commissionRate: vendors.commissionRate, status: vendors.status, createdAt: vendors.createdAt, updatedAt: vendors.updatedAt, accountLinked: sql<boolean>`${vendors.userId} is not null` })
        .from(vendors).where(where).orderBy(desc(vendors.createdAt)).limit(input.pageSize).offset(offset),
      db.select({ total: count() }).from(vendors).where(where),
    ]);
    return { data, meta: { page: input.page, pageSize: input.pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / input.pageSize) } };
  }

  async createVendor(input: VendorInput) {
    const [row] = await db.insert(vendors).values({ ...input, email: input.email.toLowerCase(), status: 'pending' })
      .returning({ id: vendors.id, name: vendors.name, email: vendors.email, phone: vendors.phone, address: vendors.address, commissionRate: vendors.commissionRate, status: vendors.status, createdAt: vendors.createdAt, updatedAt: vendors.updatedAt });
    return { ...row, accountLinked: false };
  }

  async updateVendor(id: string, input: VendorUpdate) {
    const [row] = await db.update(vendors).set({ ...input, ...(input.email ? { email: input.email.toLowerCase() } : {}), updatedAt: new Date() })
      .where(eq(vendors.id, id)).returning({ id: vendors.id, name: vendors.name, email: vendors.email, phone: vendors.phone, address: vendors.address, commissionRate: vendors.commissionRate, status: vendors.status, createdAt: vendors.createdAt, updatedAt: vendors.updatedAt, accountLinked: sql<boolean>`${vendors.userId} is not null` });
    return row ?? null;
  }

  async linkVendorAccount(id: string, email: string) {
    return db.transaction(async (tx) => {
      const [vendor] = await tx.select({ id: vendors.id, userId: vendors.userId }).from(vendors).where(eq(vendors.id, id)).for('update').limit(1);
      if (!vendor) return null;
      if (vendor.userId) throw new ApiError(409, 'Vendor already has a linked account');
      const [user] = await tx.select({ id: users.id }).from(users).where(and(eq(users.email, email.toLowerCase()), eq(users.role, 'vendor'))).for('update').limit(1);
      if (!user) throw new ApiError(404, 'Provisioned vendor account not found');
      const [linked] = await tx.select({ id: vendors.id }).from(vendors).where(eq(vendors.userId, user.id)).limit(1);
      if (linked) throw new ApiError(409, 'Vendor account is already linked');
      const [row] = await tx.update(vendors).set({ userId: user.id, updatedAt: new Date() }).where(eq(vendors.id, id))
        .returning({ id: vendors.id, name: vendors.name, email: vendors.email, status: vendors.status });
      return row ? { ...row, accountLinked: true } : null;
    });
  }

  async adminOverview() {
    const [[{ customerCount }], [{ vendorCount }], [{ productCount }], orderRows] = await Promise.all([
      db.select({ customerCount: count() }).from(customers),
      db.select({ vendorCount: count() }).from(vendors),
      db.select({ productCount: count() }).from(products),
      db.select({ status: orders.status, count: sql<number>`count(*)::int` }).from(orders).groupBy(orders.status),
    ]);
    return { customers: Number(customerCount), vendors: Number(vendorCount), products: Number(productCount), ordersByStatus: orderRows };
  }

  async listAdminOrders(page: number, pageSize: number, status?: string) {
    const where = status ? eq(orders.status, status) : undefined;
    const offset = (page - 1) * pageSize;
    const [data, [{ total }]] = await Promise.all([
      db.select({ id: orders.id, orderNumber: orders.orderNumber, status: orders.status, itemsTotal: orders.itemsTotal, discountTotal: orders.discountTotal,
        shippingFee: orders.shippingFee, taxTotal: orders.taxTotal, grandTotal: orders.grandTotal, orderDate: orders.orderDate,
        customerId: customers.id, customerName: customers.fullName })
        .from(orders).innerJoin(customers, eq(customers.id, orders.customerId)).where(where)
        .orderBy(desc(orders.orderDate)).limit(pageSize).offset(offset),
      db.select({ total: count() }).from(orders).where(where),
    ]);
    return { data, meta: { page, pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / pageSize) } };
  }

  async getAdminOrder(id: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return null;
    const [[address], items, paymentRows] = await Promise.all([
      db.select().from(orderAddresses).where(eq(orderAddresses.orderId, id)).limit(1),
      db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.createdAt)),
      db.select({ id: payments.id, amount: payments.amount, paymentMethod: payments.paymentMethod, status: payments.status, paymentDate: payments.paymentDate })
        .from(payments).where(eq(payments.orderId, id)),
    ]);
    return { ...order, address: address ?? null, items, payments: paymentRows };
  }

  async vendorSummary(vendorId: string) {
    const [[{ productsCount }], [{ orderLineCount }], [{ onHandUnits, reservedUnits }], shipmentsByStatus] = await Promise.all([
      db.select({ productsCount: count() }).from(products).where(eq(products.vendorId, vendorId)),
      db.select({ orderLineCount: count() }).from(orderItems).where(eq(orderItems.sellerId, vendorId)),
      db.select({ onHandUnits: sql<number>`coalesce(sum(${stocks.onHandQty}),0)::int`, reservedUnits: sql<number>`coalesce(sum(${stocks.reservedQty}),0)::int` })
        .from(stocks).innerJoin(variants, eq(variants.id, stocks.variantId)).innerJoin(products, eq(products.id, variants.productId)).where(eq(products.vendorId, vendorId)),
      db.select({ status: shipments.status, count: sql<number>`count(*)::int` }).from(shipments).where(eq(shipments.vendorId, vendorId)).groupBy(shipments.status),
    ]);
    return { products: Number(productsCount), orderLines: Number(orderLineCount), onHandUnits: Number(onHandUnits), reservedUnits: Number(reservedUnits), shipmentsByStatus };
  }

  async vendorProducts(vendorId: string, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const [data, [{ total }]] = await Promise.all([
      db.select().from(products).where(eq(products.vendorId, vendorId)).orderBy(desc(products.createdAt)).limit(pageSize).offset(offset),
      db.select({ total: count() }).from(products).where(eq(products.vendorId, vendorId)),
    ]);
    const productIds = data.map((product) => product.id);
    const variantRows = productIds.length ? await db.select().from(variants).where(inArray(variants.productId, productIds)).orderBy(variants.sku) : [];
    return { data: data.map((product) => ({ ...product, variants: variantRows.filter((variant) => variant.productId === product.id) })), meta: { page, pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / pageSize) } };
  }

  async vendorOrderLines(vendorId: string, page: number, pageSize: number, status?: string) {
    const filters = [eq(orderItems.sellerId, vendorId)];
    if (status) filters.push(eq(orders.status, status));
    const where = and(...filters);
    const offset = (page - 1) * pageSize;
    const [data, [{ total }]] = await Promise.all([
      db.select({ orderId: orders.id, orderNumber: orders.orderNumber, orderStatus: orders.status, orderDate: orders.orderDate,
        orderItemId: orderItems.id, name: orderItems.name, sku: orderItems.sku, quantity: orderItems.quantity,
        purchasedPrice: orderItems.purchasedPrice, address: orderAddresses })
        .from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId))
        .leftJoin(orderAddresses, eq(orderAddresses.orderId, orders.id)).where(where)
        .orderBy(desc(orders.orderDate), desc(orderItems.createdAt)).limit(pageSize).offset(offset),
      db.select({ total: count() }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(where),
    ]);
    return { data, meta: { page, pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / pageSize) } };
  }

  async vendorShipmentLines(vendorId: string, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const [data, [{ total }]] = await Promise.all([
      db.select({ shipment: shipments, item: shipmentItems, orderNumber: orders.orderNumber, orderStatus: orders.status, line: orderItems })
        .from(shipments).innerJoin(orders, eq(orders.id, shipments.orderId))
        .innerJoin(shipmentItems, eq(shipmentItems.shipmentId, shipments.id))
        .innerJoin(orderItems, eq(orderItems.id, shipmentItems.orderItemId))
        .where(and(eq(shipments.vendorId, vendorId), eq(orderItems.sellerId, vendorId)))
        .orderBy(desc(shipments.createdAt)).limit(pageSize).offset(offset),
      db.select({ total: count() }).from(shipments).innerJoin(shipmentItems, eq(shipmentItems.shipmentId, shipments.id))
        .innerJoin(orderItems, eq(orderItems.id, shipmentItems.orderItemId)).where(and(eq(shipments.vendorId, vendorId), eq(orderItems.sellerId, vendorId))),
    ]);
    return { data, meta: { page, pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / pageSize) } };
  }
}

export const administrationService = new AdministrationService();

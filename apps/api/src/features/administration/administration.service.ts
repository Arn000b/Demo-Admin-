import { and, asc, count, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { db } from '@repo/db';
import {
  coupons,
  customers,
  orderAddresses,
  orderItems,
  orders,
  payments,
  products,
  shipmentItems,
  shipments,
  stocks,
  users,
  variants,
  vendorLedgerEntries,
  vendors,
} from '@repo/db/schema';
import { ApiError } from '../../lib/api-error';

export type VendorFilter = {
  page: number;
  pageSize: number;
  q?: string;
  status?: 'pending' | 'active' | 'suspended' | 'closed';
};
export type VendorInput = {
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  commissionRate?: string;
};
export type VendorUpdate = Partial<VendorInput> & {
  status?: 'pending' | 'active' | 'suspended' | 'closed';
};

export interface AdminStoreSettings {
  storeName: string;
  tagline: string;
  currency: string;
  currencySymbol: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  vatPercent: number;
  defaultDeliveryFeeDhaka: number;
  defaultDeliveryFeeOutside: number;
  freeShippingThreshold: number;
  bkash: boolean;
  nagad: boolean;
  sslcommerz: boolean;
  cod: boolean;
}

const DEFAULT_STORE_SETTINGS: AdminStoreSettings = {
  storeName: 'Anonna Mart',
  tagline: 'Premium Lifestyle & Organic Living',
  currency: 'BDT (৳)',
  currencySymbol: '৳',
  supportEmail: 'care@anonnamart.com',
  supportPhone: '+880 9612-889900',
  address: 'Anonna Mart HQ, Road 11, Banani, Dhaka 1213, Bangladesh',
  vatPercent: 5,
  defaultDeliveryFeeDhaka: 80,
  defaultDeliveryFeeOutside: 150,
  freeShippingThreshold: 5000,
  bkash: true,
  nagad: true,
  sslcommerz: true,
  cod: true,
};

const amountCents = (amount: string) => BigInt(amount.replace('.', ''));
const formatMoney = (amount: bigint) => {
  const absolute = amount < 0n ? -amount : amount;
  return `${amount < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
};

export class AdministrationService {
  private currentSettings: AdminStoreSettings = { ...DEFAULT_STORE_SETTINGS };
  private featuredProductIds: string[] = [];

  async listVendors(input: VendorFilter) {
    const filters = [];
    if (input.status) filters.push(eq(vendors.status, input.status));
    if (input.q) filters.push(ilike(vendors.name, `%${input.q}%`));
    const where = filters.length ? and(...filters) : undefined;
    const offset = (input.page - 1) * input.pageSize;
    const [data, [{ total }]] = await Promise.all([
      db
        .select({
          id: vendors.id,
          name: vendors.name,
          email: vendors.email,
          phone: vendors.phone,
          address: vendors.address,
          commissionRate: vendors.commissionRate,
          status: vendors.status,
          createdAt: vendors.createdAt,
          updatedAt: vendors.updatedAt,
          accountLinked: sql<boolean>`${vendors.userId} is not null`,
        })
        .from(vendors)
        .where(where)
        .orderBy(desc(vendors.createdAt))
        .limit(input.pageSize)
        .offset(offset),
      db.select({ total: count() }).from(vendors).where(where),
    ]);
    return {
      data,
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / input.pageSize),
      },
    };
  }

  async createVendor(input: VendorInput) {
    const [row] = await db
      .insert(vendors)
      .values({
        ...input,
        email: input.email.toLowerCase(),
        status: 'pending',
        commissionRate: input.commissionRate ?? '10.00',
      })
      .returning({
        id: vendors.id,
        name: vendors.name,
        email: vendors.email,
        phone: vendors.phone,
        address: vendors.address,
        commissionRate: vendors.commissionRate,
        status: vendors.status,
        createdAt: vendors.createdAt,
        updatedAt: vendors.updatedAt,
      });
    return { ...row, accountLinked: false };
  }

  async applyAsVendor(input: {
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
  }) {
    try {
      const [row] = await db
        .insert(vendors)
        .values({
          ...input,
          email: input.email.toLowerCase(),
          commissionRate: '10.00',
          status: 'pending',
        })
        .returning({
          id: vendors.id,
          name: vendors.name,
          email: vendors.email,
          status: vendors.status,
          createdAt: vendors.createdAt,
        });
      return row;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ApiError(409, 'An application already exists for this email');
      }
      throw error;
    }
  }

  async updateVendor(id: string, input: VendorUpdate) {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ userId: vendors.userId })
        .from(vendors)
        .where(eq(vendors.id, id))
        .for('update')
        .limit(1);
      if (!existing) return null;
      if (input.status === 'active' && !existing.userId)
        throw new ApiError(409, 'Link an approved vendor account before activation');
      const [row] = await tx
        .update(vendors)
        .set({
          ...input,
          ...(input.email ? { email: input.email.toLowerCase() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(vendors.id, id))
        .returning({
          id: vendors.id,
          name: vendors.name,
          email: vendors.email,
          phone: vendors.phone,
          address: vendors.address,
          commissionRate: vendors.commissionRate,
          status: vendors.status,
          createdAt: vendors.createdAt,
          updatedAt: vendors.updatedAt,
          accountLinked: sql<boolean>`${vendors.userId} is not null`,
        });
      return row ?? null;
    });
  }

  async linkVendorAccount(id: string, email: string) {
    return db.transaction(async (tx) => {
      const [vendor] = await tx
        .select({ id: vendors.id, userId: vendors.userId })
        .from(vendors)
        .where(eq(vendors.id, id))
        .for('update')
        .limit(1);
      if (!vendor) return null;
      if (vendor.userId) throw new ApiError(409, 'Vendor already has a linked account');
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email.toLowerCase()), eq(users.role, 'vendor')))
        .for('update')
        .limit(1);
      if (!user) throw new ApiError(404, 'Provisioned vendor account not found');
      const [linked] = await tx
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.userId, user.id))
        .limit(1);
      if (linked) throw new ApiError(409, 'Vendor account is already linked');
      const [row] = await tx
        .update(vendors)
        .set({ userId: user.id, updatedAt: new Date() })
        .where(eq(vendors.id, id))
        .returning({
          id: vendors.id,
          name: vendors.name,
          email: vendors.email,
          status: vendors.status,
        });
      return row ? { ...row, accountLinked: true } : null;
    });
  }

  async adminOverview() {
    const [[{ customerCount }], [{ vendorCount }], [{ productCount }], orderRows] =
      await Promise.all([
        db.select({ customerCount: count() }).from(customers),
        db.select({ vendorCount: count() }).from(vendors),
        db.select({ productCount: count() }).from(products),
        db
          .select({ status: orders.status, count: sql<number>`count(*)::int` })
          .from(orders)
          .groupBy(orders.status),
      ]);
    return {
      customers: Number(customerCount),
      vendors: Number(vendorCount),
      products: Number(productCount),
      ordersByStatus: orderRows,
    };
  }

  async adminAnalytics() {
    const [
      [{ customerCount }],
      [{ vendorCount }],
      [{ productCount }],
      [{ orderCount }],
      [{ capturedRevenue }],
      ordersByStatus,
    ] = await Promise.all([
      db.select({ customerCount: count() }).from(customers),
      db.select({ vendorCount: count() }).from(vendors),
      db.select({ productCount: count() }).from(products),
      db.select({ orderCount: count() }).from(orders),
      db
        .select({ capturedRevenue: sql<string>`coalesce(sum(${payments.amount}), '0.00')::text` })
        .from(payments)
        .where(eq(payments.status, 'captured')),
      db
        .select({ status: orders.status, count: sql<number>`count(*)::int` })
        .from(orders)
        .groupBy(orders.status),
    ]);
    const revenueNumber = Number(capturedRevenue || 0);
    const totalOrders = Number(orderCount || 0);
    const averageOrderValue = totalOrders > 0 ? (revenueNumber / totalOrders).toFixed(2) : '0.00';
    return {
      customers: Number(customerCount),
      vendors: Number(vendorCount),
      products: Number(productCount),
      orders: totalOrders,
      totalRevenue: capturedRevenue,
      averageOrderValue,
      ordersByStatus,
    };
  }

  async listAdminOrders(page: number, pageSize: number, status?: string) {
    const where = status ? eq(orders.status, status) : undefined;
    const offset = (page - 1) * pageSize;
    const [data, [{ total }]] = await Promise.all([
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          itemsTotal: orders.itemsTotal,
          discountTotal: orders.discountTotal,
          shippingFee: orders.shippingFee,
          taxTotal: orders.taxTotal,
          grandTotal: orders.grandTotal,
          orderDate: orders.orderDate,
          customerId: customers.id,
          customerName: customers.fullName,
        })
        .from(orders)
        .innerJoin(customers, eq(customers.id, orders.customerId))
        .where(where)
        .orderBy(desc(orders.orderDate))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(orders).where(where),
    ]);
    return {
      data,
      meta: {
        page,
        pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / pageSize),
      },
    };
  }

  async getAdminOrder(id: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return null;
    const [[address], items, paymentRows] = await Promise.all([
      db.select().from(orderAddresses).where(eq(orderAddresses.orderId, id)).limit(1),
      db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id))
        .orderBy(asc(orderItems.createdAt)),
      db
        .select({
          id: payments.id,
          amount: payments.amount,
          paymentMethod: payments.paymentMethod,
          status: payments.status,
          paymentDate: payments.paymentDate,
        })
        .from(payments)
        .where(eq(payments.orderId, id)),
    ]);
    return { ...order, address: address ?? null, items, payments: paymentRows };
  }

  async vendorSummary(vendorId: string) {
    const [
      [{ productsCount }],
      [{ orderLineCount }],
      [{ onHandUnits, reservedUnits }],
      shipmentsByStatus,
    ] = await Promise.all([
      db.select({ productsCount: count() }).from(products).where(eq(products.vendorId, vendorId)),
      db
        .select({ orderLineCount: count() })
        .from(orderItems)
        .where(eq(orderItems.sellerId, vendorId)),
      db
        .select({
          onHandUnits: sql<number>`coalesce(sum(${stocks.onHandQty}),0)::int`,
          reservedUnits: sql<number>`coalesce(sum(${stocks.reservedQty}),0)::int`,
        })
        .from(stocks)
        .innerJoin(variants, eq(variants.id, stocks.variantId))
        .innerJoin(products, eq(products.id, variants.productId))
        .where(eq(products.vendorId, vendorId)),
      db
        .select({ status: shipments.status, count: sql<number>`count(*)::int` })
        .from(shipments)
        .where(eq(shipments.vendorId, vendorId))
        .groupBy(shipments.status),
    ]);
    const [balance] = await db
      .select({ balance: sql<string>`coalesce(sum(${vendorLedgerEntries.amount}), 0)::text` })
      .from(vendorLedgerEntries)
      .where(eq(vendorLedgerEntries.vendorId, vendorId));
    return {
      products: Number(productsCount),
      orderLines: Number(orderLineCount),
      onHandUnits: Number(onHandUnits),
      reservedUnits: Number(reservedUnits),
      shipmentsByStatus,
      availablePayoutBalance: balance.balance,
      currency: 'BDT',
    };
  }

  async vendorLedger(vendorId: string, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const [data, [{ total }], [{ balance }]] = await Promise.all([
      db
        .select()
        .from(vendorLedgerEntries)
        .where(eq(vendorLedgerEntries.vendorId, vendorId))
        .orderBy(desc(vendorLedgerEntries.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(vendorLedgerEntries)
        .where(eq(vendorLedgerEntries.vendorId, vendorId)),
      db
        .select({ balance: sql<string>`coalesce(sum(${vendorLedgerEntries.amount}), 0)::text` })
        .from(vendorLedgerEntries)
        .where(eq(vendorLedgerEntries.vendorId, vendorId)),
    ]);
    return {
      data,
      balance,
      currency: 'BDT',
      meta: {
        page,
        pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / pageSize),
      },
    };
  }

  async recordVendorPayout(input: {
    vendorId: string;
    amount: string;
    idempotencyKey: string;
    memo?: string;
    recordedByUserId: string;
  }) {
    return db.transaction(async (tx) => {
      const [vendor] = await tx
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.id, input.vendorId))
        .for('update')
        .limit(1);
      if (!vendor) throw new ApiError(404, 'Vendor not found');
      const referenceKey = `payout:${input.vendorId}:${input.idempotencyKey}`;
      const [existing] = await tx
        .select()
        .from(vendorLedgerEntries)
        .where(eq(vendorLedgerEntries.referenceKey, referenceKey))
        .limit(1);
      if (existing) {
        if (existing.amount !== `-${input.amount}`)
          throw new ApiError(409, 'Payout idempotency key was used for a different amount');
        return existing;
      }
      const [sum] = await tx
        .select({ balance: sql<string>`coalesce(sum(${vendorLedgerEntries.amount}), 0)::text` })
        .from(vendorLedgerEntries)
        .where(eq(vendorLedgerEntries.vendorId, input.vendorId));
      const amount = amountCents(input.amount);
      if (amount <= 0n || amount > amountCents(sum.balance))
        throw new ApiError(409, 'Payout exceeds the available vendor balance');
      const [entry] = await tx
        .insert(vendorLedgerEntries)
        .values({
          vendorId: input.vendorId,
          entryType: 'payout',
          amount: formatMoney(-amount),
          currency: 'BDT',
          referenceKey,
          memo: input.memo,
          recordedByUserId: input.recordedByUserId,
        })
        .returning();
      return entry;
    });
  }

  async vendorProducts(vendorId: string, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const [data, [{ total }]] = await Promise.all([
      db
        .select()
        .from(products)
        .where(eq(products.vendorId, vendorId))
        .orderBy(desc(products.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(products).where(eq(products.vendorId, vendorId)),
    ]);
    const productIds = data.map((product) => product.id);
    const variantRows = productIds.length
      ? await db
          .select()
          .from(variants)
          .where(inArray(variants.productId, productIds))
          .orderBy(variants.sku)
      : [];
    return {
      data: data.map((product) => ({
        ...product,
        variants: variantRows.filter((variant) => variant.productId === product.id),
      })),
      meta: {
        page,
        pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / pageSize),
      },
    };
  }

  async vendorOrderLines(vendorId: string, page: number, pageSize: number, status?: string) {
    const filters = [eq(orderItems.sellerId, vendorId)];
    if (status) filters.push(eq(orders.status, status));
    const where = and(...filters);
    const offset = (page - 1) * pageSize;
    const [data, [{ total }]] = await Promise.all([
      db
        .select({
          orderId: orders.id,
          orderNumber: orders.orderNumber,
          orderStatus: orders.status,
          orderDate: orders.orderDate,
          orderItemId: orderItems.id,
          name: orderItems.name,
          sku: orderItems.sku,
          quantity: orderItems.quantity,
          purchasedPrice: orderItems.purchasedPrice,
          address: orderAddresses,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .leftJoin(orderAddresses, eq(orderAddresses.orderId, orders.id))
        .where(where)
        .orderBy(desc(orders.orderDate), desc(orderItems.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(where),
    ]);
    return {
      data,
      meta: {
        page,
        pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / pageSize),
      },
    };
  }

  async vendorShipmentLines(vendorId: string, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const [data, [{ total }]] = await Promise.all([
      db
        .select({
          shipment: shipments,
          item: shipmentItems,
          orderNumber: orders.orderNumber,
          orderStatus: orders.status,
          line: orderItems,
        })
        .from(shipments)
        .innerJoin(orders, eq(orders.id, shipments.orderId))
        .innerJoin(shipmentItems, eq(shipmentItems.shipmentId, shipments.id))
        .innerJoin(orderItems, eq(orderItems.id, shipmentItems.orderItemId))
        .where(and(eq(shipments.vendorId, vendorId), eq(orderItems.sellerId, vendorId)))
        .orderBy(desc(shipments.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(shipments)
        .innerJoin(shipmentItems, eq(shipmentItems.shipmentId, shipments.id))
        .innerJoin(orderItems, eq(orderItems.id, shipmentItems.orderItemId))
        .where(and(eq(shipments.vendorId, vendorId), eq(orderItems.sellerId, vendorId))),
    ]);
    return {
      data,
      meta: {
        page,
        pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / pageSize),
      },
    };
  }

  async listCoupons(page: number, pageSize: number, q?: string, isActive?: boolean) {
    const filters = [];
    if (isActive !== undefined) filters.push(eq(coupons.isActive, isActive));
    if (q) filters.push(ilike(coupons.code, `%${q}%`));
    const where = filters.length ? and(...filters) : undefined;
    const offset = (page - 1) * pageSize;
    const [data, [{ total }]] = await Promise.all([
      db
        .select()
        .from(coupons)
        .where(where)
        .orderBy(desc(coupons.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(coupons).where(where),
    ]);
    return {
      data,
      meta: {
        page,
        pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / pageSize),
      },
    };
  }

  async getCoupon(id: string) {
    const [row] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
    return row ?? null;
  }

  async createCoupon(input: {
    code: string;
    discountType: 'fixed' | 'percentage';
    discountValue: string;
    minOrderAmount?: string;
    expiryDate?: Date | null;
    usageLimit?: number | null;
    isActive?: boolean;
  }) {
    const [row] = await db
      .insert(coupons)
      .values({
        code: input.code.toUpperCase().trim(),
        discountType: input.discountType,
        discountValue: input.discountValue,
        minOrderAmount: input.minOrderAmount ?? '0.00',
        expiryDate: input.expiryDate ?? null,
        usageLimit: input.usageLimit ?? null,
        isActive: input.isActive ?? true,
      })
      .returning();
    return row;
  }

  async updateCoupon(
    id: string,
    input: {
      code?: string;
      discountType?: 'fixed' | 'percentage';
      discountValue?: string;
      minOrderAmount?: string;
      expiryDate?: Date | null;
      usageLimit?: number | null;
      isActive?: boolean;
    }
  ) {
    const values: Record<string, unknown> = {};
    if (input.code !== undefined) values.code = input.code.toUpperCase().trim();
    if (input.discountType !== undefined) values.discountType = input.discountType;
    if (input.discountValue !== undefined) values.discountValue = input.discountValue;
    if (input.minOrderAmount !== undefined) values.minOrderAmount = input.minOrderAmount;
    if (input.expiryDate !== undefined) values.expiryDate = input.expiryDate;
    if (input.usageLimit !== undefined) values.usageLimit = input.usageLimit;
    if (input.isActive !== undefined) values.isActive = input.isActive;
    const [row] = await db.update(coupons).set(values).where(eq(coupons.id, id)).returning();
    return row ?? null;
  }

  async deleteCoupon(id: string) {
    const [row] = await db.delete(coupons).where(eq(coupons.id, id)).returning();
    return row ?? null;
  }

  async getStoreSettings(): Promise<AdminStoreSettings> {
    return { ...this.currentSettings };
  }

  async updateStoreSettings(input: Partial<AdminStoreSettings>): Promise<AdminStoreSettings> {
    this.currentSettings = { ...this.currentSettings, ...input };
    return { ...this.currentSettings };
  }

  async getFeaturedProductIds(): Promise<string[]> {
    return [...this.featuredProductIds];
  }

  async setFeaturedProductIds(ids: string[]): Promise<string[]> {
    this.featuredProductIds = Array.from(new Set(ids));
    return [...this.featuredProductIds];
  }
}

export const administrationService = new AdministrationService();

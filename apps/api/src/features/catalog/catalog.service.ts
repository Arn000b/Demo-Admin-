import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '@repo/db';
import { categories, orderReservations, prices, products, stocks, variants, vendors, warehouses } from '@repo/db/schema';
import { ApiError } from '../../lib/api-error';
import { assertNoCategoryCycle, priceIntervalsOverlap } from './catalog.rules';

export class CatalogService {
  async listCategories(page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const [data, [{ count }]] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.name)).limit(pageSize).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(categories),
    ]);
    return { data, meta: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) } };
  }

  async getCategory(id: string) {
    const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return row ?? null;
  }

  async createCategory(input: { name: string; webSlug: string; description?: string; parentCategoryId?: string | null }) {
    if (input.parentCategoryId) await this.ensureCategory(input.parentCategoryId);
    const [row] = await db.insert(categories).values(input).returning();
    return row;
  }

  async updateCategory(id: string, input: { name?: string; webSlug?: string; description?: string | null; parentCategoryId?: string | null }) {
    return db.transaction(async (tx) => {
      // Serializes category reparenting so two simultaneous updates cannot create a cycle.
      await tx.execute(sql`LOCK TABLE ${categories} IN SHARE ROW EXCLUSIVE MODE`);
      const [current] = await tx.select().from(categories).where(eq(categories.id, id)).limit(1);
      if (!current) return null;
      if (input.parentCategoryId) {
        await assertNoCategoryCycle(id, input.parentCategoryId, async (parentId) => {
          const [ancestor] = await tx.select({ parentCategoryId: categories.parentCategoryId })
            .from(categories).where(eq(categories.id, parentId)).limit(1);
          return ancestor ? ancestor.parentCategoryId : undefined;
        });
      }
      const [row] = await tx.update(categories).set(input).where(eq(categories.id, id)).returning();
      return row ?? null;
    });
  }

  async deleteCategory(id: string) {
    const [row] = await db.delete(categories).where(eq(categories.id, id)).returning();
    return row ?? null;
  }

  async listProducts(input: { page: number; pageSize: number; categoryId?: string; vendorId?: string; q?: string }) {
    const filters = [];
    if (input.categoryId) filters.push(eq(products.categoryId, input.categoryId));
    if (input.vendorId) filters.push(eq(products.vendorId, input.vendorId));
    if (input.q) filters.push(ilike(products.name, `%${input.q}%`));
    const where = filters.length ? and(...filters) : undefined;
    const offset = (input.page - 1) * input.pageSize;
    const [data, [{ count }]] = await Promise.all([
      db.select().from(products).where(where).orderBy(asc(products.name)).limit(input.pageSize).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
    ]);
    return { data, meta: { page: input.page, pageSize: input.pageSize, total: count, totalPages: Math.ceil(count / input.pageSize) } };
  }

  async getProduct(id: string) {
    const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return row ?? null;
  }

  async getProductVendorId(id: string): Promise<string | null> {
    const [row] = await db.select({ vendorId: products.vendorId }).from(products).where(eq(products.id, id)).limit(1);
    return row?.vendorId ?? null;
  }

  async createProduct(input: { categoryId: string; vendorId: string; name: string; description?: string }) {
    await this.ensureCategory(input.categoryId);
    const [vendor] = await db.select({ id: vendors.id, status: vendors.status }).from(vendors).where(eq(vendors.id, input.vendorId)).limit(1);
    if (!vendor) throw new ApiError(404, 'Vendor not found');
    if (vendor.status !== 'active') throw new ApiError(409, 'Products can only be assigned to active vendors');
    const [row] = await db.insert(products).values(input).returning();
    return row;
  }

  async updateProduct(id: string, input: { categoryId?: string; name?: string; description?: string | null }) {
    if (input.categoryId) await this.ensureCategory(input.categoryId);
    const [row] = await db.update(products).set({ ...input, updatedAt: new Date() }).where(eq(products.id, id)).returning();
    return row ?? null;
  }

  async deleteProduct(id: string) {
    const [row] = await db.delete(products).where(eq(products.id, id)).returning();
    return row ?? null;
  }

  async listVariants(productId: string) {
    if (!(await this.getProduct(productId))) throw new ApiError(404, 'Product not found');
    return db.select().from(variants).where(eq(variants.productId, productId)).orderBy(asc(variants.sku));
  }

  async getVariant(id: string) {
    const [row] = await db.select().from(variants).where(eq(variants.id, id)).limit(1);
    return row ?? null;
  }

  async getVariantVendorId(id: string): Promise<string | null> {
    const [row] = await db.select({ vendorId: products.vendorId }).from(variants)
      .innerJoin(products, eq(products.id, variants.productId)).where(eq(variants.id, id)).limit(1);
    return row?.vendorId ?? null;
  }

  async createVariant(input: { productId: string; sku: string; color?: string | null; size?: string | null; weight?: string | null }) {
    if (!(await this.getProduct(input.productId))) throw new ApiError(404, 'Product not found');
    const [row] = await db.insert(variants).values(input).returning();
    return row;
  }

  async updateVariant(id: string, input: { sku?: string; color?: string | null; size?: string | null; weight?: string | null }) {
    const [row] = await db.update(variants).set({ ...input, updatedAt: new Date() }).where(eq(variants.id, id)).returning();
    return row ?? null;
  }

  async deleteVariant(id: string) {
    const [row] = await db.delete(variants).where(eq(variants.id, id)).returning();
    return row ?? null;
  }

  async listPrices(variantId: string) {
    if (!(await this.getVariant(variantId))) throw new ApiError(404, 'Variant not found');
    return db.select().from(prices).where(eq(prices.variantId, variantId)).orderBy(desc(prices.validFrom));
  }

  async createPrice(input: { variantId: string; listPrice: string; salePrice?: string | null; validFrom: Date; validUntil?: Date | null }) {
    if (!(await this.getVariant(input.variantId))) throw new ApiError(404, 'Variant not found');
    if (input.validUntil && input.validUntil <= input.validFrom) throw new ApiError(400, 'Price end must be later than its start');
    const previous = await db.select({ validFrom: prices.validFrom, validUntil: prices.validUntil })
      .from(prices).where(eq(prices.variantId, input.variantId));
    if (previous.some((entry) => priceIntervalsOverlap(input.validFrom, input.validUntil ?? null, entry.validFrom, entry.validUntil))) {
      throw new ApiError(409, 'Price interval overlaps existing history');
    }
    const [row] = await db.insert(prices).values(input).returning();
    return row;
  }

  async listWarehouses(page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const [data, [{ count }]] = await Promise.all([
      db.select().from(warehouses).orderBy(asc(warehouses.name)).limit(pageSize).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(warehouses),
    ]);
    return { data, meta: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) } };
  }

  async createWarehouse(input: { name: string; location: string }) {
    const [row] = await db.insert(warehouses).values(input).returning();
    return row;
  }

  async getWarehouse(id: string) {
    const [row] = await db.select().from(warehouses).where(eq(warehouses.id, id)).limit(1);
    return row ?? null;
  }

  async updateWarehouse(id: string, input: { name?: string; location?: string }) {
    const [row] = await db.update(warehouses).set(input).where(eq(warehouses.id, id)).returning();
    return row ?? null;
  }

  async deleteWarehouse(id: string) {
    const [row] = await db.delete(warehouses).where(eq(warehouses.id, id)).returning();
    return row ?? null;
  }

  async listStock(input: { variantId?: string; warehouseId?: string; vendorId?: string | null }) {
    const filters = [];
    if (input.variantId) filters.push(eq(stocks.variantId, input.variantId));
    if (input.warehouseId) filters.push(eq(stocks.warehouseId, input.warehouseId));
    if (input.vendorId) filters.push(eq(products.vendorId, input.vendorId));
    const rows = await db.select({ stock: stocks, product: products }).from(stocks)
      .innerJoin(variants, eq(variants.id, stocks.variantId)).innerJoin(products, eq(products.id, variants.productId))
      .where(filters.length ? and(...filters) : undefined).orderBy(asc(stocks.warehouseId), asc(stocks.variantId));
    return rows.map(({ stock }) => ({ ...stock, availableQty: stock.onHandQty - stock.reservedQty }));
  }

  async getStockOwner(variantId: string): Promise<string | null> { return this.getVariantVendorId(variantId); }

  async adjustStock(input: { variantId: string; warehouseId: string; delta: number }) {
    await this.ensureStockReferences(input.variantId, input.warehouseId);
    return db.transaction(async (tx) => {
      await tx.insert(stocks).values({ variantId: input.variantId, warehouseId: input.warehouseId, onHandQty: 0, reservedQty: 0 })
        .onConflictDoNothing({ target: [stocks.variantId, stocks.warehouseId] });
      const [current] = await tx.select().from(stocks)
        .where(and(eq(stocks.variantId, input.variantId), eq(stocks.warehouseId, input.warehouseId))).for('update').limit(1);
      if (!current) throw new ApiError(404, 'Stock record not found');
      const onHandQty = current.onHandQty + input.delta;
      if (!Number.isSafeInteger(onHandQty) || onHandQty < current.reservedQty || onHandQty > 2_147_483_647) {
        throw new ApiError(409, 'Adjustment would make stock negative or lower than reserved stock');
      }
      const [row] = await tx.update(stocks).set({ onHandQty, updatedAt: new Date() }).where(eq(stocks.id, current.id)).returning();
      return { ...row, availableQty: row.onHandQty - row.reservedQty };
    });
  }

  async reserveStock(input: { variantId: string; warehouseId: string; quantity: number }) {
    await this.ensureStockReferences(input.variantId, input.warehouseId);
    const [row] = await db.update(stocks).set({ reservedQty: sql`${stocks.reservedQty} + ${input.quantity}`, updatedAt: new Date() })
      .where(and(eq(stocks.variantId, input.variantId), eq(stocks.warehouseId, input.warehouseId), sql`${stocks.onHandQty} - ${stocks.reservedQty} >= ${input.quantity}`)).returning();
    if (row) return { ...row, availableQty: row.onHandQty - row.reservedQty };
    const [stock] = await db.select({ id: stocks.id }).from(stocks).where(and(eq(stocks.variantId, input.variantId), eq(stocks.warehouseId, input.warehouseId))).limit(1);
    if (!stock) throw new ApiError(404, 'Stock record not found');
    throw new ApiError(409, 'Insufficient available stock');
  }

  async releaseStock(input: { variantId: string; warehouseId: string; quantity: number }) {
    await this.ensureStockReferences(input.variantId, input.warehouseId);
    return db.transaction(async (tx) => {
      const [current] = await tx.select().from(stocks)
        .where(and(eq(stocks.variantId, input.variantId), eq(stocks.warehouseId, input.warehouseId))).for('update').limit(1);
      if (!current) throw new ApiError(404, 'Stock record not found');
      const [{ orderReserved }] = await tx.select({
        orderReserved: sql<number>`coalesce(sum(${orderReservations.quantity}), 0)::int`,
      }).from(orderReservations).where(and(eq(orderReservations.stockId, current.id), eq(orderReservations.status, 'reserved')));
      if (current.reservedQty - input.quantity < orderReserved) throw new ApiError(409, 'Release exceeds unallocated reserved stock');
      if (current.reservedQty < input.quantity) throw new ApiError(409, 'Release exceeds reserved stock');
      const [row] = await tx.update(stocks).set({ reservedQty: current.reservedQty - input.quantity, updatedAt: new Date() })
        .where(eq(stocks.id, current.id)).returning();
      return { ...row, availableQty: row.onHandQty - row.reservedQty };
    });
  }

  private async ensureCategory(id: string) {
    if (!(await this.getCategory(id))) throw new ApiError(404, 'Category not found');
  }

  private async ensureStockReferences(variantId: string, warehouseId: string) {
    if (!(await this.getVariant(variantId))) throw new ApiError(404, 'Variant not found');
    const [warehouse] = await db.select({ id: warehouses.id }).from(warehouses).where(eq(warehouses.id, warehouseId)).limit(1);
    if (!warehouse) throw new ApiError(404, 'Warehouse not found');
  }
}

export const catalogService = new CatalogService();

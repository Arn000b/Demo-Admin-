import { Hono } from 'hono';
import { z } from 'zod';
import { createAuthMiddleware, type AuthEnv, type Principal } from '../../middleware/auth.middleware';
import { paginationSchema } from '../../lib/pagination';
import type { AuthService } from '../auth/auth.types';
import type { CatalogService } from './catalog.service';

const uuid = z.string().uuid();
const pageQuery = paginationSchema;
const categoryCreate = z.object({ name: z.string().trim().min(1).max(160), webSlug: z.string().trim().min(1).max(180), description: z.string().max(10_000).optional(), parentCategoryId: uuid.nullable().optional() }).strict();
const categoryUpdate = categoryCreate.partial().strict();
const productCreate = z.object({ categoryId: uuid, vendorId: uuid.optional(), name: z.string().trim().min(1).max(240), description: z.string().max(20_000).optional() }).strict();
const productUpdate = z.object({ categoryId: uuid.optional(), name: z.string().trim().min(1).max(240).optional(), description: z.string().max(20_000).nullable().optional() }).strict();
const weightSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/).refine((value) => Number(value) > 0, 'Weight must be positive').nullable().optional();
const variantCreate = z.object({ sku: z.string().trim().min(1).max(100), color: z.string().trim().max(80).nullable().optional(), size: z.string().trim().max(80).nullable().optional(), weight: weightSchema }).strict();
const variantUpdate = variantCreate.partial().strict();
const moneySchema = z.string().regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/);
const toCents = (amount: string) => {
  const [whole, fraction = ''] = amount.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
};
const priceCreate = z.object({ listPrice: moneySchema, salePrice: moneySchema.nullable().optional(), validFrom: z.string().datetime({ offset: true }).transform((value) => new Date(value)), validUntil: z.string().datetime({ offset: true }).transform((value) => new Date(value)).nullable().optional() })
  .strict().refine((value) => !value.salePrice || toCents(value.salePrice) <= toCents(value.listPrice), { message: 'Sale price cannot exceed list price' });
const warehouseCreate = z.object({ name: z.string().trim().min(1).max(160), location: z.string().trim().min(1).max(10_000) }).strict();
const warehouseUpdate = warehouseCreate.partial().strict();
const stockQuery = z.object({ variantId: uuid.optional(), warehouseId: uuid.optional() });
const stockBase = z.object({ variantId: uuid, warehouseId: uuid });
const quantitySchema = stockBase.extend({ quantity: z.number().int().positive().max(1_000_000) }).strict();
const adjustmentSchema = stockBase.extend({ delta: z.number().int().min(-1_000_000).max(1_000_000).refine((v) => v !== 0) }).strict();

function invalid(c: { json: (body: object, status?: 400) => Response }) {
  return c.json({ success: false, error: 'Invalid request data' }, 400);
}
function roleCanManage(principal: Principal, vendorId: string | null): boolean {
  return principal.role === 'admin' || (principal.role === 'vendor' && Boolean(principal.vendorId) && principal.vendorId === vendorId);
}
function itemWriter(resolveVendor: (id: string) => Promise<string | null>, param = 'id') {
  return async (c: Parameters<import('hono').MiddlewareHandler<AuthEnv>>[0], next: Parameters<import('hono').MiddlewareHandler<AuthEnv>>[1]) => {
    const principal = c.get('principal');
    if (principal.role === 'admin') return next();
    if (principal.role !== 'vendor' || !principal.vendorId) return c.json({ success: false, error: 'Forbidden' }, 403);
    const id = c.req.param(param);
    if (!id || !uuid.safeParse(id).success) return c.json({ success: false, error: 'Invalid request data' }, 400);
    const owner = id ? await resolveVendor(id) : null;
    if (!owner) return c.json({ success: false, error: 'Record not found' }, 404);
    if (owner !== principal.vendorId) return c.json({ success: false, error: 'Forbidden' }, 403);
    await next();
  };
}

export function createCatalogRoutes(service: CatalogService, authService: AuthService) {
  const auth = createAuthMiddleware((token) => authService.resolveSession(token));
  const categories = new Hono<AuthEnv>();
  categories.get('/', auth, async (c) => {
    const parsed = pageQuery.safeParse(c.req.query()); if (!parsed.success) return invalid(c);
    return c.json({ success: true, ...(await service.listCategories(parsed.data.page, parsed.data.pageSize)) });
  });
  categories.get('/:id', auth, async (c) => {
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const row = await service.getCategory(c.req.param('id'));
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Category not found' }, 404);
  });
  categories.post('/', auth, async (c) => {
    if (c.get('principal').role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);
    const parsed = categoryCreate.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return invalid(c);
    return c.json({ success: true, data: await service.createCategory(parsed.data) }, 201);
  });
  categories.patch('/:id', auth, async (c) => {
    if (c.get('principal').role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const parsed = categoryUpdate.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return invalid(c);
    const row = await service.updateCategory(c.req.param('id'), parsed.data);
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Category not found' }, 404);
  });
  categories.delete('/:id', auth, async (c) => {
    if (c.get('principal').role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const row = await service.deleteCategory(c.req.param('id'));
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Category not found' }, 404);
  });

  const products = new Hono<AuthEnv>();
  products.get('/', auth, async (c) => {
    const parsed = pageQuery.extend({ categoryId: uuid.optional(), vendorId: uuid.optional(), q: z.string().trim().max(160).optional() }).safeParse(c.req.query());
    if (!parsed.success) return invalid(c);
    return c.json({ success: true, ...(await service.listProducts(parsed.data)) });
  });
  products.get('/:id', auth, async (c) => {
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const row = await service.getProduct(c.req.param('id'));
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Product not found' }, 404);
  });
  products.post('/', auth, async (c) => {
    const principal = c.get('principal');
    if (principal.role !== 'admin' && principal.role !== 'vendor') return c.json({ success: false, error: 'Forbidden' }, 403);
    const parsed = productCreate.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return invalid(c);
    if (principal.role === 'vendor' && parsed.data.vendorId) return invalid(c);
    const vendorId = principal.role === 'vendor' ? principal.vendorId : parsed.data.vendorId;
    if (!vendorId) return invalid(c);
    return c.json({ success: true, data: await service.createProduct({ ...parsed.data, vendorId }) }, 201);
  });
  products.patch('/:id', auth, itemWriter((id) => service.getProductVendorId(id)), async (c) => {
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const parsed = productUpdate.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return invalid(c);
    const row = await service.updateProduct(c.req.param('id'), parsed.data);
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Product not found' }, 404);
  });
  products.delete('/:id', auth, itemWriter((id) => service.getProductVendorId(id)), async (c) => {
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const row = await service.deleteProduct(c.req.param('id'));
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Product not found' }, 404);
  });
  products.get('/:productId/variants', auth, async (c) => {
    if (!uuid.safeParse(c.req.param('productId')).success) return invalid(c);
    return c.json({ success: true, data: await service.listVariants(c.req.param('productId')) });
  });
  products.post('/:productId/variants', auth, itemWriter((id) => service.getProductVendorId(id), 'productId'), async (c) => {
    if (!uuid.safeParse(c.req.param('productId')).success) return invalid(c);
    const parsed = variantCreate.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return invalid(c);
    return c.json({ success: true, data: await service.createVariant({ ...parsed.data, sku: parsed.data.sku.toUpperCase(), productId: c.req.param('productId') }) }, 201);
  });

  const variants = new Hono<AuthEnv>();
  variants.get('/:id', auth, async (c) => {
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const row = await service.getVariant(c.req.param('id'));
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Variant not found' }, 404);
  });
  variants.patch('/:id', auth, itemWriter((id) => service.getVariantVendorId(id)), async (c) => {
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const parsed = variantUpdate.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return invalid(c);
    const input = { ...parsed.data, ...(parsed.data.sku ? { sku: parsed.data.sku.toUpperCase() } : {}) };
    const row = await service.updateVariant(c.req.param('id'), input);
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Variant not found' }, 404);
  });
  variants.delete('/:id', auth, itemWriter((id) => service.getVariantVendorId(id)), async (c) => {
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const row = await service.deleteVariant(c.req.param('id'));
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Variant not found' }, 404);
  });
  variants.get('/:variantId/prices', auth, async (c) => {
    if (!uuid.safeParse(c.req.param('variantId')).success) return invalid(c);
    return c.json({ success: true, data: await service.listPrices(c.req.param('variantId')) });
  });
  variants.post('/:variantId/prices', auth, itemWriter((id) => service.getVariantVendorId(id), 'variantId'), async (c) => {
    if (!uuid.safeParse(c.req.param('variantId')).success) return invalid(c);
    const parsed = priceCreate.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return invalid(c);
    const row = await service.createPrice({ ...parsed.data, variantId: c.req.param('variantId') });
    return c.json({ success: true, data: row }, 201);
  });

  const warehouses = new Hono<AuthEnv>();
  warehouses.get('/', auth, async (c) => {
    const parsed = pageQuery.safeParse(c.req.query()); if (!parsed.success) return invalid(c);
    return c.json({ success: true, ...(await service.listWarehouses(parsed.data.page, parsed.data.pageSize)) });
  });
  warehouses.get('/:id', auth, async (c) => {
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const row = await service.getWarehouse(c.req.param('id'));
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Warehouse not found' }, 404);
  });
  warehouses.post('/', auth, async (c) => {
    if (c.get('principal').role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);
    const parsed = warehouseCreate.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return invalid(c);
    return c.json({ success: true, data: await service.createWarehouse(parsed.data) }, 201);
  });
  warehouses.patch('/:id', auth, async (c) => {
    if (c.get('principal').role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const parsed = warehouseUpdate.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return invalid(c);
    const row = await service.updateWarehouse(c.req.param('id'), parsed.data);
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Warehouse not found' }, 404);
  });
  warehouses.delete('/:id', auth, async (c) => {
    if (c.get('principal').role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403);
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const row = await service.deleteWarehouse(c.req.param('id'));
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Warehouse not found' }, 404);
  });

  const inventory = new Hono<AuthEnv>();
  inventory.get('/', auth, async (c) => {
    const parsed = stockQuery.safeParse(c.req.query()); if (!parsed.success) return invalid(c);
    const principal = c.get('principal');
    if (principal.role === 'vendor' && !principal.vendorId) return c.json({ success: false, error: 'Forbidden' }, 403);
    const vendorId = principal.role === 'vendor' ? principal.vendorId : null;
    return c.json({ success: true, data: await service.listStock({ ...parsed.data, vendorId }) });
  });

  const withStockAuthorization = async (c: Parameters<import('hono').MiddlewareHandler<AuthEnv>>[0], variantId: string) => {
    const principal = c.get('principal');
    if (principal.role === 'admin') return null;
    if (principal.role !== 'vendor' || !principal.vendorId) return c.json({ success: false, error: 'Forbidden' }, 403);
    const owner = await service.getStockOwner(variantId);
    if (!owner) return c.json({ success: false, error: 'Variant not found' }, 404);
    if (!roleCanManage(principal, owner)) return c.json({ success: false, error: 'Forbidden' }, 403);
    return null;
  };
  inventory.post('/adjustments', auth, async (c) => {
    const parsed = adjustmentSchema.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return invalid(c);
    const denied = await withStockAuthorization(c, parsed.data.variantId); if (denied) return denied;
    return c.json({ success: true, data: await service.adjustStock(parsed.data) });
  });
  inventory.post('/reservations', auth, async (c) => {
    const parsed = quantitySchema.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return invalid(c);
    const denied = await withStockAuthorization(c, parsed.data.variantId); if (denied) return denied;
    return c.json({ success: true, data: await service.reserveStock(parsed.data) });
  });
  inventory.post('/releases', auth, async (c) => {
    const parsed = quantitySchema.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return invalid(c);
    const denied = await withStockAuthorization(c, parsed.data.variantId); if (denied) return denied;
    return c.json({ success: true, data: await service.releaseStock(parsed.data) });
  });
  return { categories, products, variants, warehouses, inventory };
}

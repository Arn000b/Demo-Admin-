import type { Context } from 'hono';
import type { CatalogService } from '../catalog/catalog.service';
import type { AuthEnv } from '../../middleware/auth.middleware';
import {
  productCreateSchema,
  productQuerySchema,
  productUpdateSchema,
  uuidSchema,
  variantCreateSchema,
} from './product.schemas';

export class ProductController {
  constructor(private readonly catalogService: CatalogService) {}

  listProducts = async (c: Context<AuthEnv>) => {
    const parsed = productQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request data' }, 400);
    }
    const result = await this.catalogService.listProducts(parsed.data);
    return c.json({ success: true, ...result });
  };

  getProduct = async (c: Context<AuthEnv>) => {
    const id = c.req.param('id');
    if (!id || !uuidSchema.safeParse(id).success) {
      return c.json({ success: false, error: 'Invalid request data' }, 400);
    }
    const row = await this.catalogService.getProduct(id);
    if (!row) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }
    return c.json({ success: true, data: row });
  };

  createProduct = async (c: Context<AuthEnv>) => {
    const principal = c.get('principal');
    if (principal.role !== 'admin' && principal.role !== 'vendor') {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }
    const body = await c.req.json().catch(() => null);
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request data' }, 400);
    }
    if (principal.role === 'vendor' && parsed.data.vendorId) {
      return c.json({ success: false, error: 'Invalid request data' }, 400);
    }
    const vendorId = principal.role === 'vendor' ? principal.vendorId : parsed.data.vendorId;
    if (!vendorId) {
      return c.json({ success: false, error: 'Invalid request data' }, 400);
    }
    const created = await this.catalogService.createProduct({ ...parsed.data, vendorId });
    return c.json({ success: true, data: created }, 201);
  };

  updateProduct = async (c: Context<AuthEnv>) => {
    const id = c.req.param('id');
    if (!id || !uuidSchema.safeParse(id).success) {
      return c.json({ success: false, error: 'Invalid request data' }, 400);
    }
    const body = await c.req.json().catch(() => null);
    const parsed = productUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request data' }, 400);
    }
    const updated = await this.catalogService.updateProduct(id, parsed.data);
    if (!updated) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }
    return c.json({ success: true, data: updated });
  };

  deleteProduct = async (c: Context<AuthEnv>) => {
    const id = c.req.param('id');
    if (!id || !uuidSchema.safeParse(id).success) {
      return c.json({ success: false, error: 'Invalid request data' }, 400);
    }
    const deleted = await this.catalogService.deleteProduct(id);
    if (!deleted) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }
    return c.json({ success: true, data: deleted });
  };

  listVariants = async (c: Context<AuthEnv>) => {
    const id = c.req.param('id');
    if (!id || !uuidSchema.safeParse(id).success) {
      return c.json({ success: false, error: 'Invalid request data' }, 400);
    }
    const rows = await this.catalogService.listVariants(id);
    return c.json({ success: true, data: rows });
  };

  createVariant = async (c: Context<AuthEnv>) => {
    const id = c.req.param('id');
    if (!id || !uuidSchema.safeParse(id).success) {
      return c.json({ success: false, error: 'Invalid request data' }, 400);
    }
    const body = await c.req.json().catch(() => null);
    const parsed = variantCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request data' }, 400);
    }
    const created = await this.catalogService.createVariant({ ...parsed.data, productId: id });
    return c.json({ success: true, data: created }, 201);
  };
}

import { Hono } from 'hono';
import { z } from 'zod';
import { createAuthMiddleware, type AuthEnv } from '../../middleware/auth.middleware';
import type { AuthService } from '../auth/auth.types';
import type { AdministrationService } from './administration.service';
import { paginationSchema } from '../../lib/pagination';

const uuid = z.string().uuid();
const page = paginationSchema;
const status = z.enum(['pending', 'active', 'suspended', 'closed']);
const commission = z.string().regex(/^(?:0|[1-9]\d?)(?:\.\d{1,2})?$/).refine((n) => Number(n) <= 100);
const vendorFields = {
  name: z.string().trim().min(1).max(200), email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()),
  phone: z.string().trim().max(32).nullable().optional(), address: z.string().trim().max(10_000).nullable().optional(), commissionRate: commission.optional(),
};
const createVendor = z.object(vendorFields).strict();
const updateVendor = z.object({ ...vendorFields, status }).partial().strict();
const invalid = (c: { json: (body: object, code?: 400) => Response }) => c.json({ success: false, error: 'Invalid request data' }, 400);

export function createAdministrationRoutes(service: AdministrationService, authService: AuthService) {
  const auth = createAuthMiddleware((token) => authService.resolveSession(token));
  const admin = new Hono<AuthEnv>(); admin.use('*', auth);
  admin.use('*', async (c, next) => c.get('principal').role === 'admin' ? next() : c.json({ success: false, error: 'Forbidden' }, 403));
  admin.get('/vendors', async (c) => {
    const parsed = page.extend({ q: z.string().trim().max(120).optional(), status: status.optional() }).safeParse(c.req.query());
    if (!parsed.success) return invalid(c);
    return c.json({ success: true, ...(await service.listVendors(parsed.data)) });
  });
  admin.post('/vendors', async (c) => {
    const parsed = createVendor.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return invalid(c);
    return c.json({ success: true, data: await service.createVendor(parsed.data) }, 201);
  });
  admin.patch('/vendors/:id', async (c) => {
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const parsed = updateVendor.safeParse(await c.req.json().catch(() => null)); if (!parsed.success || !Object.keys(parsed.data).length) return invalid(c);
    const row = await service.updateVendor(c.req.param('id'), parsed.data);
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Vendor not found' }, 404);
  });
  admin.put('/vendors/:id/account', async (c) => {
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const parsed = z.object({ email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()) }).strict().safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return invalid(c);
    const row = await service.linkVendorAccount(c.req.param('id'), parsed.data.email);
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Vendor not found' }, 404);
  });
  admin.get('/overview', async (c) => c.json({ success: true, data: await service.adminOverview() }));
  admin.get('/orders', async (c) => {
    const parsed = page.extend({ status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional() }).safeParse(c.req.query());
    if (!parsed.success) return invalid(c);
    return c.json({ success: true, ...(await service.listAdminOrders(parsed.data.page, parsed.data.pageSize, parsed.data.status)) });
  });
  admin.get('/orders/:id', async (c) => {
    if (!uuid.safeParse(c.req.param('id')).success) return invalid(c);
    const row = await service.getAdminOrder(c.req.param('id'));
    return row ? c.json({ success: true, data: row }) : c.json({ success: false, error: 'Order not found' }, 404);
  });

  const vendor = new Hono<AuthEnv>(); vendor.use('*', auth);
  vendor.use('*', async (c, next) => {
    const p = c.get('principal'); return p.role === 'vendor' && p.vendorId ? next() : c.json({ success: false, error: 'Forbidden' }, 403);
  });
  vendor.get('/summary', async (c) => c.json({ success: true, data: await service.vendorSummary(c.get('principal').vendorId!) }));
  vendor.get('/products', async (c) => {
    const parsed = page.safeParse(c.req.query()); if (!parsed.success) return invalid(c);
    return c.json({ success: true, ...(await service.vendorProducts(c.get('principal').vendorId!, parsed.data.page, parsed.data.pageSize)) });
  });
  vendor.get('/orders', async (c) => {
    const parsed = page.extend({ status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional() }).safeParse(c.req.query());
    if (!parsed.success) return invalid(c);
    return c.json({ success: true, ...(await service.vendorOrderLines(c.get('principal').vendorId!, parsed.data.page, parsed.data.pageSize, parsed.data.status)) });
  });
  vendor.get('/shipments', async (c) => {
    const parsed = page.safeParse(c.req.query()); if (!parsed.success) return invalid(c);
    return c.json({ success: true, ...(await service.vendorShipmentLines(c.get('principal').vendorId!, parsed.data.page, parsed.data.pageSize)) });
  });
  return { admin, vendor };
}

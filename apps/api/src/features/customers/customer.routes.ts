import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { customerService } from './customer.controller';
import { authService } from '../auth/auth.service';
import { createAuthMiddleware, requireCustomerOwner, requireRole, type AuthEnv } from '../../middleware/auth.middleware';
import { paginationSchema } from '../../lib/pagination';
import type { CustomerService } from './customer.controller';
import type { AuthService } from '../auth/auth.types';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().email('Invalid email').max(320).transform((email) => email.toLowerCase()),
  phone: z.string().trim().max(32).optional(),
}).strict();

const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()).optional(),
  phone: z.string().trim().max(32).optional(),
  status: z.enum(['active', 'inactive', 'pending', 'suspended', 'closed']).optional(),
}).strict().refine((input) => Object.keys(input).length > 0);

// ─── Router ───────────────────────────────────────────────────────────────────

export function createCustomerRoutes(service: Pick<CustomerService, 'findAll' | 'findById' | 'create' | 'update' | 'remove'>, authentication: AuthService) {
  const auth = createAuthMiddleware((token) => authentication.resolveSession(token));
  return new Hono<AuthEnv>()
  // GET /api/customers?page=1&pageSize=20
  .get('/', auth, requireRole('admin'), zValidator('query', paginationSchema), async (c) => {
    const { page, pageSize } = c.req.valid('query');
    const result = await service.findAll(page, pageSize);
    return c.json({ success: true, ...result });
  })

  // GET /api/customers/:id
  .get('/:id', auth, requireCustomerOwner(), async (c) => {
    const id = c.req.param('id');
    const customer = await service.findById(id);
    if (!customer) {
      return c.json({ success: false, error: 'Customer not found' }, 404);
    }
    return c.json({ success: true, data: customer });
  })

  // POST /api/customers
  .post('/', auth, requireRole('admin'), zValidator('json', createCustomerSchema), async (c) => {
    const dto = c.req.valid('json');
    const customer = await service.create(dto);
    return c.json({ success: true, data: customer }, 201);
  })

  // PATCH /api/customers/:id
  .patch('/:id', auth, requireCustomerOwner(), zValidator('json', updateCustomerSchema), async (c) => {
    const id = c.req.param('id');
    const dto = c.req.valid('json');
    if (dto.status !== undefined && c.get('principal').role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }
    const customer = await service.update(id, dto);
    if (!customer) {
      return c.json({ success: false, error: 'Customer not found' }, 404);
    }
    return c.json({ success: true, data: customer });
  })

  // DELETE /api/customers/:id
  .delete('/:id', auth, requireCustomerOwner(), async (c) => {
    const id = c.req.param('id');
    const deleted = await service.remove(id);
    if (!deleted) {
      return c.json({ success: false, error: 'Customer not found' }, 404);
    }
    return c.json({ success: true, data: deleted });
  });
}

export const customerRoutes = createCustomerRoutes(customerService, authService);

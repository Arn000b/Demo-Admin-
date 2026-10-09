import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { customerService } from './customer.controller';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const customerRoutes = new Hono()
  // GET /api/customers?page=1&pageSize=20
  .get('/', zValidator('query', paginationSchema), async (c) => {
    const { page, pageSize } = c.req.valid('query');
    const result = await customerService.findAll(page, pageSize);
    return c.json({ success: true, ...result });
  })

  // GET /api/customers/:id
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const customer = await customerService.findById(id);
    if (!customer) {
      return c.json({ success: false, error: 'Customer not found' }, 404);
    }
    return c.json({ success: true, data: customer });
  })

  // POST /api/customers
  .post('/', zValidator('json', createCustomerSchema), async (c) => {
    const dto = c.req.valid('json');
    const customer = await customerService.create(dto);
    return c.json({ success: true, data: customer }, 201);
  })

  // PATCH /api/customers/:id
  .patch('/:id', zValidator('json', updateCustomerSchema), async (c) => {
    const id = c.req.param('id');
    const dto = c.req.valid('json');
    const customer = await customerService.update(id, dto);
    if (!customer) {
      return c.json({ success: false, error: 'Customer not found' }, 404);
    }
    return c.json({ success: true, data: customer });
  })

  // DELETE /api/customers/:id
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    const deleted = await customerService.remove(id);
    if (!deleted) {
      return c.json({ success: false, error: 'Customer not found' }, 404);
    }
    return c.json({ success: true, data: deleted });
  });

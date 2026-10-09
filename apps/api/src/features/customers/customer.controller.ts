import { db } from '@repo/db';
import { customers } from '@repo/db/schema';
import type { CreateCustomerDto, UpdateCustomerDto, PaginatedResponse } from '@repo/type';
import { eq, count } from 'drizzle-orm';

// ─── Customer Service (Business Logic) ───────────────────────────────────────

export class CustomerService {
  /**
   * Fetch a paginated list of customers
   */
  async findAll(page = 1, pageSize = 20): Promise<PaginatedResponse<typeof customers.$inferSelect>> {
    const offset = (page - 1) * pageSize;

    const [rows, [{ value: total }]] = await Promise.all([
      db.select().from(customers).limit(pageSize).offset(offset),
      db.select({ value: count() }).from(customers),
    ]);

    return {
      data: rows,
      meta: {
        page,
        pageSize,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / pageSize),
      },
    };
  }

  /**
   * Find a single customer by ID
   */
  async findById(id: string) {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return customer ?? null;
  }

  /**
   * Create a new customer
   */
  async create(dto: CreateCustomerDto) {
    const [created] = await db.insert(customers).values(dto).returning();
    return created;
  }

  /**
   * Update an existing customer
   */
  async update(id: string, dto: UpdateCustomerDto) {
    const [updated] = await db
      .update(customers)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updated ?? null;
  }

  /**
   * Delete a customer
   */
  async remove(id: string) {
    const [deleted] = await db.delete(customers).where(eq(customers.id, id)).returning();
    return deleted ?? null;
  }
}

export const customerService = new CustomerService();

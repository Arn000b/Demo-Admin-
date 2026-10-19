import { db } from '@repo/db';
import { customers, users } from '@repo/db/schema';
import type { CreateCustomerDto, UpdateCustomerDto, PaginatedResponse, CustomerStatus } from '@repo/type';
import { count, desc, eq } from 'drizzle-orm';

type CustomerView = {
  id: string; name: string; email: string; phone: string | null;
  status: CustomerStatus; createdAt: Date; updatedAt: Date;
};
const view = (row: { customer: typeof customers.$inferSelect; user: typeof users.$inferSelect }): CustomerView => ({
  id: row.customer.id, name: row.customer.fullName, email: row.user.email, phone: row.user.phone,
  status: row.user.status as CustomerView['status'], createdAt: row.customer.createdAt, updatedAt: row.customer.updatedAt,
});

export class CustomerService {
  async findAll(page = 1, pageSize = 20): Promise<PaginatedResponse<CustomerView>> {
    const offset = (page - 1) * pageSize;
    const [rows, [{ value: total }]] = await Promise.all([
      db.select({ customer: customers, user: users }).from(customers).innerJoin(users, eq(users.id, customers.userId)).orderBy(desc(customers.createdAt)).limit(pageSize).offset(offset),
      db.select({ value: count() }).from(customers),
    ]);
    return { data: rows.map(view), meta: { page, pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / pageSize) } };
  }

  async findById(id: string): Promise<CustomerView | null> {
    const [row] = await db.select({ customer: customers, user: users }).from(customers)
      .innerJoin(users, eq(users.id, customers.userId)).where(eq(customers.id, id)).limit(1);
    return row ? view(row) : null;
  }

  async create(dto: CreateCustomerDto): Promise<CustomerView> {
    return db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ email: dto.email.toLowerCase(), phone: dto.phone, status: 'pending', role: 'customer' }).returning();
      const [customer] = await tx.insert(customers).values({ userId: user.id, fullName: dto.name }).returning();
      return view({ customer, user });
    });
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerView | null> {
    return db.transaction(async (tx) => {
      const [customer] = await tx.select().from(customers).where(eq(customers.id, id)).limit(1);
      if (!customer) return null;
      const [user] = await tx.update(users).set({
        ...(dto.email === undefined ? {} : { email: dto.email.toLowerCase() }),
        ...(dto.phone === undefined ? {} : { phone: dto.phone }),
        ...(dto.status === undefined ? {} : { status: dto.status }), updatedAt: new Date(),
      }).where(eq(users.id, customer.userId)).returning();
      const [updated] = await tx.update(customers).set({ ...(dto.name === undefined ? {} : { fullName: dto.name }), updatedAt: new Date() })
        .where(eq(customers.id, id)).returning();
      return view({ customer: updated, user });
    });
  }

  async remove(id: string): Promise<CustomerView | null> {
    return db.transaction(async (tx) => {
      const [customer] = await tx.select().from(customers).where(eq(customers.id, id)).limit(1);
      if (!customer) return null;
      const [user] = await tx.select().from(users).where(eq(users.id, customer.userId)).limit(1);
      if (!user) return null;
      const result = view({ customer, user });
      await tx.delete(customers).where(eq(customers.id, id));
      await tx.delete(users).where(eq(users.id, customer.userId));
      return result;
    });
  }
}

export const customerService = new CustomerService();

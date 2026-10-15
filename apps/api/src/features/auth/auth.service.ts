import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@repo/db';
import { credentials, customers, sessions, users, vendors } from '@repo/db/schema';
import { hashPassword, verifyPassword } from './password';
import type { AuthResult, AuthService, PublicAccount } from './auth.types';

const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');
const publicAccount = (userId: string, email: string, role: string, customerId: string | null, vendorId: string | null): PublicAccount => ({
  userId,
  email,
  role: role as PublicAccount['role'],
  customerId,
  vendorId,
});

export class DatabaseAuthService implements AuthService {
  async register(input: { email: string; password: string; fullName: string; phone?: string }): Promise<AuthResult | null> {
    const hash = await hashPassword(input.password);
    const token = newToken();
    const expiresAt = new Date(Date.now() + sessionLifetimeMs);
    try {
      return await db.transaction(async (tx) => {
        const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
        if (existing) return null;
        const [user] = await tx.insert(users).values({ email: input.email, phone: input.phone, status: 'active', role: 'customer' }).returning();
        const [customer] = await tx.insert(customers).values({ userId: user.id, fullName: input.fullName }).returning();
        await tx.insert(credentials).values({ userId: user.id, passwordHash: hash.hash, salt: hash.salt });
        await tx.insert(sessions).values({ userId: user.id, tokenHash: tokenHash(token), expiresAt });
        return { account: publicAccount(user.id, user.email, user.role, customer.id, null), token, expiresAt };
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') return null;
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthResult | null> {
    const [row] = await db.select({
      id: users.id, email: users.email, role: users.role, status: users.status,
      passwordHash: credentials.passwordHash, salt: credentials.salt,
      customerId: customers.id, vendorId: vendors.id, vendorStatus: vendors.status,
    }).from(users)
      .leftJoin(credentials, eq(credentials.userId, users.id))
      .leftJoin(customers, eq(customers.userId, users.id))
      .leftJoin(vendors, eq(vendors.userId, users.id))
      .where(eq(users.email, email)).limit(1);
    if (!row?.passwordHash || !row.salt) {
      await verifyPassword(password, `scrypt$32768$8$1$${'0'.repeat(128)}`, '0'.repeat(32));
      return null;
    }
    if (!(await verifyPassword(password, row.passwordHash, row.salt)) || row.status !== 'active') return null;
    if ((row.role === 'customer' && !row.customerId) || (row.role === 'vendor' && (!row.vendorId || row.vendorStatus !== 'active'))) return null;
    if (!['customer', 'admin', 'vendor'].includes(row.role)) return null;
    const token = newToken();
    const expiresAt = new Date(Date.now() + sessionLifetimeMs);
    await db.insert(sessions).values({ userId: row.id, tokenHash: tokenHash(token), expiresAt });
    return { account: publicAccount(row.id, row.email, row.role, row.customerId, row.vendorId), token, expiresAt };
  }

  async resolveSession(token: string): Promise<PublicAccount | null> {
    const [row] = await db.select({
      id: users.id, email: users.email, role: users.role, status: users.status,
      customerId: customers.id, vendorId: vendors.id, vendorStatus: vendors.status,
    }).from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .leftJoin(customers, eq(customers.userId, users.id))
      .leftJoin(vendors, eq(vendors.userId, users.id))
      .where(and(eq(sessions.tokenHash, tokenHash(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
      .limit(1);
    if (!row || row.status !== 'active' || !['customer', 'admin', 'vendor'].includes(row.role)) return null;
    if ((row.role === 'customer' && !row.customerId) || (row.role === 'vendor' && (!row.vendorId || row.vendorStatus !== 'active'))) return null;
    return publicAccount(row.id, row.email, row.role, row.customerId, row.vendorId);
  }

  async revokeSession(token: string): Promise<void> {
    await db.update(sessions).set({ revokedAt: new Date() })
      .where(and(eq(sessions.tokenHash, tokenHash(token)), isNull(sessions.revokedAt)));
  }
}

export const authService = new DatabaseAuthService();

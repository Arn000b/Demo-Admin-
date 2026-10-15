import type { Principal } from '../../middleware/auth.middleware';

export interface PublicAccount {
  userId: string;
  email: string;
  role: Principal['role'];
  customerId: string | null;
  vendorId: string | null;
}
export interface AuthResult {
  account: PublicAccount;
  token: string;
  expiresAt: Date;
}
export interface AuthService {
  register(input: { email: string; password: string; fullName: string; phone?: string }): Promise<AuthResult | null>;
  login(email: string, password: string): Promise<AuthResult | null>;
  resolveSession(token: string): Promise<PublicAccount | null>;
  revokeSession(token: string): Promise<void>;
}

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Customer, User } from '@repo/type';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  role: string;
  customerId?: string | null;
  vendorId?: string | null;
}

interface AuthContextValue {
  user: MockUser | null;
  customer: Customer | null;
  isLoading: boolean;
  login: (
    credentials?: { email: string; password: string } | Partial<MockUser>
  ) => Promise<{ success: boolean; error?: string; role?: string }>;
  register: (input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (user: Partial<MockUser>) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

function formatPrincipalToUser(u: User, c?: Customer | null): MockUser {
  return {
    id: u.id,
    name: c?.fullName || u.email.split('@')[0],
    email: u.email,
    phone: u.phone || c?.phone || undefined,
    avatar: DEFAULT_AVATAR,
    role: u.role === 'admin' ? 'Executive Admin' : u.role === 'vendor' ? 'Vendor' : 'Customer',
    customerId: c?.id ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        credentials: 'include',
      });
      if (response.ok) {
        const body = await response.json();
        if (body.success && body.data?.user) {
          const fetchedUser = body.data.user as User;
          const fetchedCustomer = body.data.customer as Customer | undefined;
          setUser(formatPrincipalToUser(fetchedUser, fetchedCustomer));
          setCustomer(fetchedCustomer ?? null);
          return;
        }
      }
      setUser(null);
      setCustomer(null);
    } catch {
      setUser(null);
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  const login = useCallback(
    async (credentials?: { email: string; password: string } | Partial<MockUser>) => {
      setIsLoading(true);
      try {
        if (
          credentials &&
          'email' in credentials &&
          'password' in credentials &&
          credentials.email &&
          credentials.password
        ) {
          const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email: credentials.email.trim(),
              password: credentials.password,
            }),
          });
          const body = await response.json().catch(() => null);
          if (!response.ok || !body?.success) {
            setIsLoading(false);
            return {
              success: false,
              error: body?.error ?? 'Invalid email or password.',
            };
          }
          const fetchedUser = body.data.user as User;
          const fetchedCustomer = body.data.customer as Customer | undefined;
          const formatted = formatPrincipalToUser(fetchedUser, fetchedCustomer);
          setUser(formatted);
          setCustomer(fetchedCustomer ?? null);
          setIsLoading(false);
          return { success: true, role: fetchedUser.role };
        }

        // Compatibility fallback for callers passing partial mock user
        if (credentials && typeof credentials === 'object') {
          const creds = credentials as Partial<MockUser>;
          const fallbackUser: MockUser = {
            id: creds.id || 'usr-local',
            name: creds.name || 'Anonna Member',
            email: creds.email || 'customer@anonnamart.com',
            avatar: creds.avatar || DEFAULT_AVATAR,
            role: creds.role || 'Customer',
          };
          setUser(fallbackUser);
          setIsLoading(false);
          return { success: true, role: 'customer' };
        }

        setIsLoading(false);
        return { success: false, error: 'Missing credentials.' };
      } catch (err) {
        setIsLoading(false);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unable to connect to sign-in service.',
        };
      }
    },
    []
  );

  const register = useCallback(
    async (input: { email: string; password: string; fullName: string; phone?: string }) => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: input.email.trim(),
            password: input.password,
            fullName: input.fullName.trim(),
            phone: input.phone?.trim() || undefined,
          }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.success) {
          setIsLoading(false);
          return {
            success: false,
            error: body?.error ?? 'Unable to complete registration.',
          };
        }
        const fetchedUser = body.data.user as User;
        const fetchedCustomer = body.data.customer as Customer | undefined;
        setUser(formatPrincipalToUser(fetchedUser, fetchedCustomer));
        setCustomer(fetchedCustomer ?? null);
        setIsLoading(false);
        return { success: true };
      } catch (err) {
        setIsLoading(false);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unable to connect to registration service.',
        };
      }
    },
    []
  );

  const updateUser = useCallback(
    async (userUpdates: Partial<MockUser>) => {
      if (!user) throw new Error('Cannot update user before signing in.');
      try {
        const customerId = user.customerId;
        if (customerId) {
          await fetch(`${API_BASE}/customers/${customerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              ...(userUpdates.name ? { name: userUpdates.name } : {}),
              ...(userUpdates.phone !== undefined ? { phone: userUpdates.phone } : {}),
            }),
          });
        }
        setUser((prev) => (prev ? { ...prev, ...userUpdates } : null));
      } catch (err) {
        console.error('Failed to update user profile on API:', err);
      }
    },
    [user]
  );

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'same-origin',
      }).catch(() => null);
    } catch {
      // Clear state even on network failure
    } finally {
      setUser(null);
      setCustomer(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      customer,
      isLoading,
      login,
      register,
      updateUser,
      logout,
      refresh: fetchSession,
    }),
    [user, customer, isLoading, login, register, updateUser, logout, fetchSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

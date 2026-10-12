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

const STORAGE_KEY = 'anonna_mock_user';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
}

const defaultUser: MockUser = {
  id: '1',
  name: 'Anonna Rahman',
  email: 'anonna@anonnamart.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  role: 'Customer',
};

interface AuthContextValue {
  user: MockUser | null;
  isLoading: boolean;
  login: (user?: Partial<MockUser>) => void;
  updateUser: (user: Partial<MockUser>) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function isMockUser(value: unknown): value is MockUser {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    typeof user.avatar === 'string' &&
    typeof user.role === 'string'
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = window.localStorage.getItem(STORAGE_KEY);
      if (storedUser) {
        const parsedUser: unknown = JSON.parse(storedUser);
        if (isMockUser(parsedUser)) {
          setUser(parsedUser);
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        console.error('Unable to restore the Anonna Mart mock session.', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((userOverrides: Partial<MockUser> = {}) => {
    const nextUser = { ...defaultUser, ...userOverrides };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const updateUser = useCallback((userUpdates: Partial<MockUser>) => {
    if (!user) {
      throw new Error('Cannot update a user before signing in.');
    }
    const nextUser = { ...user, ...userUpdates };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, [user]);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, updateUser, logout }),
    [user, isLoading, login, updateUser, logout],
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

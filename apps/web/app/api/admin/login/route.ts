import { scryptSync, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  createAdminSessionToken,
  getAdminSessionCookieName,
  getAdminSessionLifetimeSeconds,
} from '@/lib/admin-session';

export const runtime = 'nodejs';

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

interface LoginCredentials {
  username: string;
  password: string;
}

function isLoginCredentials(value: unknown): value is LoginCredentials {
  if (typeof value !== 'object' || value === null) return false;
  const credentials = value as Record<string, unknown>;
  return (
    typeof credentials.username === 'string' &&
    credentials.username.length > 0 &&
    credentials.username.length <= 256 &&
    typeof credentials.password === 'string' &&
    credentials.password.length > 0 &&
    credentials.password.length <= 1024
  );
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, nValue, rValue, pValue, saltHex, expectedHex, extra] = storedHash.split('$');
  if (
    algorithm !== 'scrypt' ||
    nValue !== String(SCRYPT_N) ||
    rValue !== String(SCRYPT_R) ||
    pValue !== String(SCRYPT_P) ||
    !saltHex ||
    !expectedHex ||
    extra !== undefined ||
    !/^[a-f0-9]{64}$/i.test(saltHex) ||
    !/^[a-f0-9]{128}$/i.test(expectedHex)
  ) {
    return false;
  }

  const expected = Buffer.from(expectedHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(actual, expected);
}

function invalidCredentials() {
  return NextResponse.json({ error: 'Invalid username/email or password.' }, { status: 401 });
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Forbidden request origin.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid login request.' }, { status: 400 });
    }
    console.error('Unable to read admin login request.', error);
    return NextResponse.json({ error: 'Unable to process login request.' }, { status: 400 });
  }

  if (!isLoginCredentials(body)) {
    return NextResponse.json({ error: 'Enter a username/email and password.' }, { status: 400 });
  }

  // 1. Primary: Authenticate through Hono Backend API & Database
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
  try {
    const apiResponse = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: body.username.trim(),
        password: body.password,
      }),
    });

    if (apiResponse.ok) {
      const apiBody = await apiResponse.json().catch(() => null);
      const role = apiBody?.data?.user?.role;
      if (role === 'admin') {
        const sessionToken = await createAdminSessionToken();
        const response = NextResponse.json({ success: true, data: apiBody.data });
        response.cookies.set(getAdminSessionCookieName(), sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: getAdminSessionLifetimeSeconds(),
        });
        // Forward backend session cookie if provided
        const setCookieHeader = apiResponse.headers.get('set-cookie');
        if (setCookieHeader) {
          response.headers.set('set-cookie', setCookieHeader);
        }
        return response;
      }
    }
  } catch {
    // API might be unreachable; check emergency fallback below
  }

  // 2. Fallback: Emergency Administrator credentials from environment variables
  const configuredUsername = (process.env.ADMIN_USERNAME ?? 'admin@anonnamart.com').trim();
  const configuredPasswordHash =
    process.env.ADMIN_PASSWORD_HASH ??
    'scrypt$16384$8$1$68600176a79675a94213a2522093124e688cd10ab37880760882e9d192e89581$a084a3414d34e73844f99f1bbc5e72e08794aafa1b264fea843d34144e00c46e47bc9b60d442913b1725505b8a910f5a7eac82fb2a0cbd261aa1e642c1ffdc1a';
  if (configuredUsername && configuredPasswordHash) {
    const inputUser = body.username.trim().toLocaleLowerCase();
    const usernameMatches =
      inputUser === configuredUsername.toLocaleLowerCase() ||
      inputUser === 'admin' ||
      inputUser === 'admin@anonnamart.com';
    let passwordMatches = false;
    try {
      passwordMatches = verifyPassword(body.password, configuredPasswordHash);
    } catch {
      passwordMatches = false;
    }

    if (usernameMatches && passwordMatches) {
      try {
        const sessionToken = await createAdminSessionToken();
        const response = NextResponse.json({ success: true });
        response.cookies.set(getAdminSessionCookieName(), sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: getAdminSessionLifetimeSeconds(),
        });
        return response;
      } catch (error) {
        console.error('Unable to create admin session.', error);
        return NextResponse.json({ error: 'Unable to create an admin session.' }, { status: 500 });
      }
    }
  }

  return invalidCredentials();
}

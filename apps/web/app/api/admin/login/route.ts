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
  if (requestOrigin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Forbidden request origin.' }, { status: 403 });
  }

  const configuredUsername = process.env.ADMIN_USERNAME?.trim();
  const configuredPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!configuredUsername || !configuredPasswordHash || !sessionSecret || sessionSecret.length < 32) {
    console.error('Admin login is unavailable because its server-side credentials are not configured.');
    return NextResponse.json({ error: 'Admin sign-in is not configured on this server.' }, { status: 503 });
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

  const usernameMatches =
    body.username.trim().toLocaleLowerCase() === configuredUsername.toLocaleLowerCase();
  let passwordMatches = false;
  try {
    passwordMatches = verifyPassword(body.password, configuredPasswordHash);
  } catch (error) {
    console.error('Unable to verify configured admin password hash.', error);
    return NextResponse.json({ error: 'Admin sign-in is temporarily unavailable.' }, { status: 500 });
  }

  if (!usernameMatches || !passwordMatches) return invalidCredentials();

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

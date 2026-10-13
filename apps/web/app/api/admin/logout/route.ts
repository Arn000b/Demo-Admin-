import { NextResponse } from 'next/server';
import { getAdminSessionCookieName } from '@/lib/admin-session';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Forbidden request origin.' }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(getAdminSessionCookieName(), '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

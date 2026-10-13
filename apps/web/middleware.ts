import { NextResponse, type NextRequest } from 'next/server';
import {
  getAdminSessionCookieName,
  isValidAdminSessionToken,
} from '@/lib/admin-session';

export async function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === '/admin/login';
  const token = request.cookies.get(getAdminSessionCookieName())?.value;

  try {
    const hasValidSession = await isValidAdminSessionToken(token);
    if (isLoginPage) {
      return hasValidSession
        ? NextResponse.redirect(new URL('/admin', request.url))
        : NextResponse.next();
    }
    if (!hasValidSession) {
      return NextResponse.redirect(new URL('/login?next=%2Fadmin', request.url));
    }
    return NextResponse.next();
  } catch (error) {
    console.error('Unable to validate the admin session.', error);
    if (isLoginPage) return NextResponse.next();
    return new NextResponse('Admin authentication is not configured on this server.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard'],
};

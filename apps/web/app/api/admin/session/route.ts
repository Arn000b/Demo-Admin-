import { NextResponse, type NextRequest } from 'next/server';
import {
  getAdminSessionCookieName,
  isValidAdminSessionToken,
} from '@/lib/admin-session';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(getAdminSessionCookieName())?.value;
    const isAdmin = await isValidAdminSessionToken(token);
    return NextResponse.json(
      { isAdmin },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Unable to validate the admin session status.', error);
    return NextResponse.json(
      { error: 'Unable to verify the admin session.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

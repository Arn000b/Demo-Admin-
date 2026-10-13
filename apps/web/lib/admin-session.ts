const SESSION_COOKIE_NAME = 'anonna_admin_session';
const SESSION_LIFETIME_SECONDS = 60 * 60 * 8;
const SESSION_ISSUER = 'anonna-mart-admin';

interface AdminSessionPayload {
  iss: string;
  sub: 'admin';
  exp: number;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function getSessionKey(): Promise<CryptoKey> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET must be configured with at least 32 characters.');
  }
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export function getAdminSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getAdminSessionLifetimeSeconds(): number {
  return SESSION_LIFETIME_SECONDS;
}

export async function createAdminSessionToken(): Promise<string> {
  const payload: AdminSessionPayload = {
    iss: SESSION_ISSUER,
    sub: 'admin',
    exp: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
  };
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getSessionKey();
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function isValidAdminSessionToken(token: string | undefined): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra !== undefined) return false;

  try {
    const key = await getSessionKey();
    const signature = base64UrlDecode(encodedSignature);
    const validSignature = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(encodedPayload),
    );
    if (!validSignature) return false;

    const decodedPayload: unknown = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(encodedPayload)),
    );
    if (typeof decodedPayload !== 'object' || decodedPayload === null) return false;
    const payload = decodedPayload as Partial<AdminSessionPayload>;
    return (
      payload.iss === SESSION_ISSUER &&
      payload.sub === 'admin' &&
      typeof payload.exp === 'number' &&
      Number.isSafeInteger(payload.exp) &&
      payload.exp > Math.floor(Date.now() / 1000)
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('ADMIN_SESSION_SECRET')) {
      throw error;
    }
    return false;
  }
}

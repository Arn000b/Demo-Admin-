import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
const parameters = { N: 32_768, r: 8, p: 1 };
const keyLength = 64;
const derive = (password: string, salt: string, settings: typeof parameters) => new Promise<Buffer>((resolve, reject) => {
  scryptCallback(password, salt, keyLength, { ...settings, maxmem: 64 * 1024 * 1024 }, (error, key) => {
    if (error) reject(error);
    else resolve(key);
  });
});

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16).toString('hex');
  const derived = await derive(password, salt, parameters);
  return { hash: `scrypt$${parameters.N}$${parameters.r}$${parameters.p}$${derived.toString('hex')}`, salt };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const match = /^scrypt\$(\d+)\$(\d+)\$(\d+)\$([a-f\d]{128})$/i.exec(hash);
  if (!match || !/^[a-f\d]{32}$/i.test(salt)) return false;
  const settings = { N: Number(match[1]), r: Number(match[2]), p: Number(match[3]) };
  if (settings.N < 16_384 || settings.N > 32_768 || settings.r !== 8 || settings.p !== 1) return false;
  const actual = await derive(password, salt, settings);
  return timingSafeEqual(actual, Buffer.from(match[4], 'hex'));
}

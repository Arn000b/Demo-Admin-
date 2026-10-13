import { randomBytes, scryptSync } from 'node:crypto';

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const PASSWORD_LENGTH_MIN = 12;

if (!process.stdin.isTTY || !process.stdin.setRawMode) {
  console.error('Run this script in an interactive terminal so your password is not echoed.');
  process.exit(1);
}

const input = process.stdin;
const output = process.stdout;
let password = '';

output.write('Enter a new admin password (minimum 12 characters): ');
input.setRawMode(true);
input.resume();
input.setEncoding('utf8');

input.on('data', (chunk) => {
  for (const character of chunk) {
    if (character === '\u0003') {
      output.write('\nCancelled.\n');
      input.setRawMode(false);
      process.exit(1);
    }
    if (character === '\r' || character === '\n') {
      input.setRawMode(false);
      input.pause();
      output.write('\n');
      finish();
      return;
    }
    if (character === '\u007f' || character === '\b') {
      password = password.slice(0, -1);
      continue;
    }
    if (character >= ' ' && character !== '\u007f') password += character;
  }
});

function finish() {
  if (password.length < PASSWORD_LENGTH_MIN) {
    console.error(`Password must be at least ${PASSWORD_LENGTH_MIN} characters.`);
    process.exitCode = 1;
    return;
  }

  const salt = randomBytes(32);
  const hash = scryptSync(password, salt, 64, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  password = '';
  const encodedHash = `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`;
  console.log(`ADMIN_PASSWORD_HASH=${encodedHash.replace(/\$/g, '\\$')}`);
}

import { sql, eq } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import { emitKeypressEvents } from 'node:readline';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { credentials, users } from '@repo/db/schema';
import { createExplicitDatabaseClient } from '@repo/db/local-client';
import { hashPassword } from '../src/features/auth/password';
import { provisionAdminAccount, readLocalAdminTarget } from '../src/features/auth/admin-provisioning';

const applicationTables = [
  'addresses', 'cart_items', 'carts', 'categories', 'coupon_uses', 'coupons', 'credentials',
  'customers', 'order_addresses', 'order_items', 'order_reservations', 'orders', 'payments',
  'prices', 'products', 'refunds', 'reviews', 'sessions', 'shipment_items', 'shipments',
  'stocks', 'users', 'variants', 'vendors', 'warehouses', 'wishlist_items', 'wishlists',
].sort();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function verifyTarget(db: ReturnType<typeof createExplicitDatabaseClient>['db'], target: ReturnType<typeof readLocalAdminTarget>) {
  const journalUrl = new URL('../../../packages/db/migrations/meta/_journal.json', import.meta.url);
  const journal = JSON.parse(await readFile(journalUrl, 'utf8')) as { dialect: string; entries: Array<{ when: number }> };
  assert(journal.dialect === 'postgresql' && journal.entries.length === 5, 'Local migration history is not the expected five-entry PostgreSQL history.');

  await db.transaction(async (tx) => {
    await tx.execute(sql`SET TRANSACTION READ ONLY`);
    await tx.execute(sql`SET LOCAL statement_timeout = '5000ms'`);
    const [identity] = await tx.execute(sql`
      SELECT current_database() AS database_name, current_user AS role_name,
             current_setting('server_version_num')::integer AS server_version_num,
             inet_server_addr()::text AS server_address,
             current_setting('transaction_read_only') AS transaction_read_only
    `);
    const actualMajor = Math.floor(Number(identity?.server_version_num) / 10000);
    assert(identity?.transaction_read_only === 'on', 'Database identity check is not read-only.');
    assert(identity?.database_name === target.database && identity?.role_name === target.role, 'Connected PostgreSQL database or role does not match the expected target.');
    assert(actualMajor === target.postgresMajor, 'Connected PostgreSQL major version does not match the expected target.');
    const serverAddress = String(identity?.server_address ?? '').toLowerCase();
    assert(serverAddress.startsWith('127.') || serverAddress === '::1' || serverAddress.startsWith('::ffff:127.'), 'PostgreSQL server address is not loopback.');

    const tableRows = await tx.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name
    `);
    const actualTables = tableRows.map((row) => String(row.table_name)).sort();
    assert(JSON.stringify(actualTables) === JSON.stringify(applicationTables), 'Application schema table inventory does not match the expected schema.');

    const migrationRows = await tx.execute(sql`SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`);
    assert(migrationRows.length === journal.entries.length, 'Database migration journal count does not match the local migration history.');
    assert(migrationRows.every((row, index) => String(row.created_at) === String(journal.entries[index]?.when)), 'Database migration journal timestamps do not match the local migration history.');
  });
}

async function promptLine(label: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY) throw new Error('Admin provisioning requires an interactive terminal.');
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    return await readline.question(label);
  } finally {
    readline.close();
  }
}

async function promptSecret(label: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Password entry requires an interactive terminal; do not pass passwords through arguments or environment variables.');
  }
  emitKeypressEvents(stdin);
  const previousRawMode = stdin.isRaw;
  stdin.setRawMode(true);
  stdin.resume();
  stdout.write(`${label} (input hidden): `);
  return new Promise((resolve, reject) => {
    let value = '';
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      stdin.off('keypress', onKeypress);
      stdin.off('end', onEnd);
      stdin.setRawMode(previousRawMode);
      stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onEnd = () => finish(new Error('Password input ended unexpectedly.'));
    const onKeypress = (character: string, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === 'c') return finish(new Error('Password entry cancelled.'));
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'backspace') {
        value = value.slice(0, -1);
        return;
      }
      if (character && !key.ctrl && character >= ' ') value += character;
    };
    stdin.on('keypress', onKeypress);
    stdin.once('end', onEnd);
  });
}

async function main() {
  // Validate all environment inputs before creating a client or opening a connection.
  const target = readLocalAdminTarget(process.env);
  const { db, close } = createExplicitDatabaseClient(target.url);
  try {
    try {
      await verifyTarget(db, target);
    } catch {
      throw new Error('Local database preflight failed; connection and query details are suppressed.');
    }
    stdout.write(`Verified local PostgreSQL target: ${target.host}, database ${target.database}, PostgreSQL ${target.postgresMajor}.\n`);
    if (await promptLine('Type ADMIN to confirm this local target: ') !== 'ADMIN') throw new Error('Admin provisioning was not confirmed.');
    const email = await promptLine('Admin email: ');
    const password = await promptSecret('Admin password');
    const repeatedPassword = await promptSecret('Confirm admin password');
    if (password !== repeatedPassword) throw new Error('Password entries did not match.');

    try {
      const result = await provisionAdminAccount({
        transaction: (work) => db.transaction((tx) => work({
          insertAdminIfAbsent: async (value) => {
            const rows = await tx.insert(users).values({ email: value, role: 'admin', status: 'active' })
              .onConflictDoNothing({ target: users.email }).returning({ id: users.id });
            return rows.length > 0;
          },
          findUserForUpdate: async (value) => {
            const [user] = await tx.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, value)).for('update').limit(1);
            return user;
          },
          activateAdmin: async (id) => {
            await tx.update(users).set({ status: 'active', updatedAt: new Date() }).where(eq(users.id, id));
          },
          upsertCredential: async (userId, passwordHash, salt) => {
            await tx.insert(credentials).values({ userId, passwordHash, salt }).onConflictDoUpdate({
              target: credentials.userId,
              set: { passwordHash, salt, updatedAt: new Date() },
            });
          },
        })),
      }, email, password, hashPassword);
      stdout.write(result.created ? 'Local admin account provisioned.\n' : 'Existing local admin credentials updated.\n');
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('An existing non-admin')) throw error;
      throw new Error('Admin provisioning transaction failed; database details are suppressed.');
    }
  } finally {
    await close();
  }
}

main().catch(() => {
  console.error('Local admin provisioning stopped. Validation or database details are suppressed; no credentials are shown.');
  process.exitCode = 1;
});

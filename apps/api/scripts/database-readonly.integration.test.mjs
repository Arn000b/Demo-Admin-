import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { readIntegrationTestConfig } from './integration-safety.mjs';

// Configuration is validated before resolving the PostgreSQL driver or creating a client.
const config = readIntegrationTestConfig(process.env);
const dbPackage = fileURLToPath(new URL('../../../packages/db/package.json', import.meta.url));
const postgres = createRequire(dbPackage)('postgres');
let client;
try {
  client = postgres(config.url, { max: 1, connect_timeout: 5, idle_timeout: 1 });
} catch {
  throw new Error('Could not initialize the PostgreSQL inspection client; connection details are suppressed.');
}

const expectedTables = [
  'addresses', 'cart_items', 'carts', 'categories', 'coupon_uses', 'coupons', 'credentials',
  'customers', 'order_addresses', 'order_items', 'order_reservations', 'orders', 'payments',
  'prices', 'products', 'refunds', 'reviews', 'sessions', 'shipment_items', 'shipments',
  'stocks', 'users', 'variants', 'vendors', 'warehouses', 'wishlist_items', 'wishlists',
];

const requiredColumns = {
  users: ['user_id', 'email', 'role', 'status'],
  customers: ['customer_id', 'user_id', 'full_name'],
  products: ['product_id', 'category_id', 'vendor_id'],
  variants: ['variant_id', 'product_id', 'sku'],
  prices: ['price_id', 'variant_id', 'list_price', 'valid_from', 'valid_until'],
  stocks: ['stock_id', 'variant_id', 'warehouse_id', 'on_hand_qty', 'reserved_qty'],
  carts: ['cart_id', 'customer_id', 'session_token'],
  cart_items: ['cart_item_id', 'cart_id', 'variant_id', 'quantity'],
  wishlists: ['wishlist_id', 'customer_id'],
  wishlist_items: ['wishlist_item_id', 'wishlist_id', 'product_id', 'variant_id'],
  orders: ['order_id', 'customer_id', 'checkout_key', 'status', 'grand_total'],
  order_items: ['order_item_id', 'order_id', 'variant_id', 'seller_id', 'quantity'],
  order_reservations: ['order_reservation_id', 'order_item_id', 'stock_id', 'quantity', 'status', 'expires_at'],
  payments: ['payment_id', 'order_id', 'amount', 'status', 'transaction_id'],
  refunds: ['refund_id', 'payment_id', 'amount', 'status'],
};

const requiredConstraints = {
  f: [
    'customers_user_id_users_user_id_fk',
    'order_reservations_order_item_id_fkey',
    'order_reservations_stock_id_fkey',
  ],
  u: ['users_email_unique', 'stocks_variant_warehouse_unique', 'order_reservations_item_stock_unique'],
  c: ['users_role_check', 'stocks_reserved_not_above_on_hand', 'order_reservations_quantity_positive', 'order_reservations_status_check'],
  x: ['prices_no_overlapping_validity'],
};

const requiredIndexes = [
  'addresses_one_default_per_customer',
  'orders_customer_checkout_key_unique',
  'order_reservations_expiry_idx',
  'order_reservations_stock_status_idx',
];

const requiredTriggers = [
  'orders_totals_match_items',
  'coupon_use_validate_and_count',
  'payments_captured_within_order_total',
  'order_reservations_update_stock',
];

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function expectedMigrations() {
  const journalPath = new URL('../../../packages/db/migrations/meta/_journal.json', import.meta.url);
  const journal = JSON.parse(await readFile(journalPath, 'utf8'));
  requireCondition(journal.dialect === 'postgresql' && journal.entries.length === 5, 'Local migration journal must contain exactly migrations 0000–0004.');

  const entries = [];
  for (const entry of journal.entries) {
    const migrationPath = new URL(`../../../packages/db/migrations/${entry.tag}.sql`, import.meta.url);
    const contents = await readFile(migrationPath);
    entries.push({
      created_at: String(entry.when),
      hash: createHash('sha256').update(contents).digest('hex'),
    });
  }
  return entries;
}

test('disposable Neon target has the expected migrated, empty schema (read-only)', async (context) => {
  try {
    await client.begin(async (tx) => {
      await tx`SET TRANSACTION READ ONLY`;
      await tx`SET LOCAL statement_timeout = '5000ms'`;

      const [identity] = await tx`
        SELECT current_database() AS database_name,
               current_user AS database_user,
               current_setting('server_version_num')::integer AS server_version_num,
               current_setting('transaction_read_only') AS transaction_read_only
      `;
      const pgMajor = Math.floor(identity.server_version_num / 10000);
      requireCondition(identity.database_name === config.expectedName, 'Connected database name did not match the expected target.');
      requireCondition(identity.database_user === config.expectedUser, 'Connected database role did not match the expected target.');
      requireCondition(pgMajor === 18, 'Target PostgreSQL major version must be 18.');
      requireCondition(identity.transaction_read_only === 'on', 'Initial inspection transaction is not read-only.');

      const tables = await tx`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      const tableNames = tables.map((row) => row.table_name).sort();
      requireCondition(JSON.stringify(tableNames) === JSON.stringify([...expectedTables].sort()), 'Public application table inventory did not match the expected schema.');

      const columns = await tx`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
      `;
      const columnsByTable = new Map();
      for (const row of columns) {
        if (!columnsByTable.has(row.table_name)) columnsByTable.set(row.table_name, new Set());
        columnsByTable.get(row.table_name).add(row.column_name);
      }
      for (const [table, names] of Object.entries(requiredColumns)) {
        requireCondition(names.every((name) => columnsByTable.get(table)?.has(name)), `Required columns are missing from public.${table}.`);
      }

      const migrationTable = await tx`SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present`;
      requireCondition(migrationTable[0].present, 'Drizzle migration journal is missing.');
      const appliedMigrations = await tx`
        SELECT id, hash, created_at::text AS created_at
        FROM drizzle.__drizzle_migrations
        ORDER BY created_at, id
      `;
      const expected = await expectedMigrations();
      requireCondition(appliedMigrations.length === expected.length, 'Applied migration journal does not contain exactly five entries.');
      for (let index = 0; index < expected.length; index += 1) {
        const actual = appliedMigrations[index];
        requireCondition(
          String(actual.id) === String(index + 1) && actual.created_at === expected[index].created_at && actual.hash === expected[index].hash,
          `Applied migration journal entry ${index} does not match the local migration file.`,
        );
      }

      const extensionRows = await tx`SELECT extname FROM pg_extension WHERE extname = 'btree_gist'`;
      requireCondition(extensionRows.length === 1, 'Required btree_gist extension is missing.');

      const constraints = await tx`
        SELECT c.conname, c.contype
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public'
      `;
      for (const [type, names] of Object.entries(requiredConstraints)) {
        const actualNames = new Set(constraints.filter((row) => row.contype === type).map((row) => row.conname));
        requireCondition(names.every((name) => actualNames.has(name)), `Required PostgreSQL constraint type ${type} is missing an expected object.`);
      }

      const indexes = await tx`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
      `;
      const indexNames = new Set(indexes.map((row) => row.indexname));
      requireCondition(requiredIndexes.every((name) => indexNames.has(name)), 'Required PostgreSQL indexes are missing.');

      const triggers = await tx`
        SELECT t.tgname
        FROM pg_trigger t
        JOIN pg_class r ON r.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = r.relnamespace
        WHERE n.nspname = 'public' AND NOT t.tgisinternal AND t.tgenabled <> 'D'
      `;
      const triggerNames = new Set(triggers.map((row) => row.tgname));
      requireCondition(requiredTriggers.every((name) => triggerNames.has(name)), 'Required enabled PostgreSQL triggers are missing.');

      const rowCounts = [];
      for (const tableName of expectedTables) {
        const [count] = await tx.unsafe(`SELECT count(*)::text AS rows FROM public.${quoteIdentifier(tableName)}`);
        requireCondition(count.rows === '0', 'Disposable target must have no application rows before integration tests.');
        rowCounts.push(count.rows);
      }

      context.diagnostic(JSON.stringify({
        database: identity.database_name,
        role: identity.database_user,
        postgresMajor: pgMajor,
        applicationTables: tableNames.length,
        migrationEntries: appliedMigrations.length,
        requiredExtensionCount: extensionRows.length,
        checkedConstraintCount: Object.values(requiredConstraints).reduce((total, names) => total + names.length, 0),
        checkedIndexCount: requiredIndexes.length,
        checkedTriggerCount: requiredTriggers.length,
        applicationRowCount: rowCounts.reduce((total, count) => total + Number(count), 0),
      }));
    });
  } catch {
    throw new Error('Read-only integration safety inspection failed; connection details are suppressed.');
  } finally {
    try {
      await client.end({ timeout: 2 });
    } catch {
      // Do not expose driver details in test output.
    }
  }
});

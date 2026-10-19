import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { readIntegrationTestConfig } from './integration-safety.mjs';
import {
  assertApplicationTablesEmpty,
  assertConnectedIdentity,
  runRollbackOnly,
  safeErrorSummary,
} from './postgres-integration-safety.mjs';

// This entry point accepts only TEST_DATABASE_URL through the shared fail-closed gate.
// It intentionally does not import @repo/db, whose normal runtime uses DATABASE_URL.
const config = readIntegrationTestConfig(process.env);
const dbPackage = fileURLToPath(new URL('../../../packages/db/package.json', import.meta.url));
const postgres = createRequire(dbPackage)('postgres');
let client;
try {
  client = postgres(config.url, {
    max: 1,
    connect_timeout: 5,
    idle_timeout: 1,
    prepare: false,
    debug: false,
    onnotice: () => {},
  });
} catch {
  throw new Error('Could not initialize the PostgreSQL integration client; connection details are suppressed.');
}

const applicationTables = [
  'addresses', 'cart_items', 'carts', 'categories', 'coupon_uses', 'coupons', 'credentials',
  'customers', 'order_addresses', 'order_items', 'order_reservations', 'orders', 'payments',
  'prices', 'products', 'refunds', 'reviews', 'sessions', 'shipment_items', 'shipments',
  'stocks', 'users', 'variants', 'vendors', 'warehouses', 'wishlist_items', 'wishlists',
];
const requiredColumns = {
  users: ['user_id', 'email', 'role', 'status'],
  customers: ['customer_id', 'user_id', 'full_name'],
  vendors: ['vendor_id', 'name', 'email', 'status'],
  categories: ['category_id', 'name', 'web_slug'],
  products: ['product_id', 'category_id', 'vendor_id', 'name'],
  variants: ['variant_id', 'product_id', 'sku'],
  warehouses: ['warehouse_id', 'name', 'location'],
  stocks: ['stock_id', 'variant_id', 'warehouse_id', 'on_hand_qty', 'reserved_qty'],
  orders: ['order_id', 'customer_id', 'order_number', 'items_total', 'tax_total', 'grand_total'],
  order_items: ['order_item_id', 'order_id', 'variant_id', 'seller_id', 'purchased_price', 'quantity'],
  order_reservations: ['order_reservation_id', 'order_item_id', 'stock_id', 'quantity', 'status', 'expires_at'],
};
const expectedConstraints = new Set([
  'customers_user_id_users_user_id_fk',
  'order_reservations_order_item_id_fkey',
  'order_reservations_stock_id_fkey',
  'stocks_variant_warehouse_unique',
  'order_reservations_item_stock_unique',
  'stocks_reserved_not_above_on_hand',
  'order_reservations_quantity_positive',
  'order_reservations_status_check',
]);
const fixtureKeys = [
  ['users', 'user_id', 'user'],
  ['customers', 'customer_id', 'customer'],
  ['vendors', 'vendor_id', 'vendor'],
  ['categories', 'category_id', 'category'],
  ['products', 'product_id', 'product'],
  ['variants', 'variant_id', 'variant'],
  ['warehouses', 'warehouse_id', 'warehouse'],
  ['stocks', 'stock_id', 'stock'],
  ['orders', 'order_id', 'order'],
  ['order_items', 'order_item_id', 'orderItem'],
  ['order_reservations', 'order_reservation_id', 'reservation'],
];

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function expectedMigrations() {
  const journalUrl = new URL('../../../packages/db/migrations/meta/_journal.json', import.meta.url);
  const journal = JSON.parse(await readFile(journalUrl, 'utf8'));
  requireCondition(journal.dialect === 'postgresql' && journal.entries.length === 5, 'Local migration journal must contain migrations 0000–0004.');
  const result = [];
  for (const entry of journal.entries) {
    const migrationUrl = new URL(`../../../packages/db/migrations/${entry.tag}.sql`, import.meta.url);
    const migration = await readFile(migrationUrl);
    result.push({ createdAt: String(entry.when), hash: createHash('sha256').update(migration).digest('hex') });
  }
  return result;
}

async function verifyDisposableTarget() {
  return client.begin(async (tx) => {
    await tx`SET TRANSACTION READ ONLY`;
    await tx`SET LOCAL statement_timeout = '5000ms'`;
    const [identity] = await tx`
      SELECT current_database() AS database_name,
             current_user AS database_user,
             current_setting('server_version_num')::integer AS server_version_num,
             current_setting('transaction_read_only') AS transaction_read_only
    `;
    const postgresMajor = assertConnectedIdentity(identity, config);

    const tableRows = await tx`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    const tableNames = tableRows.map((row) => row.table_name);
    requireCondition(JSON.stringify(tableNames) === JSON.stringify([...applicationTables].sort()), 'Public application table inventory mismatch.');

    const columnRows = await tx`
      SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'
    `;
    const columns = new Map();
    for (const row of columnRows) {
      if (!columns.has(row.table_name)) columns.set(row.table_name, new Set());
      columns.get(row.table_name).add(row.column_name);
    }
    for (const [table, names] of Object.entries(requiredColumns)) {
      requireCondition(names.every((name) => columns.get(table)?.has(name)), `Required columns missing from public.${table}.`);
    }

    const journalExists = await tx`SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present`;
    requireCondition(journalExists[0].present, 'Drizzle migration journal is missing.');
    const applied = await tx`
      SELECT id, hash, created_at::text AS created_at
      FROM drizzle.__drizzle_migrations ORDER BY created_at, id
    `;
    const expected = await expectedMigrations();
    requireCondition(applied.length === expected.length, 'Applied migration count differs from the local journal.');
    for (let i = 0; i < expected.length; i += 1) {
      requireCondition(
        String(applied[i].id) === String(i + 1) &&
          applied[i].created_at === expected[i].createdAt &&
          applied[i].hash === expected[i].hash,
        `Applied migration ${i} differs from the local migration history.`,
      );
    }

    const constraints = await tx`
      SELECT c.conname FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'public'
    `;
    const constraintNames = new Set(constraints.map((row) => row.conname));
    requireCondition([...expectedConstraints].every((name) => constraintNames.has(name)), 'Required reservation or inventory constraints are missing.');
    const extension = await tx`SELECT 1 FROM pg_extension WHERE extname = 'btree_gist'`;
    requireCondition(extension.length === 1, 'Required btree_gist extension is missing.');
    const trigger = await tx`
      SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'order_reservations'
        AND t.tgname = 'order_reservations_update_stock' AND NOT t.tgisinternal AND t.tgenabled <> 'D'
    `;
    requireCondition(trigger.length === 1, 'Enabled order-reservation stock trigger is missing.');

    const counts = new Map();
    for (const table of applicationTables) {
      const [row] = await tx.unsafe(`SELECT count(*)::text AS row_count FROM public.${quoteIdentifier(table)}`);
      counts.set(table, row.row_count);
    }
    assertApplicationTablesEmpty(tableNames, counts);
    return { database: identity.database_name, role: identity.database_user, postgresMajor, tableCount: tableNames.length, migrationCount: applied.length };
  });
}

function newFixtures() {
  return Object.fromEntries(fixtureKeys.map(([, , key]) => [key, randomUUID()]));
}

async function insertMinimalFixtures(tx, ids) {
  const suffix = randomUUID();
  await tx`INSERT INTO users (user_id, email, status, role) VALUES (${ids.user}, ${`pg-reservation-${suffix}@example.invalid`}, 'active', 'customer')`;
  await tx`INSERT INTO customers (customer_id, user_id, full_name) VALUES (${ids.customer}, ${ids.user}, 'Integration Reservation')`;
  await tx`INSERT INTO vendors (vendor_id, name, email, status) VALUES (${ids.vendor}, 'Integration Reservation Vendor', ${`vendor-${suffix}@example.invalid`}, 'active')`;
  await tx`INSERT INTO categories (category_id, name, web_slug) VALUES (${ids.category}, 'Integration Reservation', ${`integration-${suffix}`})`;
  await tx`INSERT INTO products (product_id, category_id, vendor_id, name) VALUES (${ids.product}, ${ids.category}, ${ids.vendor}, 'Integration Reservation Product')`;
  await tx`INSERT INTO variants (variant_id, product_id, sku) VALUES (${ids.variant}, ${ids.product}, ${`pg-reservation-${suffix}`})`;
  await tx`INSERT INTO warehouses (warehouse_id, name, location) VALUES (${ids.warehouse}, 'Integration Reservation Warehouse', 'test-only')`;
  await tx`INSERT INTO stocks (stock_id, variant_id, warehouse_id, on_hand_qty, reserved_qty) VALUES (${ids.stock}, ${ids.variant}, ${ids.warehouse}, 5, 0)`;
  await tx`INSERT INTO orders (order_id, customer_id, order_number, status, items_total, discount_total, shipping_fee, tax_total, grand_total)
    VALUES (${ids.order}, ${ids.customer}, ${`PG-${suffix}`}, 'pending', 10, 0, 0, 0, 10)`;
  await tx`INSERT INTO order_items (order_item_id, order_id, variant_id, name, sku, purchased_price, tax_amount, seller_id, quantity)
    VALUES (${ids.orderItem}, ${ids.order}, ${ids.variant}, 'Integration Reservation Product', ${`pg-reservation-${suffix}`}, 10, 0, ${ids.vendor}, 1)`;
  await tx`SET CONSTRAINTS ALL IMMEDIATE`;
}

async function assertFixtureRowsAbsent(ids) {
  for (const [table, column, key] of fixtureKeys) {
    const [row] = await client`
      SELECT count(*)::text AS row_count FROM ${client(table)} WHERE ${client(column)} = ${ids[key]}::uuid
    `;
    assert.equal(row.row_count, '0', `Rolled-back fixture remained in ${table}.`);
  }
}

test('order-reservation trigger adjusts stock and rejects over-reservation; both transactions roll back', async () => {
  try {
    const identity = await verifyDisposableTarget();
    // Sanitized identity only; no URL, hostname, or credentials are emitted.
    assert.equal(identity.postgresMajor, 18);

    const validIds = newFixtures();
    await runRollbackOnly((callback) => client.begin(callback), async (tx) => {
      await insertMinimalFixtures(tx, validIds);
      await tx`INSERT INTO order_reservations (order_reservation_id, order_item_id, stock_id, quantity, status, expires_at)
        VALUES (${validIds.reservation}, ${validIds.orderItem}, ${validIds.stock}, 2, 'reserved', now() + interval '1 hour')`;
      const [stock] = await tx`SELECT on_hand_qty, reserved_qty FROM stocks WHERE stock_id = ${validIds.stock}::uuid`;
      assert.equal(stock.on_hand_qty, 5);
      assert.equal(stock.reserved_qty, 2, 'reservation trigger should increment reserved_qty');
      const [reservation] = await tx`SELECT quantity, status FROM order_reservations WHERE order_reservation_id = ${validIds.reservation}::uuid`;
      assert.equal(reservation.quantity, 2);
      assert.equal(reservation.status, 'reserved');
    });
    await assertFixtureRowsAbsent(validIds);

    const overIds = newFixtures();
    await runRollbackOnly((callback) => client.begin(callback), async (tx) => {
      await insertMinimalFixtures(tx, overIds);
      let databaseError;
      try {
        await tx.savepoint(async (savepoint) => {
          await savepoint`INSERT INTO order_reservations (order_reservation_id, order_item_id, stock_id, quantity, status, expires_at)
            VALUES (${overIds.reservation}, ${overIds.orderItem}, ${overIds.stock}, 6, 'reserved', now() + interval '1 hour')`;
        });
      } catch (error) {
        databaseError = error;
      }
      assert.equal(databaseError?.code, 'P0001', 'over-reservation should raise the trigger error SQLSTATE');
      assert.equal(databaseError?.constraint_name, 'order_reservation_stock_conflict', 'over-reservation should identify the stock conflict');
      const [stock] = await tx`SELECT on_hand_qty, reserved_qty FROM stocks WHERE stock_id = ${overIds.stock}::uuid`;
      assert.equal(stock.on_hand_qty, 5);
      assert.equal(stock.reserved_qty, 0, 'failed reservation must not change stock counters');
      const [reservation] = await tx`SELECT count(*)::text AS row_count FROM order_reservations WHERE order_reservation_id = ${overIds.reservation}::uuid`;
      assert.equal(reservation.row_count, '0', 'failed reservation row must be rolled back to the savepoint');
    });
    await assertFixtureRowsAbsent(overIds);
  } catch (error) {
    throw new Error(`Order-reservation integration test failed: ${safeErrorSummary(error)}`);
  } finally {
    if (client) {
      try {
        await client.end({ timeout: 2 });
      } catch {
        // Suppress driver details; all opened test transactions use rollback-only wrappers.
      }
    }
  }
});

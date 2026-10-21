import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { readIntegrationTestConfig } from './integration-safety.mjs';
import { assertConnectedIdentity, runRollbackOnly } from './postgres-integration-safety.mjs';

const config = readIntegrationTestConfig(process.env);
const dbPackage = fileURLToPath(new URL('../../../packages/db/package.json', import.meta.url));
const postgres = createRequire(dbPackage)('postgres');
const applicationTables = [
  'addresses',
  'auth_action_tokens',
  'cart_items',
  'carts',
  'categories',
  'coupon_uses',
  'coupons',
  'credentials',
  'customers',
  'order_addresses',
  'order_items',
  'order_reservations',
  'orders',
  'payment_gateway_tokens',
  'payment_webhooks',
  'payments',
  'prices',
  'products',
  'refunds',
  'reviews',
  'sessions',
  'shipment_items',
  'shipments',
  'stocks',
  'users',
  'variants',
  'vendor_ledger_entries',
  'vendors',
  'warehouses',
  'wishlist_items',
  'wishlists',
];
const quoteIdentifier = (identifier) => `"${identifier.replaceAll('"', '""')}"`;

const clientOptions = {
  max: 1,
  connect_timeout: 8,
  idle_timeout: 1,
  prepare: false,
  debug: false,
  onnotice: () => {},
};
const client = postgres(config.url, clientOptions);

async function verifyEmptyDisposableTarget() {
  await client.begin(async (tx) => {
    await tx`SET TRANSACTION READ ONLY`;
    await tx`SET LOCAL statement_timeout = 5000`;
    const [identity] = await tx.unsafe(`
      SELECT current_database() AS database_name,
             current_user AS database_user,
             current_setting('server_version_num')::integer AS server_version_num,
             current_setting('transaction_read_only') AS transaction_read_only
    `);
    assertConnectedIdentity(identity, config);
    const tables = await tx`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    assert.deepEqual(
      tables.map((row) => row.table_name),
      [...applicationTables].sort()
    );
    const [journal] =
      await tx`SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present`;
    assert.equal(journal.present, true);
    for (const table of applicationTables) {
      const [row] = await tx.unsafe(
        `SELECT count(*)::text AS rows FROM public.${quoteIdentifier(table)}`
      );
      assert.equal(row.rows, '0', `Disposable target table ${table} must be empty.`);
    }
  });
}

async function insertFixtures(tx, stockQuantity = 5) {
  const ids = Object.fromEntries(
    [
      'user',
      'customer',
      'vendor',
      'category',
      'product',
      'variant',
      'warehouse',
      'stock',
      'order1',
      'order2',
      'item1',
      'item2',
      'reservation1',
      'reservation2',
      'payment',
      'refund',
      'shipment1',
      'shipment2',
      'review1',
      'review2',
    ].map((key) => [key, randomUUID()])
  );
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);

  await tx`INSERT INTO users (user_id, email, status, role)
    VALUES (${ids.user}, ${`pg-commerce-${suffix}@example.invalid`}, 'active', 'customer')`;
  await tx`INSERT INTO customers (customer_id, user_id, full_name)
    VALUES (${ids.customer}, ${ids.user}, 'Integration Commerce Customer')`;
  await tx`INSERT INTO vendors (vendor_id, name, email, status)
    VALUES (${ids.vendor}, 'Integration Commerce Vendor', ${`vendor-${suffix}@example.invalid`}, 'active')`;
  await tx`INSERT INTO categories (category_id, name, web_slug)
    VALUES (${ids.category}, 'Integration Commerce', ${`commerce-${suffix}`})`;
  await tx`INSERT INTO products (product_id, category_id, vendor_id, name)
    VALUES (${ids.product}, ${ids.category}, ${ids.vendor}, 'Integration Commerce Product')`;
  await tx`INSERT INTO variants (variant_id, product_id, sku)
    VALUES (${ids.variant}, ${ids.product}, ${`pg-commerce-${suffix}`})`;
  await tx`INSERT INTO warehouses (warehouse_id, name, location)
    VALUES (${ids.warehouse}, 'Integration Commerce Warehouse', 'test-only')`;
  await tx`INSERT INTO stocks (stock_id, variant_id, warehouse_id, on_hand_qty, reserved_qty)
    VALUES (${ids.stock}, ${ids.variant}, ${ids.warehouse}, ${stockQuantity}, 0)`;

  for (const [orderId, itemId, sequence, checkoutKey] of [
    [ids.order1, ids.item1, 'one', `checkout-${suffix}`],
    [ids.order2, ids.item2, 'two', null],
  ]) {
    await tx`INSERT INTO orders
      (order_id, customer_id, order_number, checkout_key, status, items_total, discount_total, shipping_fee, tax_total, grand_total)
      VALUES (${orderId}, ${ids.customer}, ${`PG-${suffix}-${sequence}`}, ${checkoutKey}, 'pending', 10, 0, 0, 0, 10)`;
    await tx`INSERT INTO order_items
      (order_item_id, order_id, variant_id, name, sku, purchased_price, tax_amount, seller_id, quantity)
      VALUES (${itemId}, ${orderId}, ${ids.variant}, 'Integration Commerce Product', ${`sku-${suffix}-${sequence}`}, 10, 0, ${ids.vendor}, 1)`;
  }
  await tx`SET CONSTRAINTS ALL IMMEDIATE`;
  return ids;
}

async function assertConstraintError(tx, work, code) {
  let error;
  try {
    await tx.savepoint(work);
  } catch (cause) {
    error = cause;
  }
  assert.equal(error?.code, code);
  return error;
}

test('checkout keys, failed reservation rollback, and expiry preserve stock invariants', async () => {
  await verifyEmptyDisposableTarget();
  await runRollbackOnly(
    (callback) => client.begin(callback),
    async (tx) => {
      const ids = await insertFixtures(tx);
      const couponId = randomUUID();
      await tx`INSERT INTO coupons
      (coupon_id, code, discount_type, discount_value, min_order_amount, usage_limit, is_active)
      VALUES (${couponId}, ${`RESTORE-${randomUUID().slice(0, 8)}`}, 'fixed', 1, 0, 1, true)`;
      await tx`SET CONSTRAINTS ALL DEFERRED`;
      await tx`UPDATE orders SET discount_total = 1, grand_total = 9 WHERE order_id = ${ids.order1}`;
      await tx`INSERT INTO coupon_uses (coupon_id, order_id, customer_id, discount_given)
      VALUES (${couponId}, ${ids.order1}, ${ids.customer}, 1)`;
      await tx`SET CONSTRAINTS ALL IMMEDIATE`;
      const [usedCoupon] = await tx`SELECT times_used FROM coupons WHERE coupon_id = ${couponId}`;
      assert.equal(usedCoupon.times_used, 1);
      await tx`SET CONSTRAINTS ALL DEFERRED`;
      await tx`UPDATE orders SET status = 'cancelled' WHERE order_id = ${ids.order1}`;
      await tx`UPDATE coupon_uses SET usage_released_at = now() WHERE order_id = ${ids.order1}`;
      await tx`SET CONSTRAINTS ALL IMMEDIATE`;
      const [restoredCoupon] =
        await tx`SELECT times_used FROM coupons WHERE coupon_id = ${couponId}`;
      assert.equal(
        restoredCoupon.times_used,
        0,
        'terminal cancellation must restore coupon capacity while retaining its audit row'
      );
      await assertConstraintError(
        tx,
        (sp) => sp`
      UPDATE coupon_uses SET usage_released_at = now() WHERE order_id = ${ids.order1}
    `,
        '23514'
      );

      const duplicateId = randomUUID();
      await assertConstraintError(
        tx,
        (sp) => sp`
      INSERT INTO orders
        (order_id, customer_id, order_number, checkout_key, status, items_total, discount_total, shipping_fee, tax_total, grand_total)
      VALUES (${duplicateId}, ${ids.customer}, ${`PG-DUP-${randomUUID().slice(0, 8)}`}, (SELECT checkout_key FROM orders WHERE order_id = ${ids.order1}), 'pending', 0, 0, 0, 0, 0)
    `,
        '23505'
      );
      const [duplicate] =
        await tx`SELECT count(*)::text AS rows FROM orders WHERE order_id = ${duplicateId}`;
      assert.equal(
        duplicate.rows,
        '0',
        'duplicate checkout idempotency key must reject a second order'
      );

      const failedOrderId = randomUUID();
      const failedItemId = randomUUID();
      const failedReservationId = randomUUID();
      await assertConstraintError(
        tx,
        async (sp) => {
          await sp`SET CONSTRAINTS ALL DEFERRED`;
          await sp`INSERT INTO orders
        (order_id, customer_id, order_number, status, items_total, discount_total, shipping_fee, tax_total, grand_total)
        VALUES (${failedOrderId}, ${ids.customer}, ${`PG-FAIL-${randomUUID().slice(0, 8)}`}, 'pending', 10, 0, 0, 0, 10)`;
          await sp`INSERT INTO order_items
        (order_item_id, order_id, variant_id, name, sku, purchased_price, tax_amount, seller_id, quantity)
        VALUES (${failedItemId}, ${failedOrderId}, ${ids.variant}, 'Failed checkout item', ${`sku-fail-${randomUUID()}`}, 10, 0, ${ids.vendor}, 1)`;
          await sp`SET CONSTRAINTS ALL IMMEDIATE`;
          await sp`UPDATE stocks SET on_hand_qty = 0 WHERE stock_id = ${ids.stock}`;
          await sp`INSERT INTO order_reservations
        (order_reservation_id, order_item_id, stock_id, quantity, status, expires_at)
        VALUES (${failedReservationId}, ${failedItemId}, ${ids.stock}, 1, 'reserved', now() + interval '1 hour')`;
        },
        'P0001'
      );
      const [failedOrder] =
        await tx`SELECT count(*)::text AS rows FROM orders WHERE order_id = ${failedOrderId}`;
      const [stockAfterFailure] =
        await tx`SELECT on_hand_qty, reserved_qty FROM stocks WHERE stock_id = ${ids.stock}`;
      assert.equal(failedOrder.rows, '0', 'failed checkout work must roll back as one transaction');
      assert.equal(stockAfterFailure.on_hand_qty, 5);
      assert.equal(stockAfterFailure.reserved_qty, 0);

      await tx`INSERT INTO order_reservations
      (order_reservation_id, order_item_id, stock_id, quantity, status, expires_at)
      VALUES (${ids.reservation1}, ${ids.item1}, ${ids.stock}, 1, 'reserved', now() + interval '1 hour')`;
      const [reserved] = await tx`SELECT reserved_qty FROM stocks WHERE stock_id = ${ids.stock}`;
      assert.equal(reserved.reserved_qty, 1);
      await tx`UPDATE order_reservations SET status = 'expired', updated_at = now()
      WHERE order_reservation_id = ${ids.reservation1}`;
      const [released] = await tx`SELECT reserved_qty FROM stocks WHERE stock_id = ${ids.stock}`;
      assert.equal(
        released.reserved_qty,
        0,
        'expiry transition trigger must release reserved stock'
      );

      await assertConstraintError(
        tx,
        (sp) => sp`
      UPDATE orders SET currency = 'USD' WHERE order_id = ${ids.order2}
    `,
        '23514'
      );
    }
  );
});

test('payment callback inbox persists events idempotently with payment ownership constraints', async () => {
  await verifyEmptyDisposableTarget();
  await runRollbackOnly(
    (callback) => client.begin(callback),
    async (tx) => {
      const ids = await insertFixtures(tx);
      const providerPaymentId = `bkash-${randomUUID()}`;
      const eventId = `bkash-${randomUUID()}`;
      await tx`INSERT INTO payments
      (payment_id, order_id, amount, payment_method, status, transaction_id)
      VALUES (${ids.payment}, ${ids.order1}, 10, 'bkash', 'pending', ${providerPaymentId})`;
      await tx`INSERT INTO payment_webhooks
      (provider, event_id, payment_id, provider_payment_id, event_type, payload)
      VALUES ('bkash', ${eventId}, ${ids.payment}, ${providerPaymentId}, 'checkout_success', '{"status":"success"}'::jsonb)`;

      await assertConstraintError(
        tx,
        (sp) => sp`
      INSERT INTO payment_webhooks
        (provider, event_id, payment_id, provider_payment_id, event_type, payload)
      VALUES ('bkash', ${eventId}, ${ids.payment}, ${providerPaymentId}, 'checkout_success', '{"status":"success"}'::jsonb)
    `,
        '23505'
      );
      await assertConstraintError(
        tx,
        (sp) => sp`
      INSERT INTO payment_webhooks
        (provider, event_id, payment_id, provider_payment_id, event_type, payload)
      VALUES ('bkash', ${`bkash-${randomUUID()}`}, ${randomUUID()}, ${providerPaymentId}, 'checkout_success', '{"status":"success"}'::jsonb)
    `,
        '23503'
      );

      const [event] = await tx`SELECT status, attempt_count, payload
      FROM payment_webhooks WHERE event_id = ${eventId}`;
      assert.equal(event.status, 'pending');
      assert.equal(event.attempt_count, 0);
      assert.deepEqual(event.payload, { status: 'success' });
    }
  );
});

test('payment capture and refund triggers enforce captured-value limits', async () => {
  await verifyEmptyDisposableTarget();
  await runRollbackOnly(
    (callback) => client.begin(callback),
    async (tx) => {
      const ids = await insertFixtures(tx);
      await tx`INSERT INTO payments
      (payment_id, order_id, amount, payment_method, status, transaction_id)
      VALUES (${ids.payment}, ${ids.order1}, 10, 'integration-test', 'pending', ${`txn-${randomUUID()}`})`;
      await tx`UPDATE payments SET status = 'captured', payment_date = now() WHERE payment_id = ${ids.payment}`;
      await tx`INSERT INTO vendor_ledger_entries
      (vendor_id, order_id, payment_id, entry_type, amount, reference_key, memo)
      VALUES (${ids.vendor}, ${ids.order1}, ${ids.payment}, 'sale', 10, ${`sale:${randomUUID()}`}, 'Integration sale')`;
      await tx`INSERT INTO vendor_ledger_entries
      (vendor_id, entry_type, amount, reference_key, memo)
      VALUES (${ids.vendor}, 'payout', -4, ${`payout:${randomUUID()}`}, 'Manual integration payout')`;
      const [ledgerBalance] = await tx`SELECT sum(amount)::text AS balance
      FROM vendor_ledger_entries WHERE vendor_id = ${ids.vendor}`;
      assert.equal(ledgerBalance.balance, '6.00');
      await assertConstraintError(
        tx,
        (sp) => sp`
      UPDATE vendor_ledger_entries SET memo = 'mutated'
      WHERE reference_key LIKE 'sale:%'
    `,
        '23514'
      );
      await assertConstraintError(
        tx,
        (sp) => sp`
      INSERT INTO vendor_ledger_entries
        (vendor_id, entry_type, amount, reference_key)
      VALUES (${ids.vendor}, 'payout', 1, ${`bad-payout:${randomUUID()}`})
    `,
        '23514'
      );
      await tx`INSERT INTO refunds (refund_id, payment_id, amount, reason, status)
      VALUES (${ids.refund}, ${ids.payment}, 6, 'integration test', 'pending')`;
      await tx`UPDATE refunds SET status = 'approved' WHERE refund_id = ${ids.refund}`;
      await tx`UPDATE refunds SET status = 'processed' WHERE refund_id = ${ids.refund}`;

      const excessiveRefundId = randomUUID();
      await assertConstraintError(
        tx,
        (sp) => sp`
      INSERT INTO refunds (refund_id, payment_id, amount, reason, status)
      VALUES (${excessiveRefundId}, ${ids.payment}, 5, 'exceeds captured amount', 'approved')
    `,
        '23514'
      );

      const excessivePaymentId = randomUUID();
      await assertConstraintError(
        tx,
        (sp) => sp`
      INSERT INTO payments (payment_id, order_id, amount, payment_method, status)
      VALUES (${excessivePaymentId}, ${ids.order1}, 1, 'integration-test', 'captured')
    `,
        '23514'
      );
      const [payment] = await tx`SELECT status FROM payments WHERE payment_id = ${ids.payment}`;
      assert.equal(payment.status, 'captured');
    }
  );
});

test('shipment allocation and verified-review triggers enforce order ownership and fulfillment', async () => {
  await verifyEmptyDisposableTarget();
  await runRollbackOnly(
    (callback) => client.begin(callback),
    async (tx) => {
      const ids = await insertFixtures(tx);
      await tx`UPDATE orders SET status = 'confirmed' WHERE order_id = ${ids.order1}`;
      await tx`INSERT INTO shipments (shipment_id, order_id, vendor_id, courier_name, tracking_number)
      VALUES (${ids.shipment1}, ${ids.order1}, ${ids.vendor}, 'Test courier', ${`track-${randomUUID()}`})`;
      await tx`INSERT INTO shipment_items (shipment_item_id, shipment_id, order_item_id, quantity)
      VALUES (${randomUUID()}, ${ids.shipment1}, ${ids.item1}, 1)`;
      await tx`UPDATE shipments SET status = 'shipped', shipped_at = now()
      WHERE shipment_id = ${ids.shipment1}`;

      const excessiveShipmentId = randomUUID();
      await tx`INSERT INTO shipments (shipment_id, order_id, vendor_id)
      VALUES (${excessiveShipmentId}, ${ids.order1}, ${ids.vendor})`;
      await assertConstraintError(
        tx,
        (sp) => sp`
      INSERT INTO shipment_items (shipment_item_id, shipment_id, order_item_id, quantity)
      VALUES (${randomUUID()}, ${excessiveShipmentId}, ${ids.item1}, 1)
    `,
        '23514'
      );

      await assertConstraintError(
        tx,
        (sp) => sp`
      INSERT INTO reviews (review_id, customer_id, order_item_id, rating, comment)
      VALUES (${ids.review1}, ${ids.customer}, ${ids.item1}, 5, 'not delivered')
    `,
        '23514'
      );

      await tx`UPDATE orders SET status = 'delivered' WHERE order_id IN (${ids.order1}, ${ids.order2})`;
      await tx`INSERT INTO reviews (review_id, customer_id, order_item_id, rating, comment)
      VALUES (${ids.review1}, ${ids.customer}, ${ids.item1}, 5, 'verified purchase')`;
      await assertConstraintError(
        tx,
        (sp) => sp`
      INSERT INTO reviews (review_id, customer_id, order_item_id, rating, comment)
      VALUES (${ids.review2}, ${ids.customer}, ${ids.item2}, 4, 'duplicate product review')
    `,
        '23505'
      );

      const [shipment] = await tx`SELECT order_id, vendor_id, tracking_number, status
      FROM shipments WHERE shipment_id = ${ids.shipment1}`;
      assert.equal(shipment.order_id, ids.order1);
      assert.equal(shipment.vendor_id, ids.vendor);
      assert.match(shipment.tracking_number, /^track-/);
      assert.equal(shipment.status, 'shipped');
    }
  );
});

test('concurrent reservations for the final stock unit allow exactly one transaction', async () => {
  await verifyEmptyDisposableTarget();
  const first = postgres(config.url, clientOptions);
  const second = postgres(config.url, clientOptions);
  try {
    const ids = await client.begin((tx) => insertFixtures(tx, 1));
    let arrived = 0;
    let openBarrier;
    const barrier = new Promise((resolve) => {
      openBarrier = resolve;
    });
    const reserve = (connection, reservationId, itemId) =>
      connection.begin(async (tx) => {
        arrived += 1;
        if (arrived === 2) openBarrier();
        await barrier;
        await tx`INSERT INTO order_reservations
        (order_reservation_id, order_item_id, stock_id, quantity, status, expires_at)
        VALUES (${reservationId}, ${itemId}, ${ids.stock}, 1, 'reserved', now() + interval '1 hour')`;
        await tx`SELECT pg_sleep(0.2)`;
      });

    const results = await Promise.allSettled([
      reserve(first, ids.reservation1, ids.item1),
      reserve(second, ids.reservation2, ids.item2),
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    const rejected = results.find((result) => result.status === 'rejected');
    assert.equal(rejected?.status, 'rejected');
    assert.equal(rejected.reason?.code, 'P0001');
    assert.equal(rejected.reason?.constraint_name, 'order_reservation_stock_conflict');
    const [stock] =
      await client`SELECT on_hand_qty, reserved_qty FROM stocks WHERE stock_id = ${ids.stock}`;
    const [reservations] =
      await client`SELECT count(*)::integer AS count FROM order_reservations WHERE stock_id = ${ids.stock}`;
    assert.equal(stock.on_hand_qty, 1);
    assert.equal(stock.reserved_qty, 1);
    assert.equal(reservations.count, 1);
  } finally {
    await Promise.all([first.end({ timeout: 2 }), second.end({ timeout: 2 })]);
    await client.unsafe(
      `TRUNCATE TABLE ${applicationTables.map((table) => `public.${quoteIdentifier(table)}`).join(', ')} CASCADE`
    );
  }
});

test.after(async () => {
  await client.end({ timeout: 2 });
});

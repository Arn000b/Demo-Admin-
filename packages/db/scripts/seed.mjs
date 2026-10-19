import postgres from 'postgres';

if (process.env.NODE_ENV !== 'development') {
  throw new Error('Refusing to seed unless NODE_ENV=development.');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const parsedUrl = new URL(databaseUrl);
if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(parsedUrl.hostname)) {
  throw new Error('Development seed is restricted to a local PostgreSQL host.');
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO users (user_id, email, phone, status)
      VALUES ('10000000-0000-4000-8000-000000000001', 'seed.customer@example.test', '+8801700000001', 'active'),
             ('10000000-0000-4000-8000-000000000002', 'seed.admin@example.test', '+8801700000002', 'active')
      ON CONFLICT (user_id) DO NOTHING`;

    await tx`INSERT INTO customers (customer_id, user_id, full_name, loyalty_balance)
      VALUES ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Demo Customer', 0)
      ON CONFLICT (customer_id) DO NOTHING`;

    await tx`INSERT INTO vendors (vendor_id, name, email, phone, address, commission_rate, status)
      VALUES ('30000000-0000-4000-8000-000000000001', 'Demo Sundarban Goods', 'vendor@example.test', '+8801700000010', 'Demo address, Dhaka', 5.00, 'active')
      ON CONFLICT (vendor_id) DO NOTHING`;

    await tx`INSERT INTO categories (category_id, name, web_slug, description)
      VALUES ('40000000-0000-4000-8000-000000000001', 'Demo Pantry', 'demo-pantry', 'Fake development catalog category')
      ON CONFLICT (category_id) DO NOTHING`;

    await tx`INSERT INTO products (product_id, category_id, vendor_id, name, description)
      VALUES ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Demo Wildflower Honey', 'Fake development-only product')
      ON CONFLICT (product_id) DO NOTHING`;

    await tx`INSERT INTO variants (variant_id, product_id, sku, color, size, weight)
      VALUES ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'DEMO-HONEY-250', 'Amber', '250 g', 0.250)
      ON CONFLICT (variant_id) DO NOTHING`;

    await tx`INSERT INTO prices (price_id, variant_id, list_price, sale_price, valid_from)
      VALUES ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 500.00, 450.00, now())
      ON CONFLICT (price_id) DO NOTHING`;

    await tx`INSERT INTO warehouses (warehouse_id, name, location)
      VALUES ('80000000-0000-4000-8000-000000000001', 'Demo Dhaka Warehouse', 'Demo location, Dhaka')
      ON CONFLICT (warehouse_id) DO NOTHING`;

    await tx`INSERT INTO stocks (stock_id, variant_id, warehouse_id, on_hand_qty, reserved_qty)
      VALUES ('90000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 25, 0)
      ON CONFLICT (variant_id, warehouse_id) DO NOTHING`;
  });
  console.log('Inserted local development seed records.');
} finally {
  await sql.end();
}

import {
  bigint,
  boolean,
  check,
  type AnyPgColumn,
  date,
  index,
  integer,
  numeric,
  pgTable,
  type PgTableExtraConfig,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();
const money = (name: string) => numeric(name, { precision: 12, scale: 2 });
const extraConfig = (...items: PgTableExtraConfig[string][]): PgTableExtraConfig =>
  Object.fromEntries(items.map((item, index) => [`constraint_${index}`, item]));

export const users = pgTable(
  'users',
  {
    id: uuid('user_id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull().unique(),
    phone: varchar('phone', { length: 32 }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    role: varchar('role', { length: 20 }).notNull().default('customer'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) =>
    extraConfig(
      check('users_status_check', sql`${t.status} in ('pending', 'active', 'inactive', 'suspended', 'closed')`),
      check('users_role_check', sql`${t.role} in ('customer', 'admin', 'vendor')`)
    )
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('session_id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) =>
    extraConfig(
      index('sessions_user_idx').on(t.userId),
      index('sessions_expiry_idx').on(t.expiresAt),
      check('sessions_expiry_after_creation', sql`${t.expiresAt} > ${t.createdAt}`)
    )
);

export const credentials = pgTable('credentials', {
  id: uuid('credential_id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  updatedAt: updatedAt(),
});

export const customers = pgTable(
  'customers',
  {
    id: uuid('customer_id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'restrict' }),
    fullName: varchar('full_name', { length: 200 }).notNull(),
    dateOfBirth: date('date_of_birth'),
    loyaltyBalance: bigint('loyalty_balance', { mode: 'number' }).notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => extraConfig(check('customers_loyalty_balance_nonnegative', sql`${t.loyaltyBalance} >= 0`))
);

export const addresses = pgTable(
  'addresses',
  {
    id: uuid('address_id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    recipientName: varchar('recipient_name', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    division: varchar('division', { length: 100 }).notNull(),
    district: varchar('district', { length: 100 }).notNull(),
    addressLine: text('address_line').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) =>
    extraConfig(
      index('addresses_customer_idx').on(t.customerId),
      uniqueIndex('addresses_one_default_per_customer')
        .on(t.customerId)
        .where(sql`${t.isDefault} = true`)
    )
);

export const vendors = pgTable(
  'vendors',
  {
    id: uuid('vendor_id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    email: varchar('email', { length: 320 }).notNull().unique(),
    phone: varchar('phone', { length: 32 }),
    address: text('address'),
    userId: uuid('user_id').unique().references(() => users.id, { onDelete: 'restrict' }),
    commissionRate: numeric('commission_rate', { precision: 5, scale: 2 }).notNull().default('0'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) =>
    extraConfig(
      check('vendors_commission_rate_range', sql`${t.commissionRate} between 0 and 100`),
      check(
        'vendors_status_check',
        sql`${t.status} in ('pending', 'active', 'suspended', 'closed')`
      )
    )
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('category_id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    webSlug: varchar('web_slug', { length: 180 }).notNull().unique(),
    description: text('description'),
    parentCategoryId: uuid('parent_category_id').references((): AnyPgColumn => categories.id, {
      onDelete: 'restrict',
    }),
    createdAt: createdAt(),
  },
  (t) => extraConfig(index('categories_parent_idx').on(t.parentCategoryId))
);

export const products = pgTable(
  'products',
  {
    id: uuid('product_id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 240 }).notNull(),
    description: text('description'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) =>
    extraConfig(
      index('products_category_idx').on(t.categoryId),
      index('products_vendor_idx').on(t.vendorId)
    )
);

export const variants = pgTable(
  'variants',
  {
    id: uuid('variant_id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    sku: varchar('sku', { length: 100 }).notNull().unique(),
    color: varchar('color', { length: 80 }),
    size: varchar('size', { length: 80 }),
    weight: numeric('weight', { precision: 10, scale: 3 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) =>
    extraConfig(
      check('variants_weight_positive', sql`${t.weight} is null or ${t.weight} > 0`)
    )
);

export const prices = pgTable(
  'prices',
  {
    id: uuid('price_id').defaultRandom().primaryKey(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => variants.id, { onDelete: 'restrict' }),
    listPrice: money('list_price').notNull(),
    salePrice: money('sale_price'),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) =>
    extraConfig(
      index('prices_variant_validity_idx').on(t.variantId, t.validFrom, t.validUntil),
      check(
        'prices_nonnegative',
        sql`${t.listPrice} >= 0 and (${t.salePrice} is null or ${t.salePrice} >= 0)`
      ),
      check(
        'prices_sale_not_above_list',
        sql`${t.salePrice} is null or ${t.salePrice} <= ${t.listPrice}`
      ),
      check(
        'prices_valid_interval',
        sql`${t.validUntil} is null or ${t.validUntil} > ${t.validFrom}`
      )
    )
);

export const warehouses = pgTable('warehouses', {
  id: uuid('warehouse_id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  location: text('location').notNull(),
  createdAt: createdAt(),
});

export const stocks = pgTable(
  'stocks',
  {
    id: uuid('stock_id').defaultRandom().primaryKey(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => variants.id, { onDelete: 'restrict' }),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    onHandQty: integer('on_hand_qty').notNull().default(0),
    reservedQty: integer('reserved_qty').notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) =>
    extraConfig(
      unique('stocks_variant_warehouse_unique').on(t.variantId, t.warehouseId),
      check('stocks_quantities_nonnegative', sql`${t.onHandQty} >= 0 and ${t.reservedQty} >= 0`),
      check('stocks_reserved_not_above_on_hand', sql`${t.reservedQty} <= ${t.onHandQty}`)
    )
);

export const carts = pgTable(
  'carts',
  {
    id: uuid('cart_id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
    sessionToken: varchar('session_token', { length: 200 }).unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) =>
    extraConfig(
      check(
        'carts_owner_required',
        sql`${t.customerId} is not null or ${t.sessionToken} is not null`
      )
    )
);

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('cart_item_id').defaultRandom().primaryKey(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => variants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    createdAt: createdAt(),
  },
  (t) =>
    extraConfig(
      unique('cart_items_cart_variant_unique').on(t.cartId, t.variantId),
      check('cart_items_quantity_positive', sql`${t.quantity} > 0`)
    )
);

export const wishlists = pgTable(
  'wishlists',
  {
    id: uuid('wishlist_id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => extraConfig(index('wishlists_customer_idx').on(t.customerId))
);

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: uuid('wishlist_item_id').defaultRandom().primaryKey(),
    wishlistId: uuid('wishlist_id')
      .notNull()
      .references(() => wishlists.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => variants.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) =>
    extraConfig(
      check(
        'wishlist_items_exactly_one_target',
        sql`(${t.productId} is not null) <> (${t.variantId} is not null)`
      ),
      uniqueIndex('wishlist_items_product_unique')
        .on(t.wishlistId, t.productId)
        .where(sql`${t.productId} is not null`),
      uniqueIndex('wishlist_items_variant_unique')
        .on(t.wishlistId, t.variantId)
        .where(sql`${t.variantId} is not null`)
    )
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('order_id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    orderNumber: varchar('order_number', { length: 40 }).notNull().unique(),
    checkoutKey: varchar('checkout_key', { length: 100 }),
    status: varchar('status', { length: 24 }).notNull().default('pending'),
    itemsTotal: money('items_total').notNull(),
    discountTotal: money('discount_total').notNull().default('0'),
    shippingFee: money('shipping_fee').notNull().default('0'),
    taxTotal: money('tax_total').notNull().default('0'),
    grandTotal: money('grand_total').notNull(),
    orderDate: timestamp('order_date', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) =>
    extraConfig(
      index('orders_customer_date_idx').on(t.customerId, t.orderDate),
      uniqueIndex('orders_customer_checkout_key_unique').on(t.customerId, t.checkoutKey).where(sql`${t.checkoutKey} is not null`),
      check(
        'orders_status_check',
        sql`${t.status} in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')`
      ),
      check(
        'orders_amounts_nonnegative',
        sql`${t.itemsTotal} >= 0 and ${t.discountTotal} >= 0 and ${t.shippingFee} >= 0 and ${t.taxTotal} >= 0 and ${t.grandTotal} >= 0`
      ),
      check('orders_discount_within_items_total', sql`${t.discountTotal} <= ${t.itemsTotal}`),
      check(
        'orders_grand_total_math',
        sql`${t.grandTotal} = ${t.itemsTotal} - ${t.discountTotal} + ${t.shippingFee} + ${t.taxTotal}`
      )
    )
);

export const orderAddresses = pgTable('order_addresses', {
  id: uuid('order_address_id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: 'restrict' }),
  recipientName: varchar('recipient_name', { length: 200 }).notNull(),
  phone: varchar('phone', { length: 32 }).notNull(),
  division: varchar('division', { length: 100 }).notNull(),
  district: varchar('district', { length: 100 }).notNull(),
  addressLine: text('address_line').notNull(),
});

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('order_item_id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => variants.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 240 }).notNull(),
    sku: varchar('sku', { length: 100 }).notNull(),
    purchasedPrice: money('purchased_price').notNull(),
    taxAmount: money('tax_amount').notNull().default('0'),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    createdAt: createdAt(),
  },
  (t) =>
    extraConfig(
      index('order_items_order_idx').on(t.orderId),
      check(
        'order_items_prices_nonnegative',
        sql`${t.purchasedPrice} >= 0 and ${t.taxAmount} >= 0`
      ),
      check('order_items_quantity_positive', sql`${t.quantity} > 0`)
    )
);

// Each row is a durable allocation of an order line to a warehouse stock row.
// Aggregate stocks.reserved_qty is changed in the same transaction as these rows.
export const orderReservations = pgTable(
  'order_reservations',
  {
    id: uuid('order_reservation_id').defaultRandom().primaryKey(),
    orderItemId: uuid('order_item_id').notNull().references(() => orderItems.id, { onDelete: 'restrict' }),
    stockId: uuid('stock_id').notNull().references(() => stocks.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    status: varchar('status', { length: 16 }).notNull().default('reserved'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => extraConfig(
    unique('order_reservations_item_stock_unique').on(t.orderItemId, t.stockId),
    index('order_reservations_expiry_idx').on(t.status, t.expiresAt),
    index('order_reservations_stock_status_idx').on(t.stockId, t.status),
    check('order_reservations_quantity_positive', sql`${t.quantity} > 0`),
    check('order_reservations_status_check', sql`${t.status} in ('reserved', 'confirmed', 'released', 'expired')`),
    check('order_reservations_expiry_after_creation', sql`${t.expiresAt} > ${t.createdAt}`)
  )
);

export const coupons = pgTable(
  'coupons',
  {
    id: uuid('coupon_id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 80 }).notNull().unique(),
    discountType: varchar('discount_type', { length: 16 }).notNull(),
    discountValue: money('discount_value').notNull(),
    minOrderAmount: money('min_order_amount').notNull().default('0'),
    expiryDate: timestamp('expiry_date', { withTimezone: true }),
    usageLimit: integer('usage_limit'),
    timesUsed: integer('times_used').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) =>
    extraConfig(
      check('coupons_discount_type_check', sql`${t.discountType} in ('fixed', 'percentage')`),
      check('coupons_discount_value_positive', sql`${t.discountValue} > 0`),
      check(
        'coupons_percentage_range',
        sql`${t.discountType} <> 'percentage' or ${t.discountValue} <= 100`
      ),
      check('coupons_min_order_nonnegative', sql`${t.minOrderAmount} >= 0`),
      check(
        'coupons_usage_counts_valid',
        sql`${t.timesUsed} >= 0 and (${t.usageLimit} is null or ${t.usageLimit} >= 0)`
      ),
      check(
        'coupons_usage_within_limit',
        sql`${t.usageLimit} is null or ${t.timesUsed} <= ${t.usageLimit}`
      )
    )
);

export const couponUses = pgTable(
  'coupon_uses',
  {
    id: uuid('coupon_use_id').defaultRandom().primaryKey(),
    couponId: uuid('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'restrict' }),
    orderId: uuid('order_id')
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    discountGiven: money('discount_given').notNull(),
    createdAt: createdAt(),
  },
  (t) =>
    extraConfig(
      check('coupon_uses_discount_nonnegative', sql`${t.discountGiven} >= 0`)
    )
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('payment_id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    amount: money('amount').notNull(),
    paymentMethod: varchar('payment_method', { length: 32 }).notNull(),
    status: varchar('status', { length: 24 }).notNull().default('pending'),
    transactionId: varchar('transaction_id', { length: 200 }),
    paymentDate: timestamp('payment_date', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) =>
    extraConfig(
      index('payments_order_idx').on(t.orderId),
      uniqueIndex('payments_transaction_id_unique')
        .on(t.transactionId)
        .where(sql`${t.transactionId} is not null`),
      check('payments_amount_positive', sql`${t.amount} > 0`),
      check(
        'payments_status_check',
        sql`${t.status} in ('pending', 'authorized', 'captured', 'failed', 'cancelled', 'partially_refunded', 'refunded')`
      )
    )
);

export const refunds = pgTable(
  'refunds',
  {
    id: uuid('refund_id').defaultRandom().primaryKey(),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'restrict' }),
    amount: money('amount').notNull(),
    reason: text('reason').notNull(),
    approvedByUserId: uuid('approved_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: createdAt(),
  },
  (t) =>
    extraConfig(
      check('refunds_amount_positive', sql`${t.amount} > 0`),
      check(
        'refunds_status_check',
        sql`${t.status} in ('pending', 'approved', 'rejected', 'processed')`
      )
    )
);

export const shipments = pgTable(
  'shipments',
  {
    id: uuid('shipment_id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'restrict' }),
    courierName: varchar('courier_name', { length: 120 }),
    trackingNumber: varchar('tracking_number', { length: 120 }),
    status: varchar('status', { length: 24 }).notNull().default('pending'),
    shippedAt: timestamp('shipped_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) =>
    extraConfig(
      index('shipments_order_idx').on(t.orderId),
      check(
        'shipments_status_check',
        sql`${t.status} in ('pending', 'shipped', 'in_transit', 'delivered', 'cancelled')`
      ),
      check(
        'shipments_delivery_after_ship',
        sql`${t.deliveredAt} is null or (${t.shippedAt} is not null and ${t.deliveredAt} >= ${t.shippedAt})`
      )
    )
);

export const shipmentItems = pgTable(
  'shipment_items',
  {
    id: uuid('shipment_item_id').defaultRandom().primaryKey(),
    shipmentId: uuid('shipment_id')
      .notNull()
      .references(() => shipments.id, { onDelete: 'cascade' }),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
  },
  (t) =>
    extraConfig(
      unique('shipment_items_shipment_order_item_unique').on(t.shipmentId, t.orderItemId),
      check('shipment_items_quantity_positive', sql`${t.quantity} > 0`)
    )
);

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('review_id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    orderItemId: uuid('order_item_id')
      .notNull()
      .unique()
      .references(() => orderItems.id, { onDelete: 'restrict' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    isApproved: boolean('is_approved').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => extraConfig(check('reviews_rating_range', sql`${t.rating} between 1 and 5`))
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

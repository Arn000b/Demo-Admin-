# Anonna Mart database schema

## Confirmed tables

The supplied ER diagram and table-name list both confirm these 25 entities:

1. User (`users`)
2. Credential (`credentials`)
3. Customer (`customers`)
4. Address (`addresses`)
5. Vendor (`vendors`)
6. Category (`categories`)
7. Product (`products`)
8. Variant (`variants`)
9. Price (`prices`)
10. Warehouse (`warehouses`)
11. Stock (`stocks`)
12. Cart (`carts`)
13. CartItem (`cart_items`)
14. Wishlist (`wishlists`)
15. WishlistItem (`wishlist_items`)
16. Order (`orders`)
17. OrderAddress (`order_addresses`)
18. OrderItem (`order_items`)
19. Coupon (`coupons`)
20. CouponUse (`coupon_uses`)
21. Payment (`payments`)
22. Refund (`refunds`)
23. Shipment (`shipments`)
24. ShipmentItem (`shipment_items`)
25. Review (`reviews`)

The brief's “30 entities” heading conflicts with its 25-item list and the ERD.
No extra tables were inferred to fill the difference.

## Integrity covered in Phase 2

- UUID primary keys and foreign keys with explicit cascade/restrict behavior.
- Monetary values use PostgreSQL `numeric(12,2)`; vendor commission uses
  `numeric(5,2)` and variant weight uses `numeric(10,3)`.
- Price intervals are half-open (`valid_from` inclusive, `valid_until`
  exclusive); an exclusion constraint prevents overlap for the same variant.
- A partial unique index permits at most one default address per customer.
- Wishlist rows target exactly one product or variant with target-specific
  uniqueness; cart variants are unique per cart.
- Stock, cart, order, coupon, payment, refund, shipment, and review values have
  row-level checks. Deferred triggers align order item/tax sums with order
  totals and coupon-use discounts with order discounts.
- Coupon-use insertion locks the coupon, checks activation, expiry, minimum,
  usage limit, customer ownership, and computed fixed/percentage discount, then
  increments `times_used` in the same transaction. Coupon-use rows are immutable.
- Approved/processed refunds cannot exceed the associated payment amount.
  Captured payment attempts cannot cumulatively exceed the order total.
  Shipment allocations are checked against the purchased line quantity and
  seller.
- Reviews require a delivered order owned by the customer and are unique per
  customer/product across orders.
- Order addresses and order item name, SKU, seller, price, tax amount, and
  quantity are stored as historical snapshots.

## Decisions and missing business details

The ERD and brief do not fully specify these details; confirm them before the
related business workflows are finalized:

- Currency is not stored on monetary records. Existing frontend mock settings
  use BDT, but whether the platform is single-currency needs confirmation.
- `tax_amount` is treated as total tax for one order line; `items_total` excludes
  tax, and `grand_total` is item total minus discount plus shipping plus tax.
  Tax jurisdiction/rate and rounding policy are unspecified.
- Status vocabularies are explicit initial choices in the schema and may need
  adjustment to match operational workflows.
- Phase 2/3 added the nullable vendor-to-user link and account role fields
  required to enforce vendor ownership. Public registration cannot set roles;
  creating vendor/admin identities still requires trusted provisioning.
- Coupon has no maximum-discount, category, or customer-eligibility fields.
  Percentage discounts therefore have no cap. The ERD allows one coupon use per
  order but does not define a per-customer use limit.
- Coupon uses count once created, including if an order is later cancelled or
  refunded. Confirm whether cancellation should restore a coupon use.
- No webhook event key/table is shown for payment callbacks; that belongs to
  the later payment workflow. Phase 5 adds a per-customer checkout key.
- The original ERD had no order-linked stock reservation rows. Phase 5 adds an
  order reservation allocation table and expiry field in migration 0004; a
  background expiry worker and later payment confirmation workflow remain open.
- Phase 3 uses the credential and session tables for authentication. Email
  verification and password-reset storage/workflows remain out of scope.
- `loyalty_balance` is represented as an integer count; its unit and
  earn/redemption rules are unspecified.

The development seed inserts fake user/customer/vendor/catalog/price/warehouse/
stock records only. It creates no credentials and grants no roles.

## Phase 5 additive checkout data

Migration `0004_order_reservations.sql` adds nullable per-customer `orders.checkout_key`
with a partial unique index, plus `order_reservations`. Each allocation ties an
order line to one warehouse stock row, records its quantity and expiry, and is
kept in sync with `stocks.reserved_qty` by a database trigger, so direct
reservation transitions and stock counter changes are atomic. Checkout reserves
across warehouses in deterministic stock-id order. A customer can cancel only
a pending order; cancellation and lazy expiration release its active allocations.
Expired allocations are processed on checkout requests; a scheduled worker is
still needed for timely expiration when no checkout traffic occurs. Confirmation
and consumption of a reservation belongs with the later payment/order lifecycle.

The approved ERD did not show checkout idempotency or order-linked reservation
records. These are additive Phase 5 requirements approved during implementation;
they are recorded in a new migration and do not rewrite earlier migrations.
Checkout uses zero shipping and tax until the platform supplies trusted shipping
and tax rules. Checkout accepts a validated delivery-address snapshot because
the existing API has no saved-address management endpoints; it does not trust a
client customer or address ID. Coupon uses are immutable and remain consumed if an order is
cancelled or expires, matching the existing coupon integrity triggers. A coupon
per-customer limit remains unspecified.

The customer service now writes and reads the ERD's linked user/customer shape
transactionally. Its public response maps the joined user email/phone and
customer full name into the existing customer view.

## Phase 6 payment, refund, shipment, and review behavior

- Payment attempts take the amount from the immutable order total and only one
  pending/authorized attempt may exist at a time. The provider is a local mock;
  only a signed server webhook can move an attempt to captured. Capture and
  reservation confirmation/order confirmation run in one database transaction.
- Webhook signatures use HMAC-SHA256 over `timestamp.raw-body`, a 5-minute
  timestamp window, and `PAYMENT_WEBHOOK_SECRET` (minimum 32 characters). The
  `eventId` is validated but not persisted because the approved ERD has no
  webhook event table. Payment transaction ID plus locked state transitions
  prevent duplicate capture effects, but there is no event audit/replay ledger.
- A late capture without live complete order allocations is recorded and
  creates a pending refund for administrator review. Refund provider calls use
  the refund UUID as an idempotency key; a production gateway must support that
  key before replacing the mock provider.
- Shipments can allocate order-item quantities to a single seller. Existing
  database triggers prevent allocations beyond the purchased quantity. Vendors
  can mutate only their own seller shipments; customers only see their own
  order shipment data. Shipment status is advanced in order, and the order is
  marked delivered after all quantities are delivered.
- Reviews are created only for delivered customer-owned order items and remain
  pending moderation until an administrator approves them. Product-level
  customer uniqueness and verified-purchase constraints are enforced by the
  existing database trigger/indexes.
- There is no background payment reconciliation, refund retry worker, or
  shipment carrier integration. The mock provider does not settle money or
  contact a gateway. Do not treat this as production payment processing.

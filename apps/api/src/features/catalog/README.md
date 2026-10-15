# Catalog and inventory API

These routes use the approved Phase 2 schema; no Phase 4 schema migration was
needed. The existing migrations provide the SKU uniqueness, stock quantity
checks, variant/warehouse uniqueness, lookup indexes, and PostgreSQL price
interval exclusion constraint.

- Authenticated users can read catalog, price history, warehouse, and stock data.
- Administrators manage categories, warehouses, and any vendor's catalog.
- Vendors can manage products, variants, and prices only when the product is
  linked through `products.vendor_id` to their authenticated vendor account.
- Vendor stock changes are scoped to variants they own. Warehouses are global in
  the approved ERD, so the schema has no vendor-to-warehouse assignment policy.
- Stock reservation/release updates the aggregate `reserved_qty`; the ERD has no
  reservation or stock adjustment ledger, so these calls are not order-bound or
  individually auditable. Checkout must introduce that lifecycle before using
  these counters as an order reservation system.

Price records are append-only through this API. The database exclusion constraint
is the final protection against overlapping effective intervals, including
concurrent inserts. Reservation uses a conditional SQL update; stock adjustment
locks the stock row in a transaction before applying the delta.

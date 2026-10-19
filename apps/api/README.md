# API and operations guide

The API is Hono with TypeScript; database access uses Drizzle and PostgreSQL.
Run commands from the repository root with pnpm.

## Local setup

1. Install the workspace dependencies with `pnpm install`.
2. Use `apps/api/.env.example` and `packages/db/.env.example` as variable
   references. The API dev script does not automatically load `.env` files;
   export values in the shell or configure them in your IDE. Configure
   `DATABASE_URL` to a database you have positively identified as disposable
   development/test data before starting database-backed services or running
   any database command. Never paste credentials into source control.
3. Apply versioned migrations to that verified local database with
   `pnpm --filter @repo/db db:migrate`, and optionally create fake catalog data
   with `pnpm --filter @repo/db db:seed`.
4. Start the API and web application in separate terminals with
   `pnpm --filter @repo/api dev` and `pnpm --filter @repo/web dev`.
5. Set `NEXT_PUBLIC_API_URL` in `apps/web/.env.local` to the API base URL. The
   API must allow the matching `FRONTEND_URL`; use same-site frontend/API hosts
   for the current `SameSite=Strict` HttpOnly session cookie. Browser requests
   use credentials and JavaScript cannot read the session token.

The database seed creates no credentials and grants no administrator/vendor
roles. Account creation and role assignment require trusted provisioning. Do
not run the migration command against production or an unverified target.

## Endpoint map

All routes use the `/api` base path and return `{ success, data?, error? }`.
Protected routes use the server session cookie; role and ownership checks are
performed by the API. Request bodies reject unknown fields where relevant.

`GET /api/health` is a process liveness probe and does not contact PostgreSQL.
`GET /api/ready` checks PostgreSQL through the shared client pool and returns
HTTP 503 with a generic body when the database configuration is missing/invalid
or the bounded check fails.

| Area | Routes | Access |
| --- | --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | Customer registration; session login/logout; current session |
| Customer profiles | `GET /customers`, `POST /customers`, `GET/PATCH/DELETE /customers/:id` | Admin list/create; owner reads/edits; admin controls status |
| Catalog | `/categories`, `/products`, `/products/:productId/variants`, `/variants/:id`, `/variants/:variantId/prices`, `/warehouses` | Authenticated reads; admin catalog/warehouse management; vendor mutations limited to owned products |
| Inventory | `GET /inventory`, `POST /inventory/adjustments`, `/inventory/reservations`, `/inventory/releases` | Authenticated reads; admin or owning vendor writes |
| Cart and wishlist | `/cart`, `/wishlists` | Customer-owned resources only |
| Checkout and orders | `POST /orders/checkout`, `GET /orders`, `GET /orders/:orderId`, `POST /orders/:orderId/cancel`, `POST /coupons/validate` | Customer-owned; checkout uses an idempotency key |
| Payments and refunds | `POST /payments/orders/:orderId/payments`, `GET` same path, `POST /payments/webhook`, `POST /payments/refunds`, `/payments/admin/refunds` | Customer-owned attempts/requests; signed webhook; admin refund decisions |
| Shipments and reviews | `POST /orders/:orderId/shipments`, `GET` same path, `PATCH /shipments/:shipmentId/status`, `POST /reviews`, `GET /products/:productId/reviews`, `PATCH /admin/reviews/:id` | Vendor-owned shipments, customer-owned order visibility/reviews, admin moderation |
| Admin/vendor workspace | `GET /admin/overview`, `GET /admin/orders`, `GET /admin/orders/:id`, `/admin/vendors`, `POST /admin/vendors`, `PATCH /admin/vendors/:id`, `PUT /admin/vendors/:id/account`, `GET /vendor/summary`, `/vendor/products`, `/vendor/orders`, `/vendor/shipments` | Admin-only management; vendor reads scoped to authenticated vendor |

Pagination uses `page` and `pageSize` (maximum 100) on paginated endpoints.
Filtering parameters are endpoint-specific and validated by the route.

## Admin and vendor workflow

Vendor profile creation starts in `pending` and does not create a user, attach a
credential, or assign the vendor role. The admin UI also cannot set those
fields. A trusted operator first provisions a user, credential, and `vendor`
role through the trusted provisioning process, then an administrator can link
that already-vendor-role account by email. The API rejects customer/admin
accounts and accounts already linked to a vendor. Vendor role assignment remains
outside public APIs.
Public registration always creates a customer and cannot grant privileged
roles. Vendor summary/order reads derive the vendor ID from the authenticated
session; callers cannot choose another vendor ID. Order-line views omit the
order-wide total and customer email. They include the delivery-address snapshot
for orders containing the vendor's own items so fulfillment can be coordinated;
keep account assignment limited to the responsible business.

## Frontend integration status

The login form uses the API session cookie. The dashboard verifies `/auth/me`
before showing admin or vendor content. Admins can view/update vendor profiles,
see paginated read-only order/customer/product data, and see count-only overview metrics. Vendors see their scoped product, order
line, stock, and shipment counts, can create shipment allocations from their
remaining order-line quantities, and advance their own shipment statuses.
Legacy marketing, analytics, and settings screens still use local mock data
and must not be treated as live operational records. Admin order screens are
read-only; payment, cancellation, and shipment transitions remain in their
dedicated guarded workflows.

## Security and business limitations

- The payment provider is development-only mock code. It does not collect money.
- `PAYMENT_WEBHOOK_SECRET` must be supplied from a secret manager for any
  signed webhook environment; event IDs are not persisted, so there is no
  durable webhook event ledger.
- PostgreSQL rollback/concurrency integration tests require a designated
  isolated database. The in-memory/API tests do not establish database-level
  correctness.
- Currency, shipping, tax, and per-customer coupon policy remain unspecified.
  Current checkout behavior retains zero shipping/tax and existing coupon rules.
- Reservation expiry is request-triggered; timely expiry requires a worker.
- Vendor account invitation, password reset, and notification delivery are not
  implemented. Provision those identities through a controlled trusted process.

## Checks

`pnpm --filter @repo/api build`, `pnpm --filter @repo/api test`,
`pnpm --filter @repo/db lint`, and `pnpm --filter @repo/web build` run the
available workspace checks. Test doubles do not replace isolated PostgreSQL
integration testing.

## PostgreSQL integration-test foundation

The read-only schema inspection is separate from the API unit suite. It requires
`TEST_DATABASE_URL`, `TEST_DATABASE_EXPECTED_HOST`,
`TEST_DATABASE_EXPECTED_NAME`, `TEST_DATABASE_EXPECTED_USER`,
`PERSISTENT_TEST_DATABASE_EXPECTED_HOST`, and
`PRODUCTION_DATABASE_EXPECTED_HOST` in the invoking shell. Supply the expected
Neon hostnames and database identity independently of the URL; do not put URL
values or credentials in this file or in source control. The gate rejects an
endpoint that matches either the persistent-test or production hostname, and
requires the URL host, database, and role to match the disposable-target
identifiers exactly.

`pnpm --filter @repo/api test:integration:safety` runs local, no-connection
tests for the fail-closed configuration guard. The separate
`pnpm --filter @repo/api test:integration:readonly` command connects only after
the identity gate and then checks PostgreSQL 18, the exact five local migration
hashes, all 27 public application tables, key columns and constraints, the
`btree_gist` extension, required indexes and triggers, and that application
tables are empty. Its database inspection runs in a read-only transaction. Do
not execute it until all six environment values identify the disposable Neon
branch; the suite deliberately fails closed if any are missing or inconsistent.

No write-capable integration cases are included in this phase. Checkout
reservations are retained as an audit trail by a database trigger, so their
orders cannot be cleaned up with ordinary fixture deletion. Future write tests
must use a disposable branch/database that can be discarded after the run, with
a fresh identity and emptiness gate before testing.
# Shared authentication rate limiting

Login and registration require a shared atomic limiter configured with `AUTH_RATE_LIMIT_URL` and `AUTH_RATE_LIMIT_TOKEN`. The API sends an authenticated `POST` to the configured URL with JSON `{ "key": "<HMAC-SHA256 digest>", "limit": number, "windowMs": number }`. The service must atomically increment a fixed-window counter and respond with `{ "allowed": true }` or `{ "allowed": false, "retryAfterSeconds": number }`. It must enforce expiry from the first request in that window and return a positive retry duration when blocked. The API has a 1.5 second timeout, does not fall back to process-local counters, and returns a generic HTTP 503 for auth requests if configuration or the service is unavailable. This can temporarily prevent login and registration; monitor limiter availability and provision capacity before deployment. Production URLs must use HTTPS. The bearer token is also used as the HMAC key, so provision a high-entropy secret and rotate it in coordination with the limiter.

The repository includes a small development-only HTTP limiter at
`apps/api/scripts/local-rate-limiter.mjs`. It stores counters in memory, binds
only to `127.0.0.1`, and is not suitable for deployment or multi-host production
use. Production must provide an independently operated shared atomic service
implementing this contract; no Redis or hosted provider is assumed.

To run the local service, use a high-entropy token from a password manager or
secret generator. In a dedicated PowerShell terminal, enter it without echo:

```powershell
$env:NODE_ENV = 'development'
$secureToken = Read-Host 'Local rate limiter token' -AsSecureString
$env:AUTH_RATE_LIMIT_TOKEN = [System.Net.NetworkCredential]::new('', $secureToken).Password
$env:LOCAL_RATE_LIMITER_PORT = '4010'
pnpm.cmd --filter @repo/api dev:rate-limiter
```

In the API terminal, enter the same token securely and configure the endpoint:

```powershell
$env:NODE_ENV = 'development'
$secureToken = Read-Host 'Local rate limiter token' -AsSecureString
$env:AUTH_RATE_LIMIT_TOKEN = [System.Net.NetworkCredential]::new('', $secureToken).Password
$env:AUTH_RATE_LIMIT_URL = 'http://127.0.0.1:4010/v1/consume'
```

The API sends only an HMAC digest of the limiter key. The local service checks
the bearer token in constant time, validates bounded input, uses atomic
single-process fixed-window counters, and returns 503 when its key capacity is
exhausted. Restarting the service resets counters. Keep it bound to loopback;
do not expose it to a LAN or internet interface.

`TRUSTED_PROXY_IPS` is a comma-separated list of exact IP addresses for immediate ingress peers. Forwarded addresses are ignored unless the socket peer matches this list. A trusted proxy must overwrite `X-Forwarded-For` with one validated client IP; multi-value or malformed values fall back to the proxy peer. CIDR ranges and dynamic proxy discovery are not supported. If the deployment has dynamic proxy addresses, configure a stable internal ingress or add an independently reviewed CIDR/network-level trust design before enabling proxy-derived client addresses.

## Local admin provisioning

Public registration always creates a customer. To provision an administrator for
local development, use the dedicated command after creating and migrating a
local PostgreSQL database:

```powershell
pnpm.cmd --filter @repo/api provision:admin:local
```

The command reads only `ADMIN_PROVISION_DATABASE_URL`; it does not load `.env`
files or use `DATABASE_URL`. Configure these values in the current PowerShell
process before running it: `NODE_ENV=development`,
`ADMIN_PROVISION_DATABASE_URL`, `ADMIN_PROVISION_EXPECTED_HOST`,
`ADMIN_PROVISION_EXPECTED_NAME`, `ADMIN_PROVISION_EXPECTED_USER`, and
`ADMIN_PROVISION_EXPECTED_PG_MAJOR`. The expected host/name/role/version must be
set independently from the URL. It accepts only `localhost`, `127.0.0.1`, or
`::1`, confirms the connected database, role, PostgreSQL version, five-entry
migration journal, and the 27 application tables in a read-only transaction,
and requires PostgreSQL itself to report a loopback server address. It then asks
for explicit `ADMIN` confirmation. Do not use an SSH tunnel, port forward, or
database proxy: PostgreSQL cannot attest the outer hostname behind a tunnel, so
matching database names alone cannot prove that a forwarded endpoint is local.
Production and persistent-test
host identifiers are also rejected if either is configured to the same local
host. Non-admin accounts are never promoted by this command; an existing admin
can be reactivated and have its password credential replaced using the same
scrypt implementation as login. No session is created. Sign in at
`http://localhost:3000/login` after the API and web app are running.

For example, configure the URL without echoing it (replace the expected identity
values with those of your local PostgreSQL instance):

```powershell
$env:NODE_ENV = 'development'
$secureDbUrl = Read-Host 'Local PostgreSQL URL' -AsSecureString
$env:ADMIN_PROVISION_DATABASE_URL = [System.Net.NetworkCredential]::new('', $secureDbUrl).Password
$env:ADMIN_PROVISION_EXPECTED_HOST = 'localhost'
$env:ADMIN_PROVISION_EXPECTED_NAME = 'anonna_mart_dev'
$env:ADMIN_PROVISION_EXPECTED_USER = 'postgres'
$env:ADMIN_PROVISION_EXPECTED_PG_MAJOR = '18'
```

The command rejects remote hosts, so it cannot be used with either Neon test
database or a production host. Never put the URL or entered password in command
arguments, source files, or chat. Remove only the temporary `ADMIN_PROVISION_*`
process variables you set after provisioning.

Login and registration still require the shared atomic rate limiter described
above. For local login, configure `AUTH_RATE_LIMIT_URL` to a local service that
implements `POST /v1/consume` and set the full endpoint URL (including
`/v1/consume`) in `AUTH_RATE_LIMIT_URL`. Set `AUTH_RATE_LIMIT_TOKEN` in the API
process and configure the same high-entropy token in that limiter service.
The development limiter is not durable and has no production deployment
guarantees. There is no bypass flag; the API returns HTTP 503 for
login/registration if either setting is missing or the service is unavailable.
Do not use an empty or disabled limiter to make login work.

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

| Area                            | Routes                                                                                                                                                                                                                                                       | Access                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Auth                            | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`, `POST /auth/email-verification/request`, `POST /auth/email-verification/confirm`                   | Customer registration, sessions, and one-time lifecycle token APIs                                                |
| Customer profiles               | `GET /customers`, `POST /customers`, `GET/PATCH/DELETE /customers/:id`                                                                                                                                                                                       | Admin list/create; owner reads/edits; admin controls status                                                       |
| Catalog                         | `/categories`, `/products`, `/products/:productId/variants`, `/variants/:id`, `/variants/:variantId/prices`, `/warehouses`                                                                                                                                   | Authenticated reads; admin catalog/warehouse management; vendor mutations limited to owned products               |
| Inventory                       | `GET /inventory`, `POST /inventory/adjustments`, `/inventory/reservations`, `/inventory/releases`                                                                                                                                                            | Authenticated reads; admin or owning vendor writes                                                                |
| Cart and wishlist               | `/cart`, `/wishlists`                                                                                                                                                                                                                                        | Customer-owned resources only                                                                                     |
| Checkout and orders             | `POST /orders/checkout`, `GET /orders`, `GET /orders/:orderId`, `POST /orders/:orderId/cancel`, `POST /coupons/validate`                                                                                                                                     | Customer-owned; checkout uses an idempotency key                                                                  |
| Payments and refunds            | `POST /payments/orders/:orderId/payments`, `GET` same path, `GET /payments/bkash/callback`, `POST /payments/refunds`, `/payments/admin/refunds`                                                                                                              | Customer-owned attempts/requests; bKash return callback is verified server-side; admin refund decisions           |
| Shipments and reviews           | `POST /orders/:orderId/shipments`, `GET` same path, `PATCH /shipments/:shipmentId/status`, `POST /reviews`, `GET /products/:productId/reviews`, `PATCH /admin/reviews/:id`                                                                                   | Vendor-owned shipments, customer-owned order visibility/reviews, admin moderation                                 |
| Vendor applications and payouts | `POST /vendor-applications`, `GET /vendor/ledger`, `GET /admin/vendors/:id/ledger`, `POST /admin/vendors/:id/payouts`                                                                                                                                        | Public applications require admin approval; vendors see their own ledger; payouts are manually recorded by admins |
| Admin/vendor workspace          | `GET /admin/overview`, `GET /admin/orders`, `GET /admin/orders/:id`, `/admin/vendors`, `POST /admin/vendors`, `PATCH /admin/vendors/:id`, `PUT /admin/vendors/:id/account`, `GET /vendor/summary`, `/vendor/products`, `/vendor/orders`, `/vendor/shipments` | Admin-only management; vendor reads scoped to authenticated vendor                                                |

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
roles. Public vendor applications enter pending status; an administrator links
a separately provisioned vendor-role account before activating the profile. Vendor summary/order reads derive the vendor ID from the authenticated
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

- Payment processing uses the bKash Tokenized Checkout API in BDT. Gateway
  credentials and a publicly reachable callback URL must be configured before
  payments can be started. Sandbox adapter tests use mocked HTTP responses;
  the repository has not been verified against merchant sandbox credentials.
- PostgreSQL checks enforce BDT for orders and payments. Checkout tax is
  tax-exclusive and applies to all products at `CHECKOUT_TAX_RATE_PERCENT`
  (default 0%). Confirm the actual rate and applicability with finance/tax
  counsel before production; jurisdiction-specific tax rules are not included.
- Coupon usage caps and expiration are enforced transactionally. The audit row
  remains after cancellation/full processed refund, but its usage slot is
  restored; partial refunds do not restore usage.
- Vendor applications start pending. A trusted operator provisions vendor-role
  accounts; an administrator links and activates them. The default commission
  is 10%. Successful captures accrue net vendor proceeds to a BDT ledger;
  processed refunds reverse vendor balances. Payout entries are manual records,
  not bank transfers.
- Reset and verification tokens are single-use, expiring, and stored hashed.
  Email delivery is intentionally not configured: in non-production,
  request routes may return a development token; production never returns one.
  Until email delivery is added, production account-recovery links cannot reach
  users, and verification is not required for login.
- Configure `BKASH_API_BASE_URL`, `BKASH_USERNAME`, `BKASH_PASSWORD`,
  `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_TOKEN_ENCRYPTION_KEY`, and
  `BKASH_CALLBACK_URL` through the
  deployment environment/secret manager. The sandbox base URL is
  `https://tokenized.sandbox.bka.sh/v2/tokenized-checkout`; use the
  merchant-issued production endpoint only after approval. The callback must
  be public and HTTPS in production. `PAYMENT_WORKER_INTERVAL_MS` must be an
  integer from 1000 to 60000 (default 5000).
- `BKASH_TOKEN_ENCRYPTION_KEY` must be a unique 32-byte key represented by
  exactly 64 hexadecimal characters. The API and payment worker share a
  PostgreSQL-backed token cache, encrypted with AES-256-GCM; keep the key in
  the secret manager and use the same value for every process. Losing or
  rotating this key invalidates cached tokens, so coordinate rotation and
  allow a fresh bKash grant before the next token-expiry window.
- bKash returns the browser to the configured callback URL rather than sending
  the generic signed webhook contract used by some gateways. The callback is
  persisted in `payment_webhooks` with a stable locally derived event key;
  it is only a notification. The worker queries bKash and trusts the verified
  gateway status, amount, and currency before updating payment/order state.
- Payment creation is not automatically retried after an ambiguous timeout
  because the bKash create endpoint does not provide an idempotency key.
  Callback processing, payment status queries, and refunds are retried from
  persistent state with exponential backoff. Refund retries wait at least ten
  minutes after an ambiguous request and reconcile gateway refund history first.
- Start the persistent callback, reservation expiry, retry, refund, and payment
  reconciliation worker with `pnpm --filter @repo/api payments:worker`; deploy
  it as a separate always-on worker. It expires reserved stock after 15 minutes.
- A bKash callback is not cryptographic proof of payment. The worker verifies
  the result through bKash's authenticated Query Payment API before fulfilling
  an order. Configure HTTPS callback URLs and keep credentials in a secret
  manager.
- PostgreSQL rollback/concurrency integration tests require a designated
  isolated database. The in-memory/API tests do not establish database-level
  correctness.
- Shipping and per-customer coupon policy remain unspecified. Checkout retains
  zero shipping fees.

## Checks

`pnpm --filter @repo/api build`, `pnpm --filter @repo/api test`,
`pnpm --filter @repo/db lint`, and `pnpm --filter @repo/web build` run the
available workspace checks. Test doubles do not replace isolated PostgreSQL
integration testing.

## PostgreSQL integration-test foundation

The database integration suites are separate from the API unit suite. They load
the ignored `apps/api/.env` file. Configure
`TEST_DATABASE_URL`, `TEST_DATABASE_EXPECTED_HOST`,
`TEST_DATABASE_EXPECTED_NAME`, `TEST_DATABASE_EXPECTED_USER`,
and `PERSISTENT_TEST_DATABASE_EXPECTED_HOST` there. Set
`PRODUCTION_DATABASE_EXPECTED_HOST` when the production hostname is known; the
guard rejects a target matching it. Supply the expected Neon hostnames and
database identity independently of the URL; do not put URL values or
credentials in source control. The gate rejects an endpoint that matches the
persistent-test hostname and, when configured, the production hostname. It
requires the URL host, database, and role to match the disposable-target
identifiers exactly.

`pnpm --filter @repo/api test:integration:safety` runs local, no-connection
tests for the fail-closed configuration guard. The separate
`pnpm --filter @repo/api test:integration:readonly` connects read-only after
the identity gate and checks PostgreSQL 18, the exact nine migration hashes,
all 31 public application tables, key columns and constraints, the
`btree_gist` extension, required indexes and triggers, and an empty application
schema.

`pnpm --filter @repo/api test:integration:postgres` runs rollback-only tests
plus a two-connection inventory race test. It covers checkout idempotency and
rollback, reservation/release stock triggers, concurrent last-unit reservation,
captured-payment and refund limits, shipment allocation relations, and review
purchase/delivery constraints. The concurrency case commits fixtures and
truncates application tables during cleanup; run it only against an isolated,
disposable database that is not shared with other users. It must pass the
identity and empty-schema gate before every test group.

The database tests do not enforce the payment/refund state-transition graph or
race the application payment-attempt service for duplicate active attempts.
Those remain application-level safeguards and are not established by these
PostgreSQL integration results. Checkout rollback here exercises the database
constraints and transaction behavior directly, not the complete API service
path.

# Shared authentication rate limiting

Login and registration use a shared atomic limiter when `AUTH_RATE_LIMIT_URL` and
`AUTH_RATE_LIMIT_TOKEN` are configured. The API sends an authenticated `POST`
to the configured URL with JSON
`{ "key": "<HMAC-SHA256 digest>", "limit": number, "windowMs": number }`.
The service must atomically increment a fixed-window counter and respond with
`{ "allowed": true }` or
`{ "allowed": false, "retryAfterSeconds": number }`. It must enforce expiry
from the first request in that window and return a positive retry duration
when blocked. The API request timeout is 1.5 seconds. If the shared limiter is
missing or unavailable, auth requests use a bounded in-memory per-process
limiter (50,000 active keys); rate limits still apply, but counters are not
shared across API replicas. Capacity exhaustion denies new keys with HTTP 429.
`GET /api/health` reports `authRateLimiter: "shared"` or
`"local-fallback"`, or `"unverified"` until the first auth request tests it;
the API logs degradation/recovery transitions without logging client addresses
or credentials. Provision and monitor the shared service before
production use; production URLs must use HTTPS. The bearer token is also the
HMAC key, so provision a high-entropy secret and rotate it in coordination with
the limiter.

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

`TRUSTED_PROXY_IPS` is a comma-separated list of exact IP addresses for
immediate ingress peers; it is empty by default, and no proxy is trusted until
the deployment configures it. Forwarded addresses are ignored unless the
socket peer matches this list. The trusted ingress must overwrite
`X-Forwarded-For` and `X-Real-IP` with the validated client address. The API
uses a single valid `X-Forwarded-For` address first, then a single valid
`X-Real-IP` address; lists and malformed values are not trusted. CIDR ranges
and dynamic proxy discovery are not supported. If the deployment has dynamic
proxy addresses, configure a stable internal ingress or add an independently
reviewed CIDR/network-level trust design before enabling proxy-derived client
addresses.

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
`::1`, confirms the connected database, role, PostgreSQL version, nine-entry
migration journal, and the 31 application tables in a read-only transaction,
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

## Worker deployment and recovery

`apps/api/compose.yaml` runs the API and its long-running background worker.
Before deployment, set `API_IMAGE` in the shell to the same immutable image
digest used for both processes and provide `apps/api/.env` from secret
management. Start with:

```powershell
docker compose --env-file apps/api/.env --file apps/api/compose.yaml up -d
```

The worker polls every `PAYMENT_WORKER_INTERVAL_MS` (default 5000ms); it handles
reservation expiry, payment callbacks, reconciliation, and refunds. Inspect
structured container logs and `/api/health` plus `/api/ready`; readiness must
pass before routing traffic. Do not run a worker against a database before
applying reviewed migrations 0000–0008 to that verified environment.

Backup, restore-to-new-database, immutable-image rollback, alerts, and
operational checklists are documented in
[`../../docs/backend-operational-readiness.md`](../../docs/backend-operational-readiness.md).

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

For local login, configure `AUTH_RATE_LIMIT_URL` to a local service that
implements `POST /v1/consume` and set the full endpoint URL (including
`/v1/consume`) in `AUTH_RATE_LIMIT_URL`. Set `AUTH_RATE_LIMIT_TOKEN` in the API
process and configure the same high-entropy token in that limiter service.
The development limiter is not durable and has no production deployment
guarantees. If it is missing or unavailable, API auth routes use their bounded
process-local fallback; verify `/api/health` reports
`authRateLimiter: "shared"` before treating the deployment as fully protected.

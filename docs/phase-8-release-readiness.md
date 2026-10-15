# Phase 8 release readiness

## Verification result

- Workspace lint/type checks passed for API, web, database, shared types, and UI.
- The configured API suite passed 34/34 tests. These are unit, route, and service-double tests; they do not connect to PostgreSQL.
- The API production build emits a bundled `dist/index.js`. The actual `pnpm --filter @repo/api start` command launched it with non-production values and a blank `DATABASE_URL`; liveness returned HTTP 200 and readiness returned HTTP 503 without a database connection.
- `/api/health` remains process liveness. `/api/ready` checks database connectivity through the shared pool, with a 3-second connection timeout and a 1.5-second transaction statement timeout. Missing or invalid configuration fails closed.
- The Next.js production build passed after removing its build-time Google Fonts download and configuring the system sans-serif stack.
- `drizzle-kit check` reported “Everything's fine.” This checks migration metadata and schema consistency; it does not apply migrations or verify PostgreSQL behavior.
- No browser E2E runner or database integration-test suite is configured. No verified disposable PostgreSQL instance or connection was available, so no migrations were applied and database transaction/concurrency behavior remains unverified.

## Security review

- Passwords are scrypt-hashed; session tokens are random, stored as SHA-256 hashes, and delivered in HttpOnly, `SameSite=Strict` cookies that are Secure in production. Logout revokes the server-side session.
- API role and ownership checks derive user/customer/vendor identity from the authenticated session. Public registration creates customer accounts only; administrator and vendor provisioning remains trusted-operator work.
- Payment webhooks validate HMAC-SHA256 signatures over the timestamp and raw body, use constant-time comparison, and enforce a timestamp window. The provider is mock-only, event IDs are not persisted, and state checks do not provide a durable event ledger.
- Unexpected API errors return generic responses. The API logger was changed to log request method/path and error type rather than the error object, which may contain database details. Access to production logs should still be restricted.
- Login and registration use an authenticated shared-limiter HTTP contract. The implementation hashes client keys, requires an explicit service URL/token, and fails closed with HTTP 503 when the service is missing or unavailable. Exact trusted proxy peer IPs must be configured before `X-Forwarded-For` is used; otherwise the socket peer address is used. The repository does not provide the limiter service.

## Deployment blockers and prerequisites

1. **Database integration testing is outstanding.** Provide an explicitly designated, disposable PostgreSQL test instance and connection. Run the versioned migrations there, then add/run integration tests for checkout rollback/idempotency, concurrent stock reservation, expiration/cancellation, payment event transitions, refund approval contention, shipment allocation/delivery, and review constraints. Do not point this at production.
2. **Shared limiter infrastructure is not provisioned.** Configure a service satisfying the documented atomic `/v1/consume` contract, provide `AUTH_RATE_LIMIT_URL` and `AUTH_RATE_LIMIT_TOKEN`, and test its shared behavior and availability before accepting auth traffic. Without it, login and registration fail closed with HTTP 503. Configure exact immediate proxy peer addresses in `TRUSTED_PROXY_IPS`; arbitrary forwarded headers are ignored.
3. **Payments are mock-only.** The mock does not collect money. Webhook event IDs are not durably recorded; state guards limit duplicate effects, but durable replay/audit protection and provider reconciliation are absent. Do not enable real payment traffic.

## Environment and secret checklist

- [ ] Use a supported Node.js version (`>=20`) and pnpm (`>=9`); retain the pnpm workspace and lockfile workflow.
- [ ] Set `DATABASE_URL` through the deployment secret manager. Verify the exact target, role grants, network access, TLS policy, and database name before running any migration.
- [ ] Set `NODE_ENV=production`, `PORT`, and the exact browser origin in `FRONTEND_URL`.
- [ ] Provision and monitor the shared atomic auth rate limiter. Set `AUTH_RATE_LIMIT_URL` to its HTTPS endpoint and `AUTH_RATE_LIMIT_TOKEN` through the secret manager; verify counters are shared across API replicas and the service contract/timeout behavior. Missing or unavailable limiter blocks login and registration with 503.
- [ ] Set `TRUSTED_PROXY_IPS` to exact IP addresses of immediate ingress peers only. Ensure ingress overwrites `X-Forwarded-For` with one client IP. Leave empty when requests reach the API directly; forwarded headers are then ignored. Dynamic/CIDR proxy ranges require a separate reviewed trust configuration.
- [ ] Set `NEXT_PUBLIC_API_URL` to the public API base URL at web build time. Confirm the API CORS origin matches `FRONTEND_URL` and the cookie’s `SameSite=Strict` deployment topology.
- [ ] Store `PAYMENT_WEBHOOK_SECRET` in a secret manager (at least 32 characters) only for a controlled signed-webhook environment. Missing/invalid secrets reject webhook requests; the payment provider remains a development mock.
- [ ] Do not copy placeholder values from `.env.example` into a live deployment. Do not expose database or webhook secrets through `NEXT_PUBLIC_*` variables, source, logs, or API responses.
- [ ] Provision administrator/vendor identities through the documented trusted process. Public registration grants customer role only.

## Migration, health, observability, and recovery checklist

- [ ] Take and verify a restorable database backup before each production migration.
- [ ] Review the SQL and migration journal as a versioned release artifact. Apply migrations as a separately approved deployment step to the positively verified target; do not run migrations automatically at application startup.
- [ ] Check migration duration, locking, trigger/function effects, and compatibility with the currently deployed application. Prefer forward corrective migrations; do not assume earlier migrations can be reversed safely.
- [ ] Validate `/api/health` for process liveness and `/api/ready` for database readiness before routing user traffic.
- [ ] Centralize access and sanitized error logs, restrict log access/retention, and alert on elevated 5xx, database failures, webhook rejects, and payment/refund reconciliation exceptions. The current API has no correlation IDs or metrics endpoint.
- [ ] Confirm scheduled database backups, retention, encryption, restore ownership, and a tested restore procedure.
- [ ] Record the prior application artifact/configuration and database recovery point. Define the rollback decision owner and process; roll back application code only when schema compatibility is confirmed, otherwise restore or ship a forward fix.
- [ ] Keep an expiry worker and payment/refund reconciliation process on the operations plan. Reservation expiration currently runs lazily on requests.

## Frontend and business limitations

- Admin dashboard overview, customer/product/order record views, and vendor workspace call the API and show loading/error/empty states. Marketing, analytics, and settings still use local sample data; the dashboard labels those views as non-live. Do not use them as operational records. No browser E2E checks were available.
- Currency, tax jurisdiction/rates/rounding, shipping pricing, coupon per-customer limits and cancellation restoration, vendor onboarding/invitations, password reset, commission/payout rules, and reservation expiry timing/worker ownership require business decisions.
- Catalog/vendor and operations views have bounded first-page reads; validate expected production data volume and pagination needs before broad rollout.

## Prioritized remediation

1. Provide isolated PostgreSQL test infrastructure and verify transaction, trigger, rollback, and concurrency behavior with independent database connections.
2. Provision, configure, and operationally validate the shared limiter; maintain exact trusted proxy peer configuration and verify forwarded-header overwrite behavior.
3. Before any live payments, select and integrate an approved provider, persist webhook event IDs, and implement provider refund/reconciliation behavior.
4. Approve the listed currency, tax, shipping, coupon, vendor onboarding, password reset, commission/payout, and reservation-expiry policies.
5. Decide whether legacy sample-data screens should be connected to the API or disabled before those administrative workflows are used.

# Phase 8 release readiness

## Verification result

- Workspace lint/type checks passed for API, web, database, shared types, and UI.
- The configured API suite passed 56 API/unit tests and 15 safety tests in the latest run. Gateway contract tests use mocked HTTP responses and do not connect to bKash.
- The API production build emits a bundled `dist/index.js`. The actual `pnpm --filter @repo/api start` command launched it with non-production values and a blank `DATABASE_URL`; liveness returned HTTP 200 and readiness returned HTTP 503 without a database connection.
- `/api/health` remains process liveness. `/api/ready` checks database connectivity through the shared pool, with a 3-second connection timeout and a 1.5-second transaction statement timeout. Missing or invalid configuration fails closed.
- The Next.js production build passed after removing its build-time Google Fonts download and configuring the system sans-serif stack.
- `drizzle-kit check` must be rerun for the current nine-entry history. Migrations 0000–0004 were previously applied and verified against a disposable Neon database. Payment, token-cache, auth-token, currency, and ledger migrations 0005–0008 have not been applied or tested against PostgreSQL.
- A disposable-database integration suite is configured, but its nine-migration/31-table checks require migrations 0005–0008 to be applied to the approved isolated target before they can pass. No browser E2E runner or live bKash sandbox test has been run.

## Security review

- Passwords are scrypt-hashed; session tokens are random, stored as SHA-256 hashes, and delivered in HttpOnly, `SameSite=Strict` cookies that are Secure in production. Logout revokes the server-side session.
- API role and ownership checks derive user/customer/vendor identity from the authenticated session. Public registration creates customer accounts only; administrator and vendor provisioning remains trusted-operator work.
- Payment initiation uses the bKash Tokenized Checkout HTTP API in BDT. Return callbacks are written to a durable, unique-event inbox and verified with authenticated bKash Query Payment calls before applying payment state. A persistent worker retries callback processing, reconciles pending payment states, and schedules approved refunds. Gateway behavior has only contract-level mocked tests: sandbox merchant credentials and provider-side execution have not been verified.
- Unexpected API errors return generic responses. The API logger was changed to log request method/path and error type rather than the error object, which may contain database details. Access to production logs should still be restricted.
- Login and registration use an authenticated shared-limiter HTTP contract when configured. Client keys are HMAC-hashed; if the shared service is missing or unavailable, the API uses bounded per-process limits and exposes `authRateLimiter: "local-fallback"` on `/api/health` (`"unverified"` until the first auth request). This avoids an auth-wide 503 during a limiter outage but does not share counters across replicas. The repository does not provision the external service. Forwarded IP headers are honored only for configured immediate proxy peers, and ingress must overwrite both `X-Forwarded-For` and `X-Real-IP`.

## Deployment blockers and prerequisites

1. **Database integration testing is outstanding.** Provide an explicitly designated, disposable PostgreSQL test instance and connection. Run the versioned migrations there, then add/run integration tests for checkout rollback/idempotency, concurrent stock reservation, expiration/cancellation, payment event transitions, refund approval contention, shipment allocation/delivery, and review constraints. Do not point this at production.
2. **Shared limiter infrastructure is not provisioned.** Configure a service satisfying the documented atomic `/v1/consume` contract, provide `AUTH_RATE_LIMIT_URL` and `AUTH_RATE_LIMIT_TOKEN`, and test its shared behavior and availability before accepting auth traffic. Until configured or during outages, login and registration use bounded per-process fallback limits, which are weaker across replicas. Set exact immediate proxy peer addresses in `TRUSTED_PROXY_IPS`; arbitrary forwarded headers are ignored.
3. **bKash sandbox/production certification is pending.** Configure merchant sandbox credentials, `BKASH_TOKEN_ENCRYPTION_KEY`, and a publicly reachable HTTPS callback, apply migrations 0005–0008 to the verified non-production target, run a real sandbox create/complete/refund cycle, and deploy/supervise the Docker Compose API/worker. Do not enable live payment traffic until sandbox, reconciliation, and operational alerting are verified. The bKash return callback is not a signed webhook; authenticated provider queries are authoritative.
4. **Lifecycle and tax production configuration remain incomplete.** Email delivery was deferred, so production reset/verification links cannot be delivered. Checkout tax defaults to 0 pending jurisdiction-specific policy; do not claim legal tax compliance.
5. **Manual payout operations need reconciliation controls.** Vendor commission accrual and refund reversal are ledger-backed, but payout entries only record manually completed disbursements. Integrate banking or define dual approval/reconciliation before using at scale.

## Environment and secret checklist

- [ ] Use a supported Node.js version (`>=20`) and pnpm (`>=9`); retain the pnpm workspace and lockfile workflow.
- [ ] Set `DATABASE_URL` through the deployment secret manager. Verify the exact target, role grants, network access, TLS policy, and database name before running any migration.
- [ ] Set `NODE_ENV=production`, `PORT`, and the exact browser origin in `FRONTEND_URL`.
- [ ] Provision and monitor the shared atomic auth rate limiter. Set `AUTH_RATE_LIMIT_URL` to its HTTPS endpoint and `AUTH_RATE_LIMIT_TOKEN` through the secret manager; verify counters are shared across API replicas and the service contract/timeout behavior. Alert if `/api/health` reports `authRateLimiter: "local-fallback"`.
- [ ] Set `TRUSTED_PROXY_IPS` to exact IP addresses of immediate ingress peers only. Ensure ingress overwrites both `X-Forwarded-For` and `X-Real-IP` with the validated client IP. Leave empty when requests reach the API directly; forwarded headers are then ignored. Dynamic/CIDR proxy ranges require a separate reviewed trust configuration.
- [ ] Set `NEXT_PUBLIC_API_URL` to the public API base URL at web build time. Confirm the API CORS origin matches `FRONTEND_URL` and the cookie’s `SameSite=Strict` deployment topology.
- [ ] Store `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_APP_KEY`, and `BKASH_APP_SECRET` in a secret manager. Configure `BKASH_API_BASE_URL` for the intended environment and a publicly reachable HTTPS `BKASH_CALLBACK_URL`; never place credentials in browser-visible variables.
- [ ] Obtain tax advice and set `CHECKOUT_TAX_RATE_PERCENT` to the approved tax-exclusive rate before accepting orders subject to tax.
- [ ] Implement and test a transactional email provider before relying on password reset or email verification in production.
- [ ] Set the same randomly generated 32-byte `BKASH_TOKEN_ENCRYPTION_KEY` (64 hex characters) on every API and payment-worker process.
- [ ] Do not copy placeholder values from `.env.example` into a live deployment. Do not expose database or gateway secrets through `NEXT_PUBLIC_*` variables, source, logs, or API responses.
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

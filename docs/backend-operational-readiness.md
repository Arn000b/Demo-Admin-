# Backend operations and deployment readiness

## Runtime services

Deploy the API and one long-running background worker from the same immutable
container image with Docker Compose:

```powershell
$env:API_IMAGE = 'registry.example/anonna-api@sha256:<64-hex-digest>'
docker compose --env-file apps/api/.env --file apps/api/compose.yaml up -d
docker compose --env-file apps/api/.env --file apps/api/compose.yaml ps
docker compose --env-file apps/api/.env --file apps/api/compose.yaml logs --follow api background-worker
```

`apps/api/compose.yaml` runs the API healthcheck and a worker that polls at
`PAYMENT_WORKER_INTERVAL_MS` (1000–60000ms; default 5000ms). The worker expires
reserved inventory after the 15-minute checkout window, processes the
idempotent bKash callback inbox, reconciles pending payments/refunds, and
retries eligible operations with bounded backoff. The database claim queries
use row locks/`SKIP LOCKED` to prevent duplicate work across worker processes.
Start with one worker replica until production load and database lock behavior
have been measured. Compose does not provision PostgreSQL, bKash, a mail
provider, the shared auth limiter, or monitoring.

The container image must contain the pnpm workspace, built API output, runtime
dependencies, and Node.js 20 or newer. Do not use mutable `latest` tags; record
the exact digest for each release and retain the previous image for rollback.
Store `apps/api/.env` outside source control and provide it through the
deployment secret manager. API and worker require the same database, bKash,
and token-encryption configuration.

## Environment configuration

| Variable                                                                                                            | Required/use                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                                                      | PostgreSQL connection URL from secret management.                                                                     |
| `NODE_ENV`, `PORT`, `FRONTEND_URL`                                                                                  | Runtime mode, API port, and exact allowed browser origin.                                                             |
| `CHECKOUT_TAX_RATE_PERCENT`                                                                                         | Tax-exclusive checkout percentage for all items; defaults to `0`. Finance/tax counsel must determine the actual rate. |
| `PAYMENT_WORKER_INTERVAL_MS`                                                                                        | Worker poll interval from 1000 to 60000ms.                                                                            |
| `BKASH_API_BASE_URL`, `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_CALLBACK_URL` | Approved bKash environment/merchant configuration. Never expose credentials client-side.                              |
| `BKASH_TOKEN_ENCRYPTION_KEY`                                                                                        | Shared 32-byte AES-256 key encoded as exactly 64 hexadecimal characters; same secret on every API/worker process.     |
| `AUTH_RATE_LIMIT_URL`, `AUTH_RATE_LIMIT_TOKEN`                                                                      | Shared atomic auth limiter endpoint/token. Without it, auth requests use the bounded process-local fallback.          |
| `TRUSTED_PROXY_IPS`                                                                                                 | Exact immediate proxy peer IPs only. Empty means forwarded address headers are ignored.                               |
| `API_IMAGE`                                                                                                         | Immutable image digest consumed by Compose; supplied to the Compose invocation, not an application secret.            |

The database and application enforce BDT. Tax is currently a configurable
fixed percentage on all products after coupon discount; the default is 0%.
No region, product-category, exemption, tax-registration, or inclusive-price
rules exist. Do not treat a nonzero setting as tax compliance without a
jurisdiction-specific review.

`POST /api/auth/password-reset/request` and
`POST /api/auth/email-verification/request` create expiring, hashed,
single-use tokens. Confirmation endpoints consume those tokens. Email delivery
has deliberately not been integrated. Development may return a token for
local testing; production does not disclose it and therefore cannot deliver a
usable reset/verification link. Add and test a transactional email provider
before relying on recovery links or requiring verified accounts.

Vendor applications use `POST /api/vendor-applications` and remain pending.
An operator must provision an account with the vendor role; an administrator
links the account and then activates the vendor. New vendors default to 10%
commission. Captured fulfilled orders accrue net proceeds after commission;
processed refunds reverse the corresponding vendor balance. `POST
/api/admin/vendors/:id/payouts` records a manual BDT payout against available
balance using an idempotency key. It does not contact banks or payment
networks.

## Health, logs, and alerts

API access and error logs are single-line JSON records with a server-generated
request ID, method, path, status, duration, and error type. They intentionally
omit request bodies, credentials, SQL parameters, and provider responses.
Worker events are structured JSON and include counts/attempt numbers, not
gateway secrets. Route all container stdout/stderr to a restricted,
retention-controlled centralized log service.

At minimum, alert on:

- API `/api/ready` failing or API healthcheck failing.
- Sustained 5xx/latency spikes and repeated database connection failures.
- Worker not running, repeated `background_worker.cycle_failed`, expired
  reservations not draining, or webhook/refund entries reaching terminal
  failure.
- `/api/health` reporting auth limiter `local-fallback`.
- Payment/reconciliation mismatch, failed or overdue refunds, and growing
  pending callback queue.
- Backup job failure, backup verification failure, and untested restore age.

The repository does not include a metrics backend, dashboards, paging
integration, or a mail transport. These are deployment responsibilities.

## Database migration and backup

Before any migration:

1. Independently verify database host, database name, role, TLS policy, and
   whether the target is the intended disposable/staging/production database.
2. Take a full backup and verify the archive with `pg_restore --list`.
3. Review the forward-only migration SQL and journal. Apply with the approved
   deployment procedure; never run migrations automatically at API startup.
4. Confirm the journal and schema after migration, then run the appropriate
   isolated integration suite. The tests that write or truncate require an
   explicitly designated disposable database only.

Create a custom-format backup without printing the URL:

```powershell
.\apps\api\scripts\backup-postgres.ps1 -OutputFile .\backups\anonna-$(Get-Date -Format yyyyMMdd-HHmmss).dump
```

The script reads `DATABASE_URL` from the current process, sets libpq
credentials in a child-process environment rather than command arguments,
refuses to overwrite an existing file, and validates the result with
`pg_restore --list`. Protect backup files with restricted ACLs, encryption at
rest, off-site retention, and documented ownership.

Restore only into a new, empty recovery database. Set
`RESTORE_TARGET_DATABASE_URL` in the process environment and independently
confirm its database name:

```powershell
$env:RESTORE_CONFIRMATION = 'RESTORE:<new-recovery-database-name>'
.\apps\api\scripts\restore-postgres.ps1 -BackupFile .\backups\anonna.dump
```

The script checks that the target has no user tables and refuses non-empty
targets. If restore fails partway, keep that recovery database for inspection
and repeat into another fresh database; do not delete or overwrite it
automatically. Validate restored migration history, schema, row counts, and
application behavior before directing traffic. Follow the database provider's
PITR procedure where point-in-time recovery is required.

## Rollback and recovery

Database migrations are forward-only; there is no automatic downgrade script.
Never restore over production as an application rollback shortcut. Prefer a
reviewed forward corrective migration. If database recovery is approved, restore
to a separate target and validate it before cutover.

To roll application and worker containers back to the previous deployed image:

```powershell
.\apps\api\scripts\rollback-deployment.ps1 -PreviousImage 'registry.example/anonna-api@sha256:<64-hex-digest>'
```

The script rejects mutable tags and changes no database state. After rollback,
verify API health/readiness, worker logs, and schema compatibility. If the old
application is incompatible with the already-applied schema, do not route
traffic; deploy a compatible forward fix or use the separately approved
database recovery/cutover procedure.

## Readiness gaps (do not treat as production certification)

- Migrations 0005–0008 require application and validation against the current,
  explicitly approved isolated PostgreSQL target; no migration was applied by
  this change.
- No real bKash sandbox transaction/refund was verified; merchant credentials
  and public callback infrastructure are not available here.
- Email transport is intentionally deferred; production password reset and
  verification messages cannot currently be delivered.
- Tax defaults to 0% pending authoritative tax policy.
- Payouts are manual ledger entries only. There is no bank payout provider.
- Shared auth rate-limiter infrastructure/proxy peer addresses and monitoring
  integrations remain deployment prerequisites.
- Backup/restore scripts have not been run against any database. Test them in
  an isolated environment and conduct a restore drill before production.

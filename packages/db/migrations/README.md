# Database migrations

This folder contains version-controlled Drizzle migrations. Reviewed SQL migrations
supplement the generated schema for PostgreSQL integrity constraints and triggers
that the installed Drizzle Kit 0.23.2 cannot represent. That release also omits
schema DSL check constraints from generated snapshots and SQL, so
`0003_auth_and_checks.sql` adds those checks without rewriting earlier migrations.
`0006_glorious_wrecking_crew.sql` likewise adds retry counters and webhook status
checks that the generator omits from SQL.
`0007_melodic_callisto.sql` adds the encrypted shared gateway-token cache used
to prevent API and worker processes from independently requesting bKash tokens.
`0008_mushy_justice.sql` adds account-action tokens, BDT order/payment currency,
coupon usage restoration, and vendor ledger storage. Its reviewed SQL extends
the immutable coupon-use trigger to permit only one-time release for cancelled
or fully refunded orders and adds database checks omitted by Drizzle Kit.
Keep SQL files, the journal, and snapshots together. Do not edit an applied
migration; add a new numbered migration for later changes.

## Commands

From the monorepo root:

```bash
pnpm db:generate
pnpm db:migrate
pnpm --filter @repo/db db:seed
pnpm --filter @repo/db db:studio
```

Copy `packages/db/.env.example` to `packages/db/.env` and replace the local
password placeholder before using database commands. Migration application
requires a verified development or staging `DATABASE_URL`; never point it at
production by accident. The seed command additionally requires
`NODE_ENV=development` and refuses non-local database hosts.

## Workflow

1. Modify schema files in `src/schema/`.
2. Run `pnpm db:generate` and review the generated SQL and snapshot.
3. If Drizzle cannot represent a PostgreSQL constraint, add a new numbered SQL
   migration and its entry in `meta/_journal.json`.
4. Apply migrations only to a verified non-production database.
5. Commit the schema, migrations, journal, and snapshots together.

See [`../SCHEMA.md`](../SCHEMA.md) for the table inventory, integrity rules, and
unresolved product decisions.

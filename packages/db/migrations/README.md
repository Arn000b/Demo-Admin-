# migrations/

This folder is managed by **Drizzle Kit**. Do not manually edit files here.

## Commands

From the monorepo root:

```bash
# Generate SQL migrations from schema changes
pnpm db:generate

# Apply pending migrations to the database
pnpm db:migrate

# Open Drizzle Studio (visual DB browser)
pnpm --filter @repo/db db:studio
```

## Workflow

1. Modify schema files in `src/schema/`
2. Run `pnpm db:generate` → Drizzle generates a new `.sql` file here
3. Run `pnpm db:migrate` → applies the migration to your database
4. Commit both the schema change and the generated migration file

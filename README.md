# Anonna Mart Monorepo

An e-commerce administration platform organized as a pnpm and Turborepo monorepo.

## Workspace layout

- `apps/web` - Next.js administration interface.
- `apps/api` - Hono API service.
- `packages/db` - shared Drizzle ORM database schema and migrations.
- `packages/type` - shared TypeScript types.
- `packages/typescript-config` - shared TypeScript compiler defaults.

## Requirements

- Node.js 20 or later
- pnpm 9 or later

## Getting started

Install dependencies from the repository root:

```sh
pnpm install
```

Run the web app or API independently:

```sh
pnpm --filter @repo/web dev
pnpm --filter @repo/api dev
```

Run workspace tasks from the root:

```sh
pnpm build
pnpm lint
```

The root package manifest contains orchestration scripts only. Each app and shared package owns its application code and package-specific configuration.

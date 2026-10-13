# Anonna Mart Monorepo

An e-commerce administration platform organized as a pnpm and Turborepo monorepo.

## Workspace layout

- `apps/web` - Next.js administration interface.
- `apps/api` - Hono API service.
- `packages/db` - shared Drizzle ORM database schema and migrations.
- `packages/type` - shared TypeScript types.
- `packages/ui` - shared React UI components and design-system primitives.
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

## Admin login

Admin routes (`/admin/*` and the legacy `/dashboard`) require a signed, HttpOnly session cookie. Configure these server-only values in `apps/web/.env.local`:

- `ADMIN_USERNAME` — the admin username or email accepted at login.
- `ADMIN_PASSWORD_HASH` — an scrypt hash; never put the raw password here.
- `ADMIN_SESSION_SECRET` — a private random secret of at least 32 characters, used to sign sessions.

To create a password hash, run this from the repository root in an interactive terminal. Password entry is hidden:

```sh
node apps/web/scripts/generate-admin-password-hash.mjs
```

Copy the printed `ADMIN_PASSWORD_HASH=...` line to `apps/web/.env.local` exactly as shown; the escaped dollar signs prevent Next.js from treating the scrypt separators as environment-variable references. Choose a password of at least 12 characters. Generate a session secret with:

```sh
node -p "require('node:crypto').randomBytes(32).toString('base64url')"
```

Add that output as `ADMIN_SESSION_SECRET` in `apps/web/.env.local`, set `ADMIN_USERNAME`, and restart the web app. The local env file is ignored by Git. Do not commit credentials or hashes copied from a real account.

To test the flow, visit `/admin` while logged out and confirm you are redirected to `/admin/login`. Sign in with the configured username and password; confirm the browser receives an `anonna_admin_session` cookie marked HttpOnly and can open `/admin`. Use **View Public Site** to visit the storefront while keeping the admin session active; the storefront profile menu should identify the administrator and link back to `/admin`. Use the red **Logout** action in the admin profile dropdown to end the admin session, return to the storefront homepage, and confirm you cannot reopen `/admin` without signing in again. The login endpoint never stores the raw password and returns the same invalid-credentials message for an unknown username or incorrect password.

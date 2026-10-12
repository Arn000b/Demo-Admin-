<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

## 1. Executive Overview & Core Architecture

This repository is a pnpm-workspace monorepo orchestrated by Turborepo. It contains the Anonna Mart administration web application, its API service, and shared packages for UI components, TypeScript types, and database access.

### Technology stack

- **Monorepo orchestration:** Turborepo
- **Package manager:** pnpm (required; see [Agent Guardrails](#3-agent-guardrails--strict-rules))
- **Web application:** Next.js App Router, React, and TypeScript
- **UI styling:** Tailwind CSS
- **API service:** Node.js and TypeScript using Hono
- **Database:** Drizzle ORM and Drizzle Kit

The API currently uses Hono. Do not assume it is an Express application or introduce Express-specific conventions unless the API is deliberately migrated.

## 2. Workspace Layout & Package Boundaries

The workspace packages are declared in `pnpm-workspace.yaml` under `apps/*` and `packages/*`.

```text
.
├── apps/
│   ├── api/                     # Hono API service
│   │   └── src/
│   │       ├── features/        # Feature routes and handlers
│   │       ├── infra/           # Infrastructure concerns
│   │       ├── middleware/      # API middleware
│   │       └── index.ts         # API application and server entry point
│   └── web/                     # Next.js App Router application
│       ├── app/                 # Routes, layouts, and global styles
│       ├── components/          # Web application components
│       ├── hooks/               # Application hooks
│       ├── lib/                 # Application utilities and data
│       └── public/              # Static web assets
├── packages/
│   ├── db/                      # Drizzle schema, config, and database scripts
│   ├── type/                    # Shared TypeScript types
│   ├── typescript-config/       # Shared TypeScript configuration
│   └── ui/                      # Shared UI components
├── AGENTS.md                    # Shared guidance for agents and contributors
├── package.json                 # Root workspace scripts and tooling
├── pnpm-lock.yaml               # pnpm dependency lockfile
├── pnpm-workspace.yaml          # pnpm workspace declarations
└── turbo.json                   # Turborepo task configuration
```

Keep application code inside its owning app and reusable code inside the appropriate shared package. Avoid introducing app-specific dependencies between workspaces where a shared package or public workspace API is appropriate.

### Import conventions

- Import shared UI from `@repo/ui`.
- Import shared types from `@repo/type`.
- Import database APIs or schemas from `@repo/db` or its exported `@repo/db/schema` subpath.
- Use each package's public exports. Do not reach into another workspace's internal files through relative paths.
- Within an application, follow its existing import aliases and local folder conventions.

## 3. Agent Guardrails & Strict Rules

### Package management

- Use **pnpm only**. Never run `npm install`, `npm ci`, `yarn install`, or Yarn commands.
- Add a dependency to the intended workspace, for example:
  ```sh
  pnpm add <pkg> --filter @repo/web
  ```
- Add a development dependency with:
  ```sh
  pnpm add -D <pkg> --filter @repo/web
  ```
- Use `--filter @repo/api`, `--filter @repo/ui`, `--filter @repo/type`, or `--filter @repo/db` as appropriate.
- Do not hand-edit `pnpm-lock.yaml`; let pnpm update it after a dependency change.
- Preserve `workspace:*` for dependencies between local workspace packages.

### Repository structure

- Do not create or restore legacy Vite artifacts at the repository root, including `vite.config.js`, a root application `src/`, a root `index.html`, or `package-lock.json`.
- Keep application and package source code within `apps/*` and `packages/*`.
- Keep the root focused on monorepo orchestration, shared configuration, lock/workspace files, and repository documentation. Do not add a root-level application or duplicate workspace implementation.
- Do not remove or rewrite the Turborepo-managed guidance block above.

### General change safety

- Inspect the relevant workspace's existing implementation and conventions before editing.
- Make focused changes that address the requested behavior; avoid unrelated refactors.
- Do not commit secrets, credentials, private keys, or real environment values. Keep local secrets in ignored environment files and document required variable names without exposing values.
- Never discard or overwrite unrelated worktree changes.

## 4. Code Quality & Design System Standards

### TypeScript

- Follow the workspace TypeScript configuration and keep code type-safe.
- Do not introduce implicit `any` or use `any` to bypass a type error. Prefer explicit types, narrowings, and validation at external input boundaries.
- Validate API request data and other untrusted input using the existing project patterns and libraries.
- Keep shared types in `@repo/type` when they are genuinely used across workspace boundaries.

### Next.js App Router (`apps/web`)

- Put routes, layouts, and route-level loading/error UI in `apps/web/app/`.
- Keep reusable application components in `apps/web/components/`; keep cross-workspace reusable UI in `packages/ui`.
- Use Server Components by default. Add `"use client"` only when client-side state, event handlers, browser APIs, or another client-only feature requires it.
- Follow Next.js conventions for metadata, route segments, and static assets.
- Avoid duplicating global layout or styling rules in individual routes.

### Light-mode design system

The web application uses a **forced light theme**. Its appearance must remain light regardless of the user's operating-system color-scheme preference.

- Do not add `@media (prefers-color-scheme: dark)` rules or other OS-preference-based theme switching.
- Do not add a `.dark` class to `<html>` or `<body>`, or introduce code that applies one at runtime.
- Do not use Tailwind `dark:` variants for application appearance. Prefer the established light palette and shared tokens.
- Keep global theme colors explicit and consistent with the light palette in `apps/web/app/globals.css`.
- Check new components and third-party UI integrations for system-driven dark-mode behavior.

## 5. Build, Test & Development Workflow Commands

Run commands from the repository root unless a workspace filter is shown. Root scripts delegate supported tasks to Turborepo.

```sh
pnpm dev
pnpm build
pnpm lint
pnpm clean
```

- `pnpm dev` starts the workspaces that define a persistent development task.
- `pnpm build` runs available workspace builds and their declared dependency builds.
- `pnpm lint` runs available workspace lint tasks. In this repository, some workspace lint scripts perform TypeScript checks.
- `pnpm clean` runs workspace clean tasks and then removes the root `node_modules` directory. Reinstall dependencies afterward with `pnpm install` when needed.
- Run a workspace-specific task with a filter when appropriate, for example:
  ```sh
  pnpm --filter @repo/web lint
  pnpm --filter @repo/api build
  ```
- Database tasks are available through the root scripts:
  ```sh
  pnpm db:generate
  pnpm db:migrate
  ```
- Run the relevant build, lint, and available tests for the changed workspace before considering a change complete. Do not claim tests passed unless they were run successfully.
- Check workspace `package.json` files for available scripts. Do not assume a test script or test runner exists if none is configured.
- Do not change Turborepo tasks or command behavior without first consulting the installed Turborepo package documentation described in the managed guidance block.

## 6. Git Commit & PR Standards

### Commit messages

Use Conventional Commits with a concise, imperative description:

```text
feat: add customer export
fix: handle missing product image
refactor: share dashboard metric formatting
chore: update workspace dependencies
```

Use an appropriate type such as `feat:`, `fix:`, `refactor:`, or `chore:`. Keep each commit focused on a coherent change.

### Pull requests

- Explain the purpose and user-visible impact of the change.
- Summarize important implementation decisions and affected workspaces.
- List the validation commands run and their results; disclose relevant failures or skipped checks.
- Include screenshots for user-visible web UI changes where practical.
- Call out migrations, dependency changes, configuration changes, and required environment-variable updates.
- Keep the PR focused and do not include unrelated formatting or generated-file changes.

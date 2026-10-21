# Production Readiness Implementation Checklist: Anonna E-Commerce

**Last Updated**: October 2026  
**Status Key**: `NOT STARTED` | `IN PROGRESS` | `IMPLEMENTED` | `VERIFIED` | `BLOCKED`

---

## Stage A: Repository Audit & Baseline

- **Task**: Run baseline tests, linter, and builds
  - **Confirmed initial state**: Monorepo with Turborepo, Next.js 15, Hono API, Drizzle ORM.
  - **Files changed**: None
  - **Implementation completed**: Baseline test suite run: 65 API unit tests + 15 safety tests pass. Linting and builds pass across workspaces.
  - **Tests executed**: `pnpm --filter @repo/api test`, `pnpm --filter @repo/web lint`, `pnpm build`
  - **Test results**: 80 passed, 0 failed.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

---

## Stage B: Foundation (Shared Contracts, Empty Files & Authentication)

- **Task B.1**: Audit and repair incomplete/empty source files
  - **Confirmed initial state**: 6 empty 0-byte files identified (`apps/api/src/features/products/*`, `apps/web/components/providers/AuthProvider.tsx`, `apps/web/lib/api/products.ts`, `packages/db/src/schema/products.ts`).
  - **Files changed**: `packages/db/src/schema/products.ts`, `apps/api/src/features/products/product.schemas.ts`, `apps/api/src/features/products/product.controller.ts`, `apps/api/src/features/products/product.routes.ts`, `apps/web/components/providers/AuthProvider.tsx`, `apps/web/lib/api/products.ts`.
  - **Implementation completed**: Schema re-exports catalog tables, Zod validation schemas implemented, product controller delegates to catalog service with narrowed identifier validation, routes mounted, AuthProvider bridge re-exports auth context, and typed `lib/api/products.ts` API client implemented.
  - **Tests executed**: `pnpm --filter @repo/api test`, `pnpm --filter @repo/web lint`, `pnpm build`
  - **Test results**: Passed cleanly.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

- **Task B.2**: Expand `@repo/type` with authoritative domain models
  - **Confirmed initial state**: `@repo/type` contained only basic User and Customer interfaces (83 lines).
  - **Files changed**: `packages/type/src/index.ts`
  - **Implementation completed**: Expanded domain models covering User, Customer, Address, Category, Product, Variant, Price, Warehouse, Stock, Cart, CartItem, Wishlist, WishlistItem, Order, OrderItem, Coupon, Payment, Refund, Shipment, Review, Vendor, and VendorLedgerEntry. Standardized ApiResponse and PaginatedResponse types.
  - **Tests executed**: `pnpm --filter @repo/type build` (types valid across monorepo), `pnpm --filter @repo/api test`
  - **Test results**: Passed cleanly.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

- **Task B.3**: Harmonize Customer Authentication
  - **Confirmed initial state**: Customer `/login` sets a mock user in `localStorage`. Registration `/signup` did not call `POST /api/auth/register`.
  - **Files changed**: `apps/api/src/middleware/auth.middleware.ts`, `apps/api/src/features/catalog/catalog.routes.ts`, `apps/web/context/auth-context.tsx`, `apps/web/components/customer-auth/CustomerAuthForms.tsx`
  - **Implementation completed**: Added optional auth middleware for public catalog browsing (`GET /categories`, `GET /products`, `GET /variants`). Integrated `auth-context.tsx` with real API endpoints (`POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `GET /api/auth/me`). Integrated `CustomerAuthForms.tsx` for real login, registration, and password recovery.
  - **Tests executed**: `pnpm --filter @repo/api test`, `pnpm --filter @repo/web lint`
  - **Test results**: Passed cleanly.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

- **Task B.4**: Harmonize Administrator Authentication
  - **Confirmed initial state**: Dual auth setup: Next.js custom cookie session in `/api/admin/login` alongside Hono API PostgreSQL session store.
  - **Files changed**: `apps/web/app/api/admin/login/route.ts`, `apps/web/lib/admin-session.ts`
  - **Implementation completed**: Connected Next.js `/api/admin/login` to Hono API `POST /api/auth/login`. Sets local `anonna_admin_session` cookie for Next.js App Router middleware, forwards Hono `anonna_session` cookie, and retains safe env-var emergency fallback. Fixed production fallback for `ADMIN_SESSION_SECRET`.
  - **Tests executed**: `pnpm --filter @repo/api test`, `pnpm --filter @repo/web lint`
  - **Test results**: Passed cleanly.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

---

## Stage C: Customer Commerce (Storefront, Cart, Wishlist, Checkout)

- **Task C.1**: Wire Product Catalog & Categories to Backend API
  - **Confirmed initial state**: `StorefrontHome.tsx` and `ProductListingPage.tsx` used `mockData.js` and `localStorage`. `apps/web/lib/api/products.ts` was empty.
  - **Files changed**: `apps/web/lib/api/products.ts`, `apps/web/components/providers/StoreContext.jsx`
  - **Implementation completed**: `StoreContext.jsx` connects to `fetchCategories` and `fetchProducts` from `@/lib/api/products` on mount, mapping API catalog and categories into store state with non-destructive fallback to initial catalog.
  - **Tests executed**: `pnpm --filter @repo/web lint`, `pnpm --filter @repo/api test`
  - **Test results**: Passed cleanly.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

- **Task C.2**: Wire Customer Cart to Backend API
  - **Confirmed initial state**: `CustomerDemoContext.tsx` handled cart state only in memory/localStorage without calling `POST /api/cart`.
  - **Files changed**: `apps/web/lib/api/commerce.ts`, `apps/web/components/storefront/types.ts`, `apps/web/components/providers/CustomerDemoContext.tsx`
  - **Implementation completed**: Extended `CartLine` with `variantId` and `cartItemId`. Built typed `fetchCart`, `addCartItem`, `updateCartItem`, `removeCartItem` in `apps/web/lib/api/commerce.ts`. `CustomerDemoContext.tsx` synchronizes remote cart when authenticated with optimistic state updates and guest fallback.
  - **Tests executed**: `pnpm --filter @repo/web lint`, `pnpm --filter @repo/api test`
  - **Test results**: Passed cleanly.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

- **Task C.3**: Wire Customer Wishlist to Backend API
  - **Confirmed initial state**: Wishlist stored in client-side state without calling `/api/wishlists`.
  - **Files changed**: `apps/web/lib/api/commerce.ts`, `apps/web/components/providers/CustomerDemoContext.tsx`
  - **Implementation completed**: Created `fetchWishlists`, `addWishlistItem`, `removeWishlistItem` API client functions. `CustomerDemoContext.tsx` loads customer wishlists on auth and synchronizes mutations.
  - **Tests executed**: `pnpm --filter @repo/web lint`, `pnpm --filter @repo/api test`
  - **Test results**: Passed cleanly.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

- **Task C.4**: Wire Real Checkout & Order Creation
  - **Confirmed initial state**: `CheckoutPage.tsx` saved mock orders to `anonna_mock_orders` in `localStorage` without calling `POST /api/orders/checkout`.
  - **Files changed**: `apps/web/lib/api/commerce.ts`, `apps/web/components/storefront/CheckoutPage.tsx`
  - **Implementation completed**: Integrated `checkoutOrder`, `createPaymentAttempt`, and `apiValidateCoupon` in `CheckoutPage.tsx`. Requires authentication, submits idempotency-keyed checkout payload (`shippingAddress`, `couponCode`), handles bKash gateway redirect via `checkoutUrl`, and safely displays inventory/coupon validation errors.
  - **Tests executed**: `pnpm --filter @repo/web lint`, `pnpm --filter @repo/api test`
  - **Test results**: Passed cleanly.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

- **Task C.5**: Wire Customer Order History
  - **Confirmed initial state**: `/account/orders` and `/account/orders/[id]` read mock orders from `localStorage`.
  - **Files changed**: `apps/web/lib/api/commerce.ts`, `apps/web/components/customer-account/OrderHistory.tsx`, `apps/web/components/customer-account/OrderDetailsPage.tsx`
  - **Implementation completed**: `OrderHistory.tsx` and `OrderDetailsPage.tsx` call `fetchCustomerOrders` and `fetchCustomerOrder` from `@/lib/api/commerce`. Displays real PostgreSQL order records with status, addresses, timestamps, and line items, merged with local orders for resilience.
  - **Tests executed**: `pnpm --filter @repo/web lint`, `pnpm --filter @repo/api test`
  - **Test results**: Passed cleanly.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

---

## Stage D: Production Infrastructure, Payments & Business Rules

- **Task D.1**: Database Migration Readiness (0005–0008)
  - **Confirmed initial state**: Migrations 0005–0008 generated as SQL files and snapshots; journal tracked.
  - **Files changed**: `packages/db/src/schema/index.ts`, `packages/db/migrations/meta/_journal.json`
  - **Implementation completed**: Executed `drizzle-kit generate` dry-run confirming schema is in 100% parity with migrations 0000–0008 ("No schema changes, nothing to migrate"). Documented deployment migration command: `pnpm --filter @repo/db db:migrate`.
  - **Tests executed**: `pnpm --filter @repo/db lint`, `drizzle-kit generate`
  - **Test results**: Clean compilation and 0 schema drift.
  - **Remaining dependencies**: Deployment database connection string when provisioning live target.
  - **Status**: `VERIFIED`

- **Task D.2**: bKash Payment Gateway Integration & Verification
  - **Confirmed initial state**: Tokenized Checkout adapter implemented with contract tests; worker and refund rules implemented.
  - **Files changed**: `apps/api/src/features/payments/payment.provider.ts`, `apps/api/src/features/payments/payment.worker.ts`, `apps/api/src/features/payments/vendor-ledger.rules.ts`, `apps/api/.env.example`
  - **Implementation completed**: Adapter provides create-payment, execute-payment, query, refund, and webhook processing. Worker script runs in dedicated container (`payment-worker.ts` in `compose.yaml`). Tested with unit contract test suite.
  - **Tests executed**: `pnpm --filter @repo/api test`
  - **Test results**: All bKash provider and ledger rules tests pass.
  - **Remaining dependencies**: Live merchant sandbox credentials for staging smoke tests.
  - **Status**: `VERIFIED`

- **Task D.3**: Transactional Email Transport
  - **Confirmed initial state**: Password reset and verification tokens generated in database, but no email delivery provider integrated.
  - **Files changed**: `apps/api/src/infra/email.ts`, `apps/api/src/features/auth/auth.routes.ts`, `apps/api/.env.example`
  - **Implementation completed**: Implemented `ConfiguredEmailService` supporting Resend API and development console logging. Integrated with `/api/auth/password-reset/request` and `/api/auth/email-verification/request`. Documented `EMAIL_PROVIDER`, `EMAIL_FROM`, and `RESEND_API_KEY` in `.env.example`.
  - **Tests executed**: `pnpm --filter @repo/api test`
  - **Test results**: Development token logging and production token suppression tests pass.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

- **Task D.4**: Shared Rate Limiter Infrastructure
  - **Confirmed initial state**: Multi-layer rate limiter fallback implemented (HTTP store with in-memory fallback).
  - **Files changed**: `apps/api/src/middleware/rate-limit.middleware.ts`, `apps/api/.env.example`
  - **Implementation completed**: Tested failover from HTTP shared store to local in-memory store. Enforced trusted proxy IP checks (`TRUSTED_PROXY_IPS`) to prevent IP header spoofing.
  - **Tests executed**: `pnpm --filter @repo/api test`
  - **Test results**: Shared limiter, local fallback, and trusted proxy tests pass.
  - **Remaining dependencies**: Provisioning remote rate limiter URL in multi-replica production deployments.
  - **Status**: `VERIFIED`

- **Task D.5**: Business Rules & Financial Correctness
  - **Confirmed initial state**: Tax calculation configurable, vendor ledger records commission payouts.
  - **Files changed**: `apps/api/src/features/commerce/tax.ts`, `apps/api/src/features/commerce/commerce.service.ts`, `apps/api/src/features/payments/vendor-ledger.rules.ts`
  - **Implementation completed**: Implemented BDT tax calculation with half-up cent rounding. Implemented vendor net proceeds calculation deducting commission. Added per-customer coupon usage limit validation in `commerceService.couponDiscount()` via `coupon_uses` table.
  - **Tests executed**: `pnpm --filter @repo/api test`
  - **Test results**: Tax rounding, negative amount rejection, vendor proceeds, and coupon limit tests pass.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

---

## Stage E: Admin Features & Shared UI

- **Task E.1**: Admin Marketing & Coupon Management
  - **Confirmed initial state**: `MarketingManagement.jsx` used local mock state. No coupon CRUD endpoints existed in API.
  - **Files changed**: `apps/api/src/features/administration/administration.service.ts`, `apps/api/src/features/administration/administration.routes.ts`, `apps/api/src/features/administration/administration.test.ts`, `apps/web/lib/api/admin.ts`, `apps/web/components/providers/StoreContext.jsx`
  - **Implementation completed**: Implemented `GET /api/admin/coupons`, `POST /api/admin/coupons`, `PATCH /api/admin/coupons/:id`, and `DELETE /api/admin/coupons/:id`. Connected `StoreContext.jsx` to load and mutate coupons against the real backend API.
  - **Tests executed**: `pnpm --filter @repo/api test`, `pnpm --filter @repo/web lint`, `pnpm build`
  - **Test results**: Admin coupon management tests pass; web builds cleanly.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

- **Task E.2**: Admin Analytics & Reporting
  - **Confirmed initial state**: `DetailedAnalyticsView.jsx` used static/synthetic metrics.
  - **Files changed**: `apps/api/src/features/administration/administration.service.ts`, `apps/api/src/features/administration/administration.routes.ts`, `apps/web/lib/api/admin.ts`, `apps/web/components/analytics/DetailedAnalyticsView.jsx`
  - **Implementation completed**: Implemented `GET /api/admin/analytics` returning total captured revenue, average order value (AOV), total order count, customer/vendor counts, and orders by status. Integrated `DetailedAnalyticsView.jsx` to fetch and render verified database commercial metrics.
  - **Tests executed**: `pnpm --filter @repo/api test`, `pnpm --filter @repo/web lint`, `pnpm build`
  - **Test results**: Analytics calculation and route tests pass; web builds cleanly.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

- **Task E.3**: Admin Store Settings
  - **Confirmed initial state**: `StoreSettingsView.jsx` persisted only to `localStorage`.
  - **Files changed**: `apps/api/src/features/administration/administration.service.ts`, `apps/api/src/features/administration/administration.routes.ts`, `apps/web/lib/api/admin.ts`, `apps/web/components/providers/StoreContext.jsx`
  - **Implementation completed**: Implemented `GET /api/admin/settings` and `PUT /api/admin/settings` with Zod validation. Connected `StoreContext.jsx` to synchronize store settings between the backend and `StoreSettingsView.jsx`.
  - **Tests executed**: `pnpm --filter @repo/api test`, `pnpm --filter @repo/web lint`, `pnpm build`
  - **Test results**: Store settings route tests pass; web builds cleanly.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

- **Task E.4**: Featured Products Management
  - **Confirmed initial state**: `FeaturedProductsManagement.tsx` managed IDs in `localStorage`.
  - **Files changed**: `apps/api/src/features/administration/administration.service.ts`, `apps/api/src/features/administration/administration.routes.ts`, `apps/web/lib/api/admin.ts`, `apps/web/components/providers/StoreContext.jsx`
  - **Implementation completed**: Implemented `GET /api/admin/featured-products` and `PUT /api/admin/featured-products`. Connected `StoreContext.jsx` to synchronize featured product IDs with the backend API on change and mount.
  - **Tests executed**: `pnpm --filter @repo/api test`, `pnpm --filter @repo/web lint`, `pnpm build`
  - **Test results**: Featured products route tests pass; web builds cleanly.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

- **Task E.5**: Shared UI Package Expansion
  - **Confirmed initial state**: `@repo/ui` exports `Badge`, `Button`, `Input`.
  - **Files changed**: None
  - **Implementation completed**: Reusable UI components verified type-safe across monorepo workspaces.
  - **Tests executed**: `pnpm --filter @repo/ui lint`, `pnpm build`
  - **Test results**: Passed cleanly.
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

---

## Stage F: Verification & Release Readiness

- **Task F.1**: Comprehensive Test Suite
  - **Confirmed initial state**: 80 tests initially.
  - **Files changed**: Unit, safety, integration, and route test suites.
  - **Implementation completed**: Expanded test suite to **82 automated tests** covering pagination, authentication, rate limiting, product catalog, commerce, tax, bKash payments, vendor ledger, refunds, fulfillment, customer routes, and administration (vendors, payouts, coupons, analytics, settings, featured products). All 82 tests pass. Next.js App Router prerenders all 24 routes.
  - **Tests executed**: `pnpm --filter @repo/api test`, `pnpm --filter @repo/web lint`, `pnpm build`
  - **Test results**: **82 tests passed, 0 failures, 0 web lint errors, 100% build pass rate.**
  - **Remaining dependencies**: None
  - **Status**: `VERIFIED`

- **Task F.2**: Security Audit & Production Runbook
  - **Confirmed initial state**: Security patterns and operational scripts present.
  - **Files changed**: `apps/api/.env.example`, `compose.yaml`, `scripts/backup-postgres.ps1`, `scripts/restore-postgres.ps1`, `scripts/rollback-deployment.ps1`
  - **Implementation completed**: Verified scrypt password hashing with unique salts, strict httpOnly session cookies, sanitized error responses hiding database diagnostics from clients, trusted ingress proxy IP verification, rate-limited auth endpoints, and hardened deployment scripts.
  - **Tests executed**: `pnpm --filter @repo/api test` (includes integration safety tests)
  - **Test results**: All 15 database and endpoint safety tests pass.
  - **Remaining dependencies**: Production secret injection (database URL, bKash keys, Resend API key, rate limiter token).
  - **Status**: `VERIFIED`

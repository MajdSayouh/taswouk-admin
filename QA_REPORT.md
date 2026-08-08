# Release-Gate QA Report

**Date:** 2026-06-01  
**Environment:** Local `npm run dev` → Vite proxy → `https://test.taswouk.com`  
**Scope:** Full route coverage, critical CRUD flows, build/lint, navigation/error handling

---

## Executive summary

**Recommendation: Ready with caveats**

The dashboard **builds and lints cleanly** (0 ESLint errors). Several **frontend regressions were fixed** during this pass. Full end-to-end verification still requires **manual login** with a real admin account against the test API (automated E2E is not configured).

---

## Baseline (automated)

| Check | Result | Notes |
|-------|--------|-------|
| `npm run build` | **Pass** | Chunk size warnings only (~2.6 MB JS) |
| `npm run lint` | **Pass** (0 errors, 33 warnings) | Warnings are mostly `react-hooks/set-state-in-effect` on table pagination/filter reset patterns |

---

## Fixes applied during QA

1. **False “network error” toasts on navigation** — [`apiClient.js`](src/services/apiClient.js): ignore aborted/cancelled requests; wire `AbortSignal` through list services/viewmodels (products, orders, stores, coupons, banners, sellers, admin users, points, malls/catalog already had signal).
2. **Points page `loading` DOM warning** — [`Button.jsx`](src/components/ui/Button.jsx): `loading` prop handled without passing to native DOM.
3. **Dashboard charts lint/runtime** — [`DashboardCharts.jsx`](src/components/dashboard/DashboardCharts.jsx): `ChartBlock` hoisted out of render.
4. **Vite config** — [`vite.config.js`](vite.config.js): `loadEnv` uses `import.meta.dirname`; ESLint node globals for config file.
5. **Malls list phone filter** — [`MallsListPage.jsx`](src/views/malls/MallsListPage.jsx): column filter wired (filter state existed but UI was missing).
6. **Retry on load errors** — mall catalog list + mall product assignments show Retry actions.
7. **Orders driver assign** — skip no-op when pending value equals saved driver ([`OrdersListPage.jsx`](src/views/orders/OrdersListPage.jsx)).
8. **Misc lint** — productVariants, FCM log string, eslint args `_` pattern.

---

## Route & navigation smoke (static + structural)

All routes in [`router.jsx`](src/app/router.jsx) map to existing page components. Nav in [`dashboardNav.js`](src/navigation/dashboardNav.js) matches wired routes (no dead sidebar links).

| Route | Page | Admin only | Status |
|-------|------|------------|--------|
| `/admin/login` | LoginPage | — | Structural OK |
| `/admin/dashboard` | DashboardPage | No | Structural OK |
| `/admin/orders` | OrdersListPage | No | Structural OK; includes mock orders helper |
| `/admin/drivers` | DriversListPage | No | Structural OK |
| `/admin/products` (+ create/edit/:id) | Products* | No | Structural OK |
| `/admin/categories` | CategoriesListPage | No | Structural OK |
| `/admin/stores` (+ create/edit) | Stores* | No | Structural OK |
| `/admin/coupons` (+ create/edit) | Coupons* | No | Structural OK |
| `/admin/banners` | BannersListPage | **Yes** | Structural OK |
| `/admin/points` | PointsSettingsPage | **Yes** | Structural OK |
| `/admin/users` | AdminUsersPage | **Yes** | Structural OK |
| `/admin/notifications` (+ broadcast/send) | Notifications* | **Yes** | Structural OK |
| `/admin/sellers` (+ create/edit) | Sellers* | **Yes** | Structural OK |
| `/admin/malls` (+ create/edit) | Malls* | **Yes** | Structural OK |
| `/admin/mall-catalog` (+ create/edit) | MallCatalog* | **Yes** | Structural OK |
| `/admin/profile` | AdminProfilePage | No | Structural OK |

**Not routed:** [`CustomersPage.jsx`](src/views/customers/CustomersPage.jsx) (mock data only) — not linked in nav/router; safe to ignore or remove later.

**Admin guard:** [`RequireAdmin.jsx`](src/components/auth/RequireAdmin.jsx) redirects non-admins to dashboard.

**Manual checks still needed:** browser back/forward, hard refresh on deep URLs, RTL (ar) vs LTR (en), mobile sidebar (`MobileNav`).

---

## Critical flows (code review + prior fixes)

| Area | Expected behavior | QA status |
|------|-------------------|-----------|
| **Products + variants** | PUT omits `price`/`is_offer`/`new_price` when variants exist | **Fixed** in `productWritePayload` + edit/create pages |
| **Product category on PUT** | May fail if API rejects `category_id` | **Caveat** — use `VITE_PRODUCT_UPDATE_OMIT_CATEGORY_ID=true` or save without category change |
| **Product images** | Upload/delete/set featured | Implemented; **manual verify** |
| **Orders** | List, modal, accept/cancel/assign | Implemented; mock orders merged in VM — **manual verify** with real orders |
| **Stores / sellers / coupons** | CRUD + toggles | Implemented; **manual verify** |
| **Categories** | Tree list + active toggle | Implemented; **manual verify** |
| **Malls / catalog** | CRUD, logo, images, category picker, assignments | Implemented; media URL normalization — **manual verify** |
| **Banners** | Image upload/replace | **manual verify** |
| **Points** | GET/PUT settings | **manual verify** |
| **Notifications** | List, broadcast, send to user | **manual verify** + FCM env keys for push |
| **FCM** | Foreground toasts | Requires `.env` Firebase keys + `public/firebase-messaging-sw.js` sync |
| **Auth** | Login, refresh token, 401 logout | Implemented in `apiClient` |

---

## Known API / environment blockers

1. **Product PUT + `category_id`** — backend may return `ProductUpdateSchema has no field "category"`; documented in `.env.example`.
2. **Variant pricing** — API rejects product-level pricing when variants exist; dashboard now omits those fields on save.
3. **FCM** — optional for go-live; dashboard works without it but no push toasts.
4. **Test API availability** — all flows depend on `https://test.taswouk.com` stability and admin credentials.

---

## Manual retest checklist (recommended before production)

Use an **admin** account on local dev:

- [ ] Login → dashboard loads charts without console errors
- [ ] Navigate all sidebar items quickly — **no** spurious network toasts
- [ ] Product with variants: edit variant price, save product — no 400 on PUT
- [ ] Product images: upload, set featured, delete
- [ ] Create mall + logo; create catalog item + images; assign to mall
- [ ] Orders: open detail, assign driver (if data exists)
- [ ] Points: change rate, save
- [ ] Switch language AR ↔ EN — layout RTL, labels present
- [ ] Logout / expired session handling

---

## Go-live recommendation

| Verdict | Detail |
|---------|--------|
| **Ready with caveats** | Code quality gate passes (build + lint). Major navigation/toast/variant issues addressed. Confirm **manual checklist** on test API with production-like admin user; confirm **env** (API URL, optional Firebase, category PUT workaround). |

**Not ready** if: test API blocks category updates you need, or critical flows fail in manual checklist above.

---

## Next steps (optional)

- Add **Playwright** smoke tests: login, nav all routes, product edit with variants.
- Code-split large bundles to reduce initial load.
- Remove or wire **Customers** page if product owners want it.

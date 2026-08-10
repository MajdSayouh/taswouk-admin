# Admin → Public Endpoint Gap Audit

> Full audit across every resource with a create/edit flow in the admin dashboard: does creating
> something via the admin side make it correctly visible on the public-facing side (app/website)?
> Not yet committed/pushed — investigation only per current instruction.

## Summary table

| Resource | Public read endpoint exists in this codebase? | Visibility gate field(s) | Set at create time? | Create-time UI control? |
|---|---|---|---|---|
| **Stores** | Yes — `/api/stores/public`, `/api/stores/public/{id}` | `is_active` | ❌ No — absent from `adminCreateStore` payload | ❌ No — only via `toggleStoreActive` after creation |
| **Products** | Yes — `/api/products/public`, `/api/products/public/search` | `is_active` | ✅ Yes — `buildProductCreatePayload` always sends it (defaults `true`) | ✅ Implicit (form defaults active) |
| **Malls (moll)** | ❌ **None found anywhere in this codebase** | `is_active` | ❌ No — absent from `buildMallCreatePayload` | ❌ No — only via `toggleMallActive` after creation |
| **Mall Catalog Products** | ❌ **None found anywhere in this codebase** | `is_active` | ❌ No — absent from create payload | ❌ No — no dedicated toggle fn either; must PUT a full update |
| **Categories** | ❌ None (admin returns full tree incl. inactive; filtering pushed to consumer/BFF) | `is_active` | ✅ Yes, explicit `Switch`, default `true` | ✅ Yes |
| **Mall Categories** | ❌ None | `is_active` | ✅ Yes, explicit `Switch`, default `true` | ✅ Yes (+ separate quick-toggle in list) |
| **Coupons** | ❌ None (a `validate` endpoint exists but isn't a listing) | `is_active`, `expires_at` (no start-date field) | ✅ Yes, explicit `Switch`, default `true` | ✅ Yes |
| **Progressive Coupons** | ❌ None ("admin endpoints only" per file header) | `is_active` | ❌ **No** — create payload is only `{code, tiers}` | ❌ **No** — no toggle anywhere on the create page |
| **Banners** | ❌ None | **No gate field exists at all** in this codebase (no `is_active`/`status`/`order`/`priority`) | N/A | N/A |
| **External Shops** | ❌ None (all `/api/external-shops/` — no `/public`) | `is_active`, `requires_vpn` | ✅ Yes, explicit `Switch`, default `true` | ✅ Yes |

---

## The pattern

Two distinct problems, cutting across different resources:

### Problem A — "silent inactive default" (Stores, Malls, Mall Catalog Products, Progressive Coupons)

The admin create payload never sends the visibility field at all, relying entirely on whatever the
backend defaults it to. The client-side models for Stores/Malls/Mall-Catalog all default their
empty-state `isActive` to `false` (`Store.js:33`, `Mall.js:44`, `MallCatalogProduct.js:33`), which
is a strong (not certain) signal the backend also defaults new rows to inactive — matching exactly
the store-creation symptom that started this investigation. There's no create-time toggle for any
of these four; activation is a separate step (a list/edit-page toggle for Stores/Malls, and for
Mall Catalog Products and Progressive Coupons, not even that — a full PUT/PATCH is required, with
no dedicated one-click toggle function in the service layer at all).

**Fix:** add the missing `is_active` field to each create payload (default `true`, matching every
other resource in this system), and surface it as a `Switch` on the create form — exactly the
pattern already used correctly for Categories/Mall Categories/Coupons/External Shops. For Mall
Catalog Products and Progressive Coupons, also add a dedicated one-click toggle function/endpoint
call so post-creation activation doesn't require a full update payload.

### Problem B — no public endpoint wired up at all (Malls, Mall Catalog, Categories, Mall Categories, Coupons, Progressive Coupons, Banners, External Shops)

Only Stores and Products have an actual `/public` service function in this codebase. Everything
else either has no public endpoint on the backend at all (plausible for admin-only config like
Progressive Coupons/External Shops), or the backend does have one but this frontend was never
wired to call it (plausible for Malls/Mall Catalog/Banners — resources that clearly have real
customer-facing counterparts on the actual site/app).

**This can't be fixed from the frontend alone** — it needs backend confirmation of which of these
actually have (or should have) a public endpoint, same as the pagination/schema asks from earlier.
Candidates worth asking about, in likely order of relevance to an actual customer-facing gap:
1. `GET /api/malls/public` (or similar) — malls clearly need to be publicly listable
2. `GET /api/malls/products/public` — mall catalog products likewise
3. Banner ordering/visibility fields, if a public banner feed exists separately from `/api/banners/`

---

## Recommended next step

Two independent tracks, can be done in either order:

1. **Frontend fix (safe, no backend dependency):** add `is_active: true` default to the four
   silent-default create payloads (Stores, Malls, Mall Catalog Products, Progressive Coupons) and
   expose the toggle in each create form — closes Problem A entirely without needing anything from
   backend.
2. **Backend ask (needs their confirmation):** which resources have a public endpoint at all, and
   what its exact path/shape is, for Malls, Mall Catalog, Categories, Mall Categories, Coupons,
   Progressive Coupons, Banners, External Shops.

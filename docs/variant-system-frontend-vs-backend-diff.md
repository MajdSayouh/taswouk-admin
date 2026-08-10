# Variant System — Frontend vs Backend Doc: Comparison & Fixes

> Compares `docs/product-and-variant-creation-process.md` (what the frontend currently does)
> against the backend team's `variant-system-backend.md` contract doc. Confirms matches,
> flags real discrepancies, and recommends a fix for each.

## ✅ Confirmed matches — no action needed

| Area | Frontend behavior | Backend contract | Verdict |
|---|---|---|---|
| Attribute field names on **write** | Sends `{ key, key_ar?, value_en, value_ar?, sort_order? }` | Expects exactly this on POST/PATCH | ✅ Matches |
| Attribute field names on **read** | Reads `attribute_key ?? key` (accepts either) | Server always returns `attribute_key`/`attribute_key_ar` | ✅ Matches (frontend already hedges correctly) |
| `status` omitted on create | Never sent on `POST .../variants` | Server defaults to `active`, ignores/doesn't expect it | ✅ Matches |
| Variant list is unpaginated | Fetches with no `page`/`page_size` | Variant endpoints return the full list, no pagination | ✅ Matches |
| Empty-string vs null handling | `firstNonEmpty()` helper treats `""` as absent | Server sends `""` not `null` for unset translated fields | ✅ Matches (frontend already defends against this) |
| PATCH is partial except `attributes` | *(see below — this is actually a gap, not a match)* | | ⚠️ See discrepancy #1 |

---

## ⚠️ Real discrepancies — need a frontend fix

### 1. `PATCH .../variants/{id}` with `attributes` **fully replaces** them — confirmed, and it's more permissive than we assumed

**Backend says:** attributes *can* be changed on an existing variant via PATCH — but only as a **full replace** (send the complete array, not a diff). This directly answers open question #2 from our doc.

**Frontend currently:** locks color/size/custom-attribute editing entirely once a variant has a `variantId` (`lockExistingAttributes` in `ProductVariantsInlineSection.jsx`) — based on an assumption that attributes are immutable post-creation. **That assumption was wrong** — they're mutable, just not partially.

**Fix:** unlock attribute editing for existing variants, and when submitting a PATCH that changes any attribute, always send the **full current `attributes[]` array** for that variant (not just the changed one). This is a real feature gain — admins can currently fix a typo'd color/size only by deleting and recreating the variant (losing its images/sku history in the process); this removes that friction.

---

### 2. Variant images — we're using the wrong endpoint entirely

**Backend says (§2.5):** a dedicated endpoint exists:
```
POST /api/products/{product_id}/variants/{variant_id}/images   (field name: images)
POST /api/malls/me/products/{product_id}/variants/{variant_id}/images   (field name: files)
```

**Frontend currently does (`resolveVariantRowImagePaths` in `productService.js:457`):** uploads new variant image files through the **product-level** images endpoint (`POST /api/products/{id}/images`), then does a `GET /api/products/{id}` **before and after** to diff the image list and guess which paths are new, then attaches those paths to the variant payload.

This was a workaround built without knowing the dedicated endpoint existed. It's fragile (relies on list-diffing, breaks if two uploads race) and does unnecessary extra round-trips.

**Fix:** switch to the dedicated endpoint. Concretely:
- New service functions: `uploadProductVariantImages(productId, variantId, files, { featuredIndex })`, `setFeaturedProductVariantImage(...)`, `deleteProductVariantImage(...)`.
- Drop `resolveVariantRowImagePaths`'s diff logic entirely.
- Store-only for now (mall variant CRUD isn't wired into this dashboard's product flow at all — see gap #4 below).

---

### 3. `out_of_stock` is exposed as a manually-selectable status — it shouldn't be

**Backend says (§5.1):** `out_of_stock` is **server-managed automatically** based on `stock_quantity` reaching 0. The client should never send it in a PATCH — only `active`/`inactive` are ever admin-set.

**Frontend currently:** the variant status `<Select>` in `ProductVariantsInlineSection.jsx` offers `out_of_stock` as a pickable option alongside `active`/`inactive` (`VARIANT_STATUS_VALUES.map(...)`), and nothing stops an admin from selecting it and having it PATCHed to the server.

**Fix:** keep `out_of_stock` as a **read-only display state** (still show it as a tag/badge when the server reports it), but remove it from the editable `<Select>` options — only `active`/`inactive` should be choosable. Setting stock to 0 is what should trigger it, not a manual toggle.

---

## 🆕 New capability the backend doc reveals that we don't use at all

### 4. Mall/moll product variants exist on the backend — this dashboard's mall-catalog flow has no variant support

The backend doc (§3) describes a full variant system for `MollProduct` via `/api/malls/me/products/{id}/variants` — same shape as store variants, just scoped by `/me/`.

**Current dashboard state:** the mall-catalog admin pages (`MallCatalogEditPage`, `mallCatalogService.js`) manage `name`/`description`/`category_id`/`is_active` only — **no price, no variants, no per-mall stock**. Per-mall pricing is instead handled by a completely separate mechanism (the mall **product-assignment** endpoints, `PUT /api/malls/{moll_id}/products/{product_id}`, one flat price per mall).

This means: **grocery/mall products in this dashboard cannot have variants (sizes, weights, etc.) at all right now**, even though the backend supports it. That's likely relevant to your flexibility question below, if any of the "multiple products" you're trying to make entry more flexible for are mall/grocery products with size or weight options.

---

## Still open (not covered by this backend doc, needs separate confirmation)

These were flagged in the original frontend doc and this backend doc doesn't address them (it's variant-scoped, not product-scoped):
- Is `category_id` truly required at the backend schema level for `Product`/`MollProduct`, or is that a frontend-only restriction?
- Is `store_id` truly required, or could a product exist unassigned/draft?
- Video upload field name (`video` vs `file`) — unrelated to variants, still unresolved.

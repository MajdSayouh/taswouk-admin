# Product Creation & Variant Management — Frontend Process Doc

> Written from the current frontend implementation (`src/views/products/`, `src/services/productService.js`,
> `src/utils/productWritePayload.js`, `src/utils/productVariants.js`) to compare against the backend API doc.

## 1. Overview

Products and their variants are **not created in a single API call**. Creating a product with images, a
video, and variants is a *sequence* of several independent requests. If any later step fails, earlier steps
are **not rolled back** (the product/images already created stay created) — this matters for how the
backend should think about partial-failure states.

---

## 2. Product Create — full sequence

**Step 0 — Client-side gating (nothing sent to API yet):**
- `store_id` required — if missing, the form silently blocks submission (no error message shown).
- `category_id` required — if missing, blocks with an explicit error.
- `name` required (HTML5 required).
- `price` required **unless** the product has variants (variants own pricing in that case).

**Step 1 — Create the product**
```
POST /api/products/
```
Payload (only these keys are ever sent — everything else is stripped client-side):

| Field | Type | Notes |
|---|---|---|
| `store_id` | number | required |
| `name` | string | required, trimmed |
| `category_id` | number | required. See §5 — this is actually whichever is more specific, subcategory or category |
| `size` | string[] | optional, from comma-separated free-text input |
| `colors` | string[] | optional, hex codes like `#RRGGBB` |
| `description` | string \| null | HTML from rich text editor; `null` if empty |
| `price` | number | **omitted entirely if the product has variants** — pricing becomes variant-owned |
| `is_offer` | boolean | same omission rule as `price` |
| `new_price` | number \| null | same omission rule as `price` |
| `is_active` | boolean | defaults to `true` |

**Step 2 — Upload images (only if files were picked)**
```
POST /api/products/{id}/images
```
- Multipart, field name `images` (multi-file).
- If exactly **1** file was picked, `?featured_index=0` is sent so it's auto-marked featured. For 2+ files,
  no auto-featured is set — admin must set one explicitly afterward.
- **Failure here does not block the flow** — it's surfaced as a warning, product still gets created.

**Step 3 — Upload video (only if a file was picked)**
```
POST /api/products/{id}/videos
```
- Multipart, field name `video` (client retries with field name `file` if the backend responds 400/422 —
  i.e. we're not 100% sure which field name is correct and hedge both).
- Client validates `file.type` starts with `video/` before sending.
- Failure is a warning only, non-blocking.

**Step 4 — Create variants (only if variant rows exist), looped one at a time**

For each variant row:
```
POST /api/products/{id}/images     ← only if the row has NEW image files (see §6)
POST /api/products/{id}/variants
PATCH /api/products/{id}/variants/{variantId}   ← only if the created variant's default status differs from what the row wants
```
If any variant creation fails partway through the loop, the flow **navigates to the edit page** instead of
the list — so partial variant sets are expected to be recoverable from Edit.

---

## 3. Product Edit — full sequence

**Step 0 — Client-side gating:**
- `category_id` required.
- Same variant validation as create (§7), plus: if the product has any variants at all, **at least one must
  remain active** after the edit — enforced client-side, and also specifically handled if the backend
  rejects deleting/deactivating the last active variant.

**Step 1 — Replace "legacy standard" variants, if any exist**

Older products may have a placeholder variant with attribute value literally `"ستاندر"`/`"standard"`. The
moment the admin adds a real color/size to the product, that placeholder is replaced:
```
PATCH /api/products/{id}/variants/{id}   { "status": "inactive" }
DELETE /api/products/{id}/variants/{id}
```
...followed by creating a real replacement variant in Step 5.

**Step 2 — Update the product**
```
PUT /api/products/{id}
```
- Same field whitelist as create, but **nullable/partial**: blank `name` → `null`, blank `price` → `null`,
  and any field that's `null`/`undefined` is **stripped from the payload entirely** — so PUT only ever sends
  fields that actually have a value or an explicit intentional clear.
- `category_id` is **omitted from the payload if it's unchanged from the product's original category** —
  this works around a backend quirk where re-sending the same `category_id` was triggering a legacy
  `category` field to appear in the response/validation.
- If the backend rejects the request because pricing is variant-managed, the client **automatically retries
  once**, this time explicitly stripping `price`/`is_offer`/`new_price` from the payload.

**Step 3 — Upload new images** (same as create Step 2, warning-only on failure)

**Step 4 — Upload new video** (same as create Step 3, warning-only on failure)

**Step 5 — Sync variants**, in this specific order (order matters — see note below):
1. **Create** all new rows (no existing `variantId`) → `POST /api/products/{id}/variants`
2. **Update** all *active* rows that changed → `PATCH /api/products/{id}/variants/{id}`
3. **Delete** rows that existed on load but are no longer present → `DELETE /api/products/{id}/variants/{id}`
4. **Update** all *non-active* (inactive/out-of-stock) rows that changed →
   `PATCH /api/products/{id}/variants/{id}`

> **Why this order:** new/active variants are created and updated *before* anything is deleted or
> deactivated, so the product never transiently has zero active variants mid-save (which the backend
> apparently rejects — "cannot delete the last active variant").

---

## 4. Variant fields

Each variant row, sent as `VariantCreateSchema` (POST) or `VariantUpdateSchema` (PATCH):

| Field | Type | Notes |
|---|---|---|
| `price` | number | required per row, min `0.01` |
| `sku` | string | optional |
| `compare_price` | number | only sent/relevant when `is_offer` is true |
| `is_offer` | boolean | optional |
| `stock_quantity` | number | optional, min `0` |
| `status` | `active` \| `inactive` \| `out_of_stock` | |
| `attributes` | array of `{ key, key_ar?, value_en, value_ar?, sort_order? }` | see below |
| `images` | string[] (storage paths) | see §6 — no dedicated variant-image upload endpoint exists |

**`attributes[]` composition:**
- `color` and `size` (if the row has them) become two attribute entries.
- Plus any number of **custom attributes** (free-form name/value pairs — e.g. weight, material), validated
  client-side: key must match `^[\p{L}][\p{L}\p{N}_]*$` (starts with a letter, then letters/digits/
  underscore), no duplicate keys, no empty values.

**Existing variants (edit only) — locked fields:** once a variant has a `variantId` from the server, its
color/size/custom-attribute *keys* become **read-only in the UI** — only price/stock/status/images/
compare_price are editable. This reflects an assumption that attributes identify the variant and shouldn't
be mutated after creation. **Worth confirming with backend whether that's actually a hard constraint** or
just a frontend-side caution — if the API does allow attribute updates on existing variants, we may be
being overly conservative here.

---

## 5. Category resolution — a subtlety worth flagging

The UI shows two selects: "Category" (parent) and "Subcategory". Only **one** `category_id` is ever sent to
the API, resolved by this priority:

```
subCategoryId → sub_category_id → categoryId → category_id → (numeric) category
```

In other words: if a subcategory is picked, **that's** the `category_id` sent — the parent "Category"
select is purely a UI filter to narrow the subcategory list, not a value that reaches the API on its own.
Worth confirming this matches how the backend's category tree actually works (i.e. that leaf-level category
ids are what `products.category_id` should reference).

---

## 6. Images & video — how uploads actually work

- **Product images:** `POST /api/products/{id}/images`, multipart, field name `images`, supports multiple
  files per request.
- **Featured image:** either set at upload time via `?featured_index=N` (only auto-applied when uploading
  exactly 1 image), or afterward via `PATCH /api/products/{id}/images/{imageId}/set-featured`.
- **Delete image:** `DELETE /api/products/{id}/images/{imageId}`.
- **Variant images — important gap:** there is **no dedicated variant-image upload endpoint** in what the
  frontend currently calls. New variant image files are uploaded through the **product**-level images
  endpoint, then the client does a `GET /api/products/{id}` **before and after** the upload and diffs the
  image list to figure out which storage paths are new — those paths are then attached to the variant's
  `images` field on create/update. This is fragile (relies on list ordering/diffing, not a direct response
  mapping) — **if the backend has (or could add) a proper variant-image upload endpoint that returns the new
  image path(s) directly, that would be a meaningful improvement over the current diffing approach.**
- **Video:** `POST /api/products/{id}/videos`, multipart. Field name `video` is tried first; if the backend
  responds 400/422, the client retries once with field name `file` instead — **this ambiguity should be
  resolved and confirmed with backend as one specific field name.**

---

## 7. Full validation rule list (client-side, before any request fires)

- `store_id` required (create only; product's store is locked/uneditable on edit).
- `category_id` required (create + edit).
- `name` required.
- `price` required unless the product has variants.
- Per variant row:
  - Any row with color/size/custom-attribute content but no price is blocked, **unless** a base product
    price exists to auto-fill it.
  - Duplicate `color + size + customAttributes` combination across rows is blocked.
  - `is_offer = true` with no valid `compare_price` is blocked.
  - Custom attribute key format/uniqueness enforced (see §4).
- Edit only: after all changes, at least one variant must remain `active` if the product has any variants.
- Video file type must start with `video/`.

---

## Open questions to settle with the backend doc

1. **Category id**: does `products.category_id` always reference the deepest/leaf category (subcategory),
   never the parent? (§5)
2. **Variant attribute mutability**: can `attributes` actually be changed on an existing variant via PATCH,
   or is that genuinely locked once created? (§4)
3. **Video upload field name**: is it `video` or `file`? Frontend currently guesses both. (§6)
4. **Dedicated variant-image endpoint**: does one exist (or could one be added) instead of the current
   upload-then-diff-the-product-images approach? (§6)
5. **"Last active variant" rule**: is it a real backend-enforced invariant (a product with variants can't
   have zero active ones), or just something the frontend assumed? (§3 Step 5)

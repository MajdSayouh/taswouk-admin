# Bug report: product/variant offer & pricing issues

This report covers three related issues found while working on offer/pricing
UX in the admin dashboard.

---

# Issue 1: variant `compare_price` not clearing on offer removal

## Summary

When the dashboard PATCHes a product variant with `is_offer: false` and
`compare_price: null` (to remove an existing offer), the save fails with:

> "يجب أن يكون سعر المقارنة أكبر من السعر"
> ("compare price must be greater than price")

This happens even though the offer is being turned **off**, not on.

## Confirmed on the frontend side

We traced every code path in the dashboard that can save a variant after its
offer is turned off (the inline variants table on the product edit page, the
separate variants quick-edit modal, and the legacy-variant migration
service — 7 call sites total). All of them build the update payload through
the same two helpers, and every one sends an **explicit** `compare_price: null`,
never an omitted or `undefined` field that could get silently dropped in
transit. No hidden bulk-save endpoint bypasses this. So the request body
reaching the API does contain `compare_price: null`.

## What we need from the backend

Please check the variant PATCH handler:
`PATCH /api/products/{product_id}/variants/{variant_id}`

1. Does it distinguish an **explicitly supplied `null`** for `compare_price`
   from the field being **omitted**? A common bug in partial-update
   serializers is treating both the same way ("not provided, keep existing
   value"), so an explicit `null` never actually clears the column.
2. When `compare_price` is `null` (or `is_offer` is `false`), the
   `compare_price > price` validation should be **skipped entirely** — that
   rule should only apply while an offer is actually active, not to a
   cleared/absent value.
3. Please confirm the update actually saves `compare_price` as `NULL` in the
   database when we send `compare_price: null`, not left at its previous
   value.

## Suspected root cause

Likely sequence:

1. Before: `price = 80` (discounted charge), `compare_price = 100` (regular
   reference price) — offer on.
2. User turns the offer off in the dashboard → request now sends
   `price: 100, compare_price: null, is_offer: false`.
3. If the backend ignores `compare_price: null` on partial update and keeps
   the old `100`, the stored row ends up with `price: 100, compare_price: 100`
   (unchanged) — and the `compare_price > price` validation now fails on a
   value the dashboard never intended to keep.

## Reproduction steps

1. Open a product that has at least one variant with an active offer
   (`is_offer: true`, `compare_price` set).
2. In the dashboard, turn that variant's offer off.
3. Save.
4. Observe the error: "compare price must be greater than price".

---

# Issue 2: product-level `is_offer` cannot be turned off once the product has variants

## Summary

`PUT /api/products/{id}` appears to **reject** the `is_offer` (and `price`,
`new_price`) fields entirely once a product has variants — the dashboard has
a fallback that specifically catches an error containing the phrase
"pricing is managed by variants" and retries the request with those fields
stripped out. That means, for a product that has variants, the product's own
`is_offer` flag can never be changed again via this endpoint — it is
effectively frozen at whatever value it had before variants were added.

This produces a confusing admin experience: an admin can toggle "on offer"
off for such a product in the dashboard, the save appears to succeed (no
error, because the field is silently dropped from the retry), but the
product's `is_offer` never actually changes server-side, so the product still
shows as "on offer" everywhere that reads the raw product record.

## What we need from the backend / to confirm

1. Please confirm: is `is_offer` (product-level) intentionally immutable via
   `PUT /api/products/{id}` once the product has variants? If so, please
   document the exact error/response shape so the dashboard can show a clear
   message instead of silently dropping the field.
2. If it's intentional that offers are meant to be managed per-variant once
   variants exist, is there a canonical way for a client to determine
   "is this product effectively on offer" — e.g. should clients compute it
   by checking `is_offer` across the product's variants, since the top-level
   field can no longer be trusted for such products? Please confirm this is
   the right approach, or provide an aggregate field/endpoint if one exists.
3. If this behavior is *not* intentional, please allow product-level
   `is_offer` to be updated (turned off, at minimum) even when the product
   has variants, since that's a legitimate cleanup operation admins need to
   perform.

## Workaround already applied on the dashboard side

Since this could not be fixed purely on the frontend, the product detail page
now computes "is this product on offer" from its variants' own `is_offer`
flags when the product has variants, instead of trusting the frozen
product-level field. This is a display-only workaround — it does not change
what's stored server-side, and other consumers of the product API (storefront,
other integrations) may still show stale offer state.

---

# Issue 3: duplicate variants created for the same color/size (product id 22700) — FIXED on the dashboard, data cleanup needed

## Summary

Product id `22700`'s variant list shows, for every color/size combination
(e.g. Sky Blue/S, Sky Blue/M, …), **two separate variant records**:
- The original, correct one: proper stock quantity (e.g. 10,000) and images attached.
- A second, bogus one: stock quantity `1`, no images, same price.

These are genuinely distinct variant rows in the database (different stock,
different image counts) — not a display-only duplicate.

## Root cause — found and fixed on the dashboard side

This was caused by a bug in the dashboard's edit page, not a data issue on
arrival. Sequence:

1. The edit page fetches the product's existing variants via
   `GET /api/products/{id}/variants`.
2. If that request ever failed (rate limiting, a transient network/500 error,
   etc.), the dashboard **silently treated the product as if it had zero
   existing variants** instead of showing an error — no warning was shown to
   the admin, and the page behaved as normal.
3. If the admin then saved the product, the save flow — believing there were
   no existing variants — **recreated a brand-new variant for every declared
   color/size combination**, defaulting price from the product's base price,
   stock quantity to `1` (a deliberate fallback so new variants aren't
   accidentally created out-of-stock), and no images (none were attached to
   the new rows).
4. The *original* variants were never touched or deleted, because the
   "which variants to delete" diff was also computed from the same
   (incorrectly empty) list — so they remained untouched, stock intact.

Net effect: every color/size combo ends up with the original good variant
plus a new placeholder variant (stock 1, no images) sitting alongside it.

## Fix applied on the dashboard

The edit page no longer falls back to "zero variants" on a failed fetch. It
now blocks saving entirely and shows a retry prompt until the existing
variants load successfully, so this specific failure mode can't recreate
variants anymore going forward.

## What we need from the backend / ops

This bug already produced bad data for at least product `22700`, and
possibly other products edited during a similar transient failure window.
We can't clean this up from the dashboard reliably (telling the "real" variant
apart from the "bogus" one by stock=1/no-images is a heuristic, not a
guarantee) — could you help with:

1. A way to identify other products with this same pattern — e.g. multiple
   variants sharing the same color/size/options combination, where one has
   `stock_quantity = 1`, no images, and a creation timestamp that doesn't
   match the "batch" the rest of the product's variants were created in.
2. Advice/support on safely deleting the bogus rows for `22700` and any other
   affected products (ideally via a script against variant `created_at`
   timestamps and the stock=1/no-images signature, since there could be many).
3. If `GET /api/products/{id}/variants` has any known transient-failure modes
   (rate limiting under load, timeouts) that could explain why this repro'd
   for `22700` specifically — that context would help us judge how many other
   products might be affected.

## Reproduction steps (historical — now blocked on the dashboard)

1. Open a product with existing variants for edit.
2. `GET /api/products/{id}/variants` fails (e.g. due to rate limiting).
3. Save the product without noticing anything was wrong (no error was shown).
4. Every color/size combo now has an extra stock=1, no-image variant
   alongside the original.

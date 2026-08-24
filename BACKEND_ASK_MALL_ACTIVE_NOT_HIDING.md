# Disabling a mall in the dashboard doesn't hide it for customers

**Reported:** 2026-08-24 · **Status:** confirmed dashboard-side is correct; needs backend input on
the public/customer side.

## Symptom

Admin disables a mall from the dashboard (Malls list → Active switch, or Mall edit page → Active
switch). The dashboard shows it as inactive immediately and consistently on reload. The mall still
shows up wherever customers browse malls (app/website) — it should disappear from there, the same
way an inactive Store or Product already does.

## How the dashboard does this today (confirmed correct — nothing to fix on our side here)

Toggling from the Malls list calls exactly this, matching `Malls / mall_api_toggle_moll_active` in
the API docs:

```
PATCH /api/malls/{moll_id}/toggle-active
```

No request body — this is a pure flip of whatever `is_active` currently is. Implementation:
[`src/services/mallService.js`](src/services/mallService.js#L94-L100).

Editing a mall's "Active" switch and saving does the same thing via the general update instead:

```
PUT /api/malls/{moll_id}
{ ..., "is_active": true | false, ... }
```

Implementation: [`src/models/Mall.js`](src/models/Mall.js) (`buildMallUpdatePayload`),
[`src/views/malls/MallEditPage.jsx`](src/views/malls/MallEditPage.jsx).

After either call succeeds, the dashboard invalidates and refetches:

```
GET /api/malls/
```

and re-renders the list from that response — so what the admin sees after toggling is exactly
what `GET /api/malls/` currently returns for that mall's `is_active` field, not a locally-cached
guess. We use this as our source of truth that the toggle reached the database: the switch stays
in its new position after a full page reload, and `GET /api/malls/{moll_id}` shows the same
`is_active` value directly.

**In short: the admin side of this (the write, and reading it back through the admin API) is
verified working.** The gap is downstream of that.

## The actual gap

This dashboard has no code path to whatever endpoint the customer-facing app/website calls to list
malls — there is no `/api/malls/public` (or similarly named) function anywhere in this frontend,
unlike Stores (`/api/stores/public`) and Products (`/api/products/public`), which both exist and
are wired up. This was already flagged independently in an earlier audit of this codebase —
see [`docs/admin-public-endpoint-gap-audit.md`](docs/admin-public-endpoint-gap-audit.md), "Malls"
row and "Problem B".

So we can't tell from the frontend whether:
- there's a dedicated public malls endpoint that simply isn't filtering `is_active`, or
- the customer app is reading malls from somewhere that was never scoped to only active ones, or
- something else entirely on that side.

## What we need from backend

1. **Which endpoint does the customer-facing app/website actually call to list/show malls?**
2. **Does that endpoint filter on `is_active`?** If not, that's the fix — same filter Stores/Products
   already apply on their `/public` endpoints.
3. If a dedicated public malls endpoint doesn't exist yet, we'd want one (mirroring
   `/api/stores/public`) so this dashboard can also wire up mall browsing correctly wherever it's
   needed later.

Happy to re-test immediately once you confirm the endpoint/fix — same as the variant-attribute-key
and local-first-store-ordering rounds.

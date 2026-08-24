# Disabled malls still showing in the mobile app — needs a mobile-side check

**Reported:** 2026-08-24 · **From:** admin dashboard team · **Backend team's read:** the write/read
on the API side is correct — this looks like it's on the mobile app's side. Agreed, based on what's
below; this doc is the handoff to confirm and fix it there.

**Update (2026-08-24, same day):** confirmed — **the website already hides a disabled mall
correctly.** Only the mobile app doesn't.

**Update 2 (2026-08-24, same day) — confirmed which endpoint mobile calls, and it's already
correct:** mobile calls `GET https://test.taswouk.com/api/malls/public` — this is
`Malls / mall_api_list_public_malls` in the docs, documented as "قائمة المولات النشطة (عام)" (list
of **active** malls, public, no auth, no filter params). Called it live just now:

```
$ curl https://test.taswouk.com/api/malls/public
```
→ 8 malls returned, **every one `is_active: true`**. Mall id `4` is absent from the otherwise
consecutive id sequence (1,2,3,5,6,7,8,9) — consistent with an inactive mall being correctly
excluded.

**This settles it: the endpoint mobile is already using is confirmed working correctly, right now,
in production data.** There is nothing to fix on the backend for this specific symptom, and nothing
to fix in this dashboard — the write (toggle) and now the exact read mobile performs are both
verified correct. The remaining gap is 100% inside the mobile app's handling of that response.

**Update 3 (2026-08-24, same day) — second, independent confirmation, plus the actual reason the
website gets this right:** the website team's own integration doc
(`MALLS_INTEGRATION_FOR_ADMIN.md`) confirms the same thing from their side — their `is_active` row
says every mall they've ever received from `GET /api/malls/public` had `is_active: true`. So this
is now confirmed twice, independently, by two different people. More importantly, their doc
explains *why the website never shows a stale mall*: their SSR pages `revalidate = 60` seconds, and
their client-rendered pages fetch through a proxy on every request — there is no long-lived client
cache on the website at all. A just-disabled mall disappears there within, at most, a minute.

**That is the concrete thing to compare mobile against.** Not "does mobile call the right
endpoint" in the abstract — check specifically: how long does mobile hold onto a fetched malls list
before re-asking the server? If the answer is "until the app is killed" or "forever," that's the
bug, full stop.

## What's confirmed working (admin/API side)

Disabling a mall from the admin dashboard does reach the database correctly:

- Toggling a mall's Active switch calls `PATCH /api/malls/{moll_id}/toggle-active` (no body — flips
  `is_active`), or saving the edit form's Active switch calls `PUT /api/malls/{moll_id}` with
  `is_active: false`.
- Immediately after, `GET /api/malls/{moll_id}` (and the admin list `GET /api/malls/`) reflects
  `is_active: false` — verified by refetching from the server, not a locally cached guess, and the
  state survives a full page reload.

So by the time the mall is "disabled" in admin, the backend record genuinely has `is_active: false`.
The question is purely: **what does the mobile app do with that.**

## What to check on the mobile side

0. **The decisive test — do this first, it'll likely be the whole answer:**
   1. Disable a mall in the dashboard that's currently showing in the app. Note its id.
   2. Run `curl https://test.taswouk.com/api/malls/public` — confirm the id is gone (it will be;
      this is already verified working, see the update above).
   3. In the mobile app: **force-quit and reopen** (not background/resume), then check the malls
      list.
      - **Gone after force-quit** → cache/staleness bug. The app held an old response and didn't
        refetch `GET /api/malls/public` for that screen. Fix: refetch on screen focus / pull to
        refresh, or reduce/bust the cache TTL for this endpoint specifically.
      - **Still there even after force-quit** → the app either isn't calling this exact endpoint
        for that screen, or is calling it but rendering from a merged/stale local list instead of
        the fresh response. Fix: log/inspect the actual URL hit on that screen in a debug build,
        confirm it's byte-for-byte `https://test.taswouk.com/api/malls/public` and that the render
        path uses the response directly.

1. **If the browse-list screen turns out fine after the above, check every other place a mall can
   surface** — each may have its own call/cache and its own independent bug:
   - **Mall detail screen**, opened directly (deep link, favorites, recently-viewed, a `mall_id`
     embedded in a product/order) — does *that* screen also check `is_active` / handle a 404 from
     `GET /api/malls/public/{moll_id}`, or does it keep rendering whatever it last had cached?
     Removing a mall from the list but still letting it open directly is a common half-fix.
   - **Any "featured" / "nearby malls" widget** fed by a separate call, or cached once at app
     start — easy to miss since it's not the main list screen most testing focuses on.

## Repro steps for verification

1. Pick a mall currently visible in the mobile app. Note its id/name.
2. In the admin dashboard, disable it (Malls list → Active switch off).
3. Run `curl https://test.taswouk.com/api/malls/public` — confirm the id is gone (already verified
   working as of this doc's last update).
4. In the mobile app: force-quit and reopen, then check every screen that surfaces malls — main
   list, detail (direct navigation), any featured/nearby widget.
5. Wherever it still appears, that's the specific screen/call needing the fix — per the decisive
   test above, it'll be a caching/refetch issue or a screen not calling `/api/malls/public` at all.

Happy to re-verify from the admin side as soon as a build with the fix is ready — same as the other
rounds on this project.

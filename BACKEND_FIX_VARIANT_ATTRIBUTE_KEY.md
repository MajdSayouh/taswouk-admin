
## Update (still broken after reported fix)

Re-tested via the dashboard on 2026-07-22 and got the **exact same error**, same
`ctx.pattern`, on:

```
POST http://localhost:5173/api/products/22454/variants   (proxies to https://v2.taswouk.com/api/products/22454/variants)
```

with this payload (captured from DevTools, confirmed byte-for-byte identical to what the
dashboard sends — nothing is mangled client-side):

```json
{
  "price": 9000,
  "compare_price": null,
  "sku": "sadjasdjjasd7",
  "is_offer": false,
  "attributes": [
    { "key": "color", "value_en": "#000000", "sort_order": 0 },
    { "key": "size", "value_en": "S", "sort_order": 1 },
    { "key": "الوسص", "value_en": "عههسي", "sort_order": 2 }
  ]
}
```

Response (unchanged from before):

```json
{
  "detail": [
    {
      "type": "string_pattern_mismatch",
      "loc": ["body", "payload", "attributes", 2, "key"],
      "msg": "String should match pattern '^[a-z][a-z0-9_]*$'",
      "ctx": { "pattern": "^[a-z][a-z0-9_]*$" }
    }
  ]
}
```

The `ctx.pattern` is still the exact old ASCII-only regex — if the fix described above had
actually been applied to the schema validating **this** endpoint, this error either
wouldn't occur, or would report a different pattern. Please check, in this order:

1. **Which schema class validates `POST /api/products/{id}/variants` specifically.**
   This is the *create* path (`VariantCreateSchema`, not `VariantUpdateSchema`) — confirm
   the fix was applied to the schema actually used here, not a sibling/update-only schema.
2. **Whether the app server process was restarted** after the fix was deployed (gunicorn/
   uwsgi workers can keep running old code in memory until restarted).
3. **Whether the fix was deployed to `v2.taswouk.com` specifically** — this is the exact
   host the dashboard's `.env` (`VITE_API_BASE_URL`) points at, confirmed via the dev
   proxy config, not a different/staging environment.

Reproduce independently of the dashboard (isolates browser vs. server):

```bash
curl -i -X POST 'https://v2.taswouk.com/api/products/22454/variants' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "price": 9000,
    "compare_price": null,
    "sku": "sadjasdjjasd7",
    "is_offer": false,
    "attributes": [
      { "key": "color", "value_en": "#000000", "sort_order": 0 },
      { "key": "size", "value_en": "S", "sort_order": 1 },
      { "key": "الوسص", "value_en": "عههسي", "sort_order": 2 }
    ]
  }'
```

If this still 422s with the same `ctx.pattern`, the fix has not actually reached this
endpoint/environment — please re-check server-side before sending it back to us.

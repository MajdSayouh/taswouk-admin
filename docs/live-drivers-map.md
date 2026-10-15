# خريطة عمال التوصيل الحية ومسار كل رحلة — ما يلزم في لوحة الإدارة

ميزتان للإدارة، والباكند لهما جاهز:

1. **خريطة حية** تعرض كل عمال التوصيل وأماكنهم الآن، طوال الوقت، سواء معهم طلب
   أو لا.
2. **مسار كل رحلة توصيل:** الطريق الذي سلكه السائق من استلام الطلب حتى تسليمه،
   مباشرةً أثناء الرحلة وكسجل بعدها.

كل ما يلزم موجود في المشروع: `leaflet` + `react-leaflet` + react-query
(`refetchInterval`). **لا حزم جديدة.**

> المواقع لا تكون "حية" فعلاً إلا بعد تحديث تطبيق التوصيل ليرسل موقعه في
> الخلفية (`taswouk_delivery/docs/live-location.md`). حتى ذلك الحين يُرسَل الموقع
> كل 30 ثانية والتطبيق مفتوح فقط، فستظهر مواقع كثيرة "منقطعة". هذا متوقع.

---

## 1. الـ API (Admin فقط، وغيره يأخذ 403)

### 1.1 كل السائقين الآن

```
GET /api/delivery/drivers/live
GET /api/delivery/drivers/live?only_located=true   ← فقط من أرسل موقعاً من قبل
```

```json
[
  {
    "driver_id": 12,
    "name": "علي محمد",
    "phone": "0933123456",
    "vehicle_type": "دراجة نارية",
    "is_available": true,
    "location": {
      "latitude": 34.7265, "longitude": 36.7130,
      "heading": 210.5,
      "updated_at": "2026-10-14T16:24:41+00:00",
      "seconds_since_update": 6,
      "is_stale": false
    },
    "on_the_road": true,
    "open_orders": [
      {
        "assignment_id": 88,
        "order_id": 1042,
        "order_kind": "store",
        "order_number": "C-1042",
        "status": "out_for_delivery",
        "picked_up_at": "2026-10-14T16:20:05+00:00",
        "destination": { "address_text": "حمص - الإنشاءات", "latitude": 34.7213, "longitude": 36.7101 }
      }
    ]
  }
]
```

- `location: null` = السائق لم يرسل موقعه أبداً.
- `is_stale` = آخر موقع أقدم من دقيقتين.
- `open_orders` = الطلبات المسندة إليه غير المنتهية (pending / confirmed /
  preparing / out_for_delivery).
- `on_the_road` = معه طلب واحد على الأقل في الطريق.
- **استدعِه كل 10–15 ثانية** والصفحة مفتوحة.

### 1.2 مسار رحلة واحدة

```
GET /api/delivery/assignments/{assignment_id}/route
```

```json
{
  "assignment_id": 88,
  "order_id": 1042, "order_kind": "store", "order_number": "C-1042",
  "status": "delivered",
  "picked_up_at": "2026-10-14T16:20:05+00:00",
  "delivered_at": "2026-10-14T16:31:40+00:00",
  "driver_id": 12, "driver_name": "علي محمد",
  "destination": { "address_text": "…", "latitude": 34.7213, "longitude": 36.7101 },
  "pickup": { "name": "متجر النور", "latitude": 34.7302, "longitude": 36.7155 },
  "points": [
    { "latitude": 34.7302, "longitude": 36.7155, "recorded_at": "2026-10-14T16:20:09+00:00" },
    { "latitude": 34.7290, "longitude": 36.7149, "recorded_at": "2026-10-14T16:20:31+00:00" }
  ]
}
```

- يعمل في أي وقت: أثناء الرحلة (يكبر مع الوقت) وبعدها.
- `points` الأقدم أولاً، حتى 300 نقطة (الرحلة الأطول تُخفَّف بالتساوي).
- `pickup` قد يكون `null` إن لم يحدد المتجر موقعه.
- `assignment_id` موجود في كل صف من `GET /api/delivery/assignments` الذي تستعمله
  اللوحة الآن (`orderService.js:37`).
- **الاحتفاظ:** النقاط تُحذف بعد 90 يوماً (`TRACK_POINT_RETENTION_DAYS`)، فرحلة
  أقدم ترجع `points: []`.

---

## 2. الصفحة الجديدة: «الخريطة الحية»

حسب نمط المشروع:

| الملف | ما فيه |
|---|---|
| `src/services/deliveryTrackingService.js` | `getLiveDrivers({ onlyLocated })`، `getAssignmentRoute(id)` عبر `apiClient` |
| `src/query/queryKeys.js` | `liveDrivers`، `assignmentRoute(id)` |
| `src/viewmodels/useLiveDriversViewModel.js` | `useQuery({ queryKey, queryFn, refetchInterval: 10_000, refetchIntervalInBackground: false })` |
| `src/views/drivers/LiveDriversMapPage.jsx` | الصفحة |
| `src/components/maps/LiveDriversMap.jsx` | الخريطة |
| `src/app/router.jsx` | `lazy()` + `<Route path="/drivers/live">` بجانب `/drivers` (السطور 223-230) |
| `src/navigation/dashboardNav.js` | عنصر `nav.liveDrivers` تحت السائقين (السطور 50-56)، أيقونة `EnvironmentOutlined` |
| `src/locales/{ar,en}/*.json` | النصوص (§5) |

### التخطيط

```
┌────────────────────────────────────────────────────────────┐
│ الخريطة الحية   [الكل ▾] [🔍 بحث بالاسم]   ● 7 متصل  ○ 3 منقطع │
├──────────────────────┬─────────────────────────────────────┤
│ قائمة السائقين        │                                     │
│ 🟢 علي محمد  في الطريق │              الخريطة                │
│    C-1042 • منذ 6 ث   │     🛵 🛵        🛵                  │
│ 🟢 سامي      متاح      │            🛵                       │
│ ⚪ خالد  منقطع منذ 14د │                                     │
│ ⛔ رامي  لا موقع       │                                     │
└──────────────────────┴─────────────────────────────────────┘
```

- **فلتر:** الكل / في الطريق / متاح بلا طلب / منقطع.
- **قائمة جانبية** مرتبة: في الطريق أولاً، ثم متاح، ثم منقطع، ثم بلا موقع.
  - الضغط على سائق: الخريطة تتمركز عليه وتفتح بطاقته.
- **الخريطة (`LiveDriversMap`):**
  - `MapContainer` + `TileLayer` بنفس إعدادات `OrderTrackingMap.jsx`.
  - علامة لكل سائق له `location`، لونها حسب الحالة:
    - **أزرق:** `on_the_road`.
    - **أخضر:** متاح بلا طلب في الطريق.
    - **رمادي:** `is_stale`.
  - أدِر العلامة بـ `heading` (CSS `transform: rotate(...)` على الـ `divIcon`).
  - **Popup:** الاسم، الهاتف (رابط `tel:`)، المركبة، "آخر تحديث منذ…" من
    `seconds_since_update`، وقائمة `open_orders` كروابط إلى الطلب، وزر **«عرض
    المسار»** لكل طلب `out_for_delivery`.
  - **الكاميرا:** `fitBounds` على كل العلامات **في أول تحميل فقط**. لا تحرّكها مع
    كل refetch وإلا تقفز تحت يد المدير. زر "عرض الكل" يعيد الـ fit.
  - لا تعِد إنشاء العلامات مع كل refetch. `key={driver_id}` يكفي ليحركها
    react-leaflet بدل إعادة رسمها.
- **"عرض المسار":** يفتح `RouteDrawer` (§3) فوق الصفحة.

---

## 3. مكوّن المسار `RouteDrawer` / `AssignmentRouteMap`

يُستعمل في مكانين: الخريطة الحية، ونافذة تفاصيل الطلب (§4).

- `useQuery(assignmentRoute(id))` مع
  `refetchInterval: route.status === 'out_for_delivery' ? 10_000 : false`. أي حيّ
  أثناء الرحلة وثابت بعدها.
- على الخريطة:
  - `Polyline` من `points` (لون أساسي، عرض 5).
  - علامة **المتجر** (`pickup`) عند البداية، وعلامة **الوجهة** (`destination`).
  - علامة السائق عند آخر نقطة إن كانت الرحلة جارية.
  - `fitBounds` على كل ما سبق.
- تحت الخريطة:
  - الاستلام `picked_up_at`، التسليم `delivered_at`، **المدة** (الفرق بينهما).
  - **المسافة المقطوعة:** مجموع المسافات بين النقاط المتتالية (haversine في
    الواجهة).
  - شريط زمني اختياري (`Slider`) على `recorded_at` يحرّك علامة على المسار
    لمراجعة شكوى ("أين كان الساعة 4:25؟").
- `points` فارغة → رسالة "لا يوجد مسار مسجّل لهذه الرحلة" (رحلة قبل الميزة، أو
  أقدم من 90 يوماً، أو السائق لم يرسل موقعه).

---

## 4. نافذة تفاصيل الطلب (`OrderDetailModal.jsx`)

الآن `extractDriverLocation` (`src/utils/orderDetail.js:46-69`) يخمّن أسماء حقول
(`driver_latitude`، `current_latitude`، …) **غير موجودة** في رد
`/api/delivery/assignments`. لذلك علامة السائق في `OrderTrackingMap` لا تظهر
عملياً.

الاستبدال:
- إن كان للطلب إسناد (`assignment_id` من صف الإسناد الذي تجلبه النافذة عند
  السطر 113): اعرض `AssignmentRouteMap` بدل `OrderTrackingMap`.
- بلا إسناد: أبقِ `OrderTrackingMap` بالوجهة فقط كما هو.
- احذف التخمين من `extractDriverLocation`، أو أبقه احتياطاً لا يُستعمل.

---

## 5. النصوص

| المفتاح | ar | en |
|---|---|---|
| `nav.liveDrivers` | الخريطة الحية | Live map |
| `liveDrivers.title` | الخريطة الحية لعمال التوصيل | Live drivers map |
| `liveDrivers.filter.all` | الكل | All |
| `liveDrivers.filter.onTheRoad` | في الطريق | On the road |
| `liveDrivers.filter.available` | متاح | Available |
| `liveDrivers.filter.stale` | منقطع | Signal lost |
| `liveDrivers.noLocation` | لم يرسل موقعه بعد | No location yet |
| `liveDrivers.updatedAgo` | آخر تحديث منذ {{time}} | Updated {{time}} ago |
| `liveDrivers.showRoute` | عرض المسار | Show route |
| `liveDrivers.fitAll` | عرض الكل | Show all |
| `route.title` | مسار التوصيل — {{number}} | Delivery route — {{number}} |
| `route.pickedUp` | الاستلام | Picked up |
| `route.delivered` | التسليم | Delivered |
| `route.duration` | المدة | Duration |
| `route.distance` | المسافة المقطوعة | Distance travelled |
| `route.empty` | لا يوجد مسار مسجّل لهذه الرحلة | No route recorded for this trip |
| `route.live` | مباشر | Live |

---

## 6. قائمة التحقق

- [x] service + query keys + viewmodel بـ `refetchInterval: 10_000`
- [x] صفحة الخريطة الحية + الفلتر + القائمة الجانبية + العنصر في القائمة الرئيسية
- [x] علامات ملونة ومُدارة بـ `heading`، دون قفز الكاميرا مع كل تحديث
- [x] `AssignmentRouteMap` (حي أثناء الرحلة، ثابت بعدها، مع المدة والمسافة)
- [x] استبدال الخريطة في `OrderDetailModal` حين يوجد إسناد
- [x] النصوص بالعربية والإنجليزية

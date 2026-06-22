# Meal Booking — API Payload Reference

**Endpoint:** `POST /guest/bookings/meal`  
**Content-Type:** `application/json`

---

## Top-Level Fields (always present)

| Field | Type | Values / Notes |
|---|---|---|
| `org_id` | string | Lodge / property ID |
| `branch_id` | string \| null | Property branch ID; null if not applicable |
| `booking_type` | string | Always `"meal"` |
| `source` | string | Always `"web"` |
| `currency` | string | Always `"ZMW"` |
| `booking_context` | string | `"individual"` \| `"corporate"` |
| `participant_mode` | string | `"headcount"` \| `"detailed"` |
| `participant_count` | integer \| null | Total diner count when `participant_mode = "headcount"`; null when detailed |
| `booked_by` | object | Person submitting the booking |
| `attendants` | array | Diner list — shape differs by participant mode |
| `company` | object \| null | Corporate company snapshot; null for individual |
| `approver` | object \| null | Corporate approver; null for individual |
| `meal` | object | Schedule, sessions, individual orders |

---

## Enum Values

| Field | Allowed values |
|---|---|
| `meal.sessions[].meal_period` | `"breakfast"`, `"brunch"`, `"lunch"`, `"afternoon_tea"`, `"dinner"`, `"late_supper"` |
| `meal.sessions[].service_type` | `"buffet"`, `"set_menu"`, `"a_la_carte"`, `"individual_order"`, `"mixed"` |
| `meal.schedule_mode` | `"uniform"`, `"per_day"` |
| `meal.meal_mode` | `"standalone"` (always for this endpoint) |

---

## Scenario 1 — Individual · Headcount Only · Uniform Schedule · Buffet

```json
{
  "org_id":           "lodge-uuid-001",
  "branch_id":        null,
  "booking_type":     "meal",
  "source":           "web",
  "currency":         "ZMW",
  "booking_context":  "individual",
  "participant_mode": "headcount",
  "participant_count": 4,

  "booked_by": {
    "name":      "Jane Mwansa",
    "email":     "jane.mwansa@example.com",
    "phone":     "+260971234567",
    "job_title": null
  },

  "attendants": [
    {
      "full_name":       "Jane Mwansa",
      "email":           "jane.mwansa@example.com",
      "phone":           "+260971234567",
      "id_number":       null,
      "dietary_notes":   null,
      "company":         null,
      "is_lead_contact": true
    }
  ],

  "company":  null,
  "approver": null,

  "meal": {
    "reason_for_booking": null,
    "meal_mode":          "standalone",
    "start_date":         "2025-09-10",
    "end_date":           "2025-09-12",
    "schedule_mode":      "uniform",
    "notes":              "Please note one guest has a severe nut allergy.",
    "sessions": [
      {
        "session_name":       "Breakfast",
        "meal_date":          "2025-09-10",
        "meal_period":        "breakfast",
        "service_type":       "buffet",
        "pax_count":          4,
        "dietary_notes":      "One guest: severe nut allergy",
        "arrangements_notes": null,
        "individual_orders":  null
      },
      {
        "session_name":       "Dinner",
        "meal_date":          "2025-09-10",
        "meal_period":        "dinner",
        "service_type":       "buffet",
        "pax_count":          4,
        "dietary_notes":      null,
        "arrangements_notes": null,
        "individual_orders":  null
      },
      {
        "session_name":       "Breakfast",
        "meal_date":          "2025-09-11",
        "meal_period":        "breakfast",
        "service_type":       "buffet",
        "pax_count":          4,
        "dietary_notes":      "One guest: severe nut allergy",
        "arrangements_notes": null,
        "individual_orders":  null
      },
      {
        "session_name":       "Dinner",
        "meal_date":          "2025-09-11",
        "meal_period":        "dinner",
        "service_type":       "buffet",
        "pax_count":          4,
        "dietary_notes":      null,
        "arrangements_notes": null,
        "individual_orders":  null
      },
      {
        "session_name":       "Breakfast",
        "meal_date":          "2025-09-12",
        "meal_period":        "breakfast",
        "service_type":       "buffet",
        "pax_count":          4,
        "dietary_notes":      "One guest: severe nut allergy",
        "arrangements_notes": null,
        "individual_orders":  null
      },
      {
        "session_name":       "Dinner",
        "meal_date":          "2025-09-12",
        "meal_period":        "dinner",
        "service_type":       "buffet",
        "pax_count":          4,
        "dietary_notes":      null,
        "arrangements_notes": null,
        "individual_orders":  null
      }
    ]
  }
}
```

> **How uniform sessions work:** The master session list (2 sessions: Breakfast + Dinner) is expanded across every day in the `start_date`→`end_date` range. The backend receives a flat, date-stamped list — it does not receive the master template.

---

## Scenario 2 — Individual · Headcount Only · Per-Day Schedule

Different sessions per day; some days may be excluded. `individual_orders` is null because participant_mode is headcount.

```json
{
  "org_id":           "lodge-uuid-001",
  "branch_id":        null,
  "booking_type":     "meal",
  "source":           "web",
  "currency":         "ZMW",
  "booking_context":  "individual",
  "participant_mode": "headcount",
  "participant_count": 8,

  "booked_by": {
    "name":      "Jane Mwansa",
    "email":     "jane.mwansa@example.com",
    "phone":     "+260971234567",
    "job_title": null
  },

  "attendants": [
    {
      "full_name":       "Jane Mwansa",
      "email":           "jane.mwansa@example.com",
      "phone":           "+260971234567",
      "id_number":       null,
      "dietary_notes":   null,
      "company":         null,
      "is_lead_contact": true
    }
  ],

  "company":  null,
  "approver": null,

  "meal": {
    "reason_for_booking": null,
    "meal_mode":          "standalone",
    "start_date":         "2025-10-06",
    "end_date":           "2025-10-08",
    "schedule_mode":      "per_day",
    "notes":              null,
    "sessions": [
      {
        "session_name":       "Welcome Dinner",
        "meal_date":          "2025-10-06",
        "meal_period":        "dinner",
        "service_type":       "set_menu",
        "pax_count":          8,
        "dietary_notes":      "3 guests vegetarian",
        "arrangements_notes": "Candle-lit setting preferred",
        "individual_orders":  null
      },
      {
        "session_name":       "Working Lunch",
        "meal_date":          "2025-10-07",
        "meal_period":        "lunch",
        "service_type":       "buffet",
        "pax_count":          8,
        "dietary_notes":      null,
        "arrangements_notes": null,
        "individual_orders":  null
      },
      {
        "session_name":       "Farewell Breakfast",
        "meal_date":          "2025-10-08",
        "meal_period":        "breakfast",
        "service_type":       "buffet",
        "pax_count":          8,
        "dietary_notes":      null,
        "arrangements_notes": null,
        "individual_orders":  null
      }
    ]
  }
}
```

---

## Scenario 3 — Individual · Individual Records · Uniform Schedule · Individual Orders

When `service_type` is `"individual_order"` or `"mixed"` and `participant_mode` is `"detailed"`, each session includes an `individual_orders` array mapping specific menu items to specific diners.

```json
{
  "org_id":           "lodge-uuid-001",
  "branch_id":        null,
  "booking_type":     "meal",
  "source":           "web",
  "currency":         "ZMW",
  "booking_context":  "individual",
  "participant_mode": "detailed",
  "participant_count": null,

  "booked_by": {
    "name":      "Jane Mwansa",
    "email":     "jane.mwansa@example.com",
    "phone":     "+260971234567",
    "job_title": null
  },

  "attendants": [
    {
      "full_name":       "Jane Mwansa",
      "email":           "jane.mwansa@example.com",
      "phone":           "+260971234567",
      "id_number":       "NRC-123456/10/1",
      "dietary_notes":   null,
      "company":         null,
      "is_lead_contact": true
    },
    {
      "full_name":       "Peter Banda",
      "email":           null,
      "phone":           null,
      "id_number":       null,
      "dietary_notes":   "Vegetarian",
      "company":         null,
      "is_lead_contact": false
    },
    {
      "full_name":       "Grace Tembo",
      "email":           null,
      "phone":           null,
      "id_number":       null,
      "dietary_notes":   "Gluten-free",
      "company":         null,
      "is_lead_contact": false
    }
  ],

  "company":  null,
  "approver": null,

  "meal": {
    "reason_for_booking": null,
    "meal_mode":          "standalone",
    "start_date":         "2025-09-10",
    "end_date":           "2025-09-10",
    "schedule_mode":      "uniform",
    "notes":              null,
    "sessions": [
      {
        "session_name":       "Dinner",
        "meal_date":          "2025-09-10",
        "meal_period":        "dinner",
        "service_type":       "individual_order",
        "pax_count":          3,
        "dietary_notes":      null,
        "arrangements_notes": null,
        "individual_orders": [
          {
            "attendant_idx": 0,
            "menu_item_id":  "menu-item-uuid-501",
            "quantity":      1,
            "notes":         null
          },
          {
            "attendant_idx": 1,
            "menu_item_id":  "menu-item-uuid-502",
            "quantity":      1,
            "notes":         "No onions please"
          },
          {
            "attendant_idx": 2,
            "menu_item_id":  "menu-item-uuid-503",
            "quantity":      1,
            "notes":         null
          }
        ]
      }
    ]
  }
}
```

> **`individual_orders` rules:**
> - Only present (non-null) when `participant_mode` is `"detailed"` AND orders were actually assigned.
> - Can appear on any session regardless of `meal_period`.
> - `attendant_idx` maps to the position of the diner in the top-level `attendants` array.
> - In headcount mode with individual order service type, the same order assignment UI is shown using anonymous numbered slots, but `individual_orders` will be null in the payload (headcount mode cannot name specific diners).
> - `notes` per order item is optional; omit or send null if not provided.

---

## Scenario 4 — Individual · Individual Records · Per-Day Schedule · Mixed Orders

A multi-day booking with different session types per day. Day 1 is buffet (no individual orders), Day 2 uses mixed service (has individual orders).

```json
{
  "org_id":           "lodge-uuid-001",
  "branch_id":        null,
  "booking_type":     "meal",
  "source":           "web",
  "currency":         "ZMW",
  "booking_context":  "individual",
  "participant_mode": "detailed",
  "participant_count": null,

  "booked_by": {
    "name":      "Jane Mwansa",
    "email":     "jane.mwansa@example.com",
    "phone":     "+260971234567",
    "job_title": null
  },

  "attendants": [
    {
      "full_name":       "Jane Mwansa",
      "email":           "jane.mwansa@example.com",
      "phone":           "+260971234567",
      "id_number":       "NRC-123456/10/1",
      "dietary_notes":   null,
      "company":         null,
      "is_lead_contact": true
    },
    {
      "full_name":       "Peter Banda",
      "email":           null,
      "phone":           null,
      "id_number":       null,
      "dietary_notes":   "Vegetarian",
      "company":         null,
      "is_lead_contact": false
    }
  ],

  "company":  null,
  "approver": null,

  "meal": {
    "reason_for_booking": null,
    "meal_mode":          "standalone",
    "start_date":         "2025-10-06",
    "end_date":           "2025-10-07",
    "schedule_mode":      "per_day",
    "notes":              null,
    "sessions": [
      {
        "session_name":       "Welcome Dinner",
        "meal_date":          "2025-10-06",
        "meal_period":        "dinner",
        "service_type":       "buffet",
        "pax_count":          2,
        "dietary_notes":      "1 vegetarian",
        "arrangements_notes": null,
        "individual_orders":  null
      },
      {
        "session_name":       "Breakfast",
        "meal_date":          "2025-10-07",
        "meal_period":        "breakfast",
        "service_type":       "mixed",
        "pax_count":          2,
        "dietary_notes":      null,
        "arrangements_notes": "Please serve à la carte items alongside buffet",
        "individual_orders": [
          {
            "attendant_idx": 0,
            "menu_item_id":  "menu-item-uuid-504",
            "quantity":      1,
            "notes":         null
          },
          {
            "attendant_idx": 1,
            "menu_item_id":  "menu-item-uuid-505",
            "quantity":      2,
            "notes":         "No dairy"
          }
        ]
      }
    ]
  }
}
```

---

## Scenario 5 — Corporate · Headcount Only · Uniform Schedule

```json
{
  "org_id":           "lodge-uuid-001",
  "branch_id":        "branch-uuid-002",
  "booking_type":     "meal",
  "source":           "web",
  "currency":         "ZMW",
  "booking_context":  "corporate",
  "participant_mode": "headcount",
  "participant_count": 30,

  "booked_by": {
    "name":      "Chanda Mulenga",
    "email":     "chanda.mulenga@acmecorp.zm",
    "phone":     "+260966000111",
    "job_title": "Events Manager"
  },

  "attendants": [
    {
      "full_name":       "Chanda Mulenga",
      "email":           "chanda.mulenga@acmecorp.zm",
      "phone":           "+260966000111",
      "id_number":       null,
      "dietary_notes":   null,
      "company":         null,
      "is_lead_contact": true
    }
  ],

  "company": {
    "name":            "ACME Corporation Zambia Ltd",
    "tpin":            "1003456789",
    "industry":        "Mining & Resources",
    "email":           "billing@acmecorp.zm",
    "phone":           "+260211345678",
    "city":            "Lusaka",
    "street_address":  "Plot 123, Cairo Road",
    "branch_name":     "Head Office",
    "department_name": "Human Resources",
    "cost_center":     "CC-HR-005",
    "gl_code":         "GL-4400"
  },

  "approver": {
    "name":  "Dr. Francis Ng'uni",
    "email": "fnguni@acmecorp.zm",
    "phone": "+260977888999",
    "title": "Head of HR"
  },

  "meal": {
    "reason_for_booking": "3-day corporate training catering",
    "meal_mode":          "standalone",
    "start_date":         "2025-11-10",
    "end_date":           "2025-11-12",
    "schedule_mode":      "uniform",
    "notes":              "5 delegates are vegetarian; 2 are halal.",
    "sessions": [
      {
        "session_name":       "Morning Tea",
        "meal_date":          "2025-11-10",
        "meal_period":        "brunch",
        "service_type":       "buffet",
        "pax_count":          30,
        "dietary_notes":      null,
        "arrangements_notes": null,
        "individual_orders":  null
      },
      {
        "session_name":       "Working Lunch",
        "meal_date":          "2025-11-10",
        "meal_period":        "lunch",
        "service_type":       "buffet",
        "pax_count":          30,
        "dietary_notes":      "5 vegetarian, 2 halal",
        "arrangements_notes": "Separate serving stations for dietary requirements",
        "individual_orders":  null
      },
      {
        "session_name":       "Morning Tea",
        "meal_date":          "2025-11-11",
        "meal_period":        "brunch",
        "service_type":       "buffet",
        "pax_count":          30,
        "dietary_notes":      null,
        "arrangements_notes": null,
        "individual_orders":  null
      },
      {
        "session_name":       "Working Lunch",
        "meal_date":          "2025-11-11",
        "meal_period":        "lunch",
        "service_type":       "buffet",
        "pax_count":          30,
        "dietary_notes":      "5 vegetarian, 2 halal",
        "arrangements_notes": "Separate serving stations for dietary requirements",
        "individual_orders":  null
      },
      {
        "session_name":       "Morning Tea",
        "meal_date":          "2025-11-12",
        "meal_period":        "brunch",
        "service_type":       "buffet",
        "pax_count":          30,
        "dietary_notes":      null,
        "arrangements_notes": null,
        "individual_orders":  null
      },
      {
        "session_name":       "Working Lunch",
        "meal_date":          "2025-11-12",
        "meal_period":        "lunch",
        "service_type":       "buffet",
        "pax_count":          30,
        "dietary_notes":      "5 vegetarian, 2 halal",
        "arrangements_notes": "Separate serving stations for dietary requirements",
        "individual_orders":  null
      }
    ]
  }
}
```

---

## Scenario 6 — Corporate · Individual Records · Per-Day Schedule · Individual Orders

Full corporate booking with named delegates and per-delegate meal assignments.

```json
{
  "org_id":           "lodge-uuid-001",
  "branch_id":        "branch-uuid-002",
  "booking_type":     "meal",
  "source":           "web",
  "currency":         "ZMW",
  "booking_context":  "corporate",
  "participant_mode": "detailed",
  "participant_count": null,

  "booked_by": {
    "name":      "Chanda Mulenga",
    "email":     "chanda.mulenga@acmecorp.zm",
    "phone":     "+260966000111",
    "job_title": "Events Manager"
  },

  "attendants": [
    {
      "full_name":       "Chanda Mulenga",
      "email":           "chanda.mulenga@acmecorp.zm",
      "phone":           "+260966000111",
      "id_number":       "NRC-987654/11/1",
      "dietary_notes":   null,
      "company":         null,
      "is_lead_contact": true
    },
    {
      "full_name":       "Bwalya Katongo",
      "email":           null,
      "phone":           null,
      "id_number":       null,
      "dietary_notes":   "Halal",
      "company":         null,
      "is_lead_contact": false
    },
    {
      "full_name":       "Mutale Zulu",
      "email":           null,
      "phone":           null,
      "id_number":       null,
      "dietary_notes":   "Vegetarian",
      "company":         null,
      "is_lead_contact": false
    }
  ],

  "company": {
    "name":            "ACME Corporation Zambia Ltd",
    "tpin":            "1003456789",
    "industry":        "Mining & Resources",
    "email":           "billing@acmecorp.zm",
    "phone":           "+260211345678",
    "city":            null,
    "street_address":  null,
    "branch_name":     "Kitwe Branch",
    "department_name": "Operations",
    "cost_center":     null,
    "gl_code":         null
  },

  "approver": {
    "name":  "Dr. Francis Ng'uni",
    "email": "fnguni@acmecorp.zm",
    "phone": "+260977888999",
    "title": "Head of HR"
  },

  "meal": {
    "reason_for_booking": "Executive dining — quarterly review",
    "meal_mode":          "standalone",
    "start_date":         "2025-11-10",
    "end_date":           "2025-11-11",
    "schedule_mode":      "per_day",
    "notes":              null,
    "sessions": [
      {
        "session_name":       "Executive Dinner",
        "meal_date":          "2025-11-10",
        "meal_period":        "dinner",
        "service_type":       "individual_order",
        "pax_count":          3,
        "dietary_notes":      null,
        "arrangements_notes": "Formal table setting, name cards required",
        "individual_orders": [
          {
            "attendant_idx": 0,
            "menu_item_id":  "menu-item-uuid-601",
            "quantity":      1,
            "notes":         null
          },
          {
            "attendant_idx": 1,
            "menu_item_id":  "menu-item-uuid-602",
            "quantity":      1,
            "notes":         "Confirm halal preparation with kitchen"
          },
          {
            "attendant_idx": 2,
            "menu_item_id":  "menu-item-uuid-603",
            "quantity":      1,
            "notes":         null
          }
        ]
      },
      {
        "session_name":       "Working Lunch",
        "meal_date":          "2025-11-11",
        "meal_period":        "lunch",
        "service_type":       "set_menu",
        "pax_count":          3,
        "dietary_notes":      "1 halal, 1 vegetarian",
        "arrangements_notes": null,
        "individual_orders":  null
      }
    ]
  }
}
```

---

## Field Reference

### `meal` Object

| Field | Type | Notes |
|---|---|---|
| `reason_for_booking` | string \| null | Purpose; optional |
| `meal_mode` | string | Always `"standalone"` for this endpoint |
| `start_date` | string (YYYY-MM-DD) \| null | Catering period start |
| `end_date` | string (YYYY-MM-DD) \| null | Catering period end |
| `schedule_mode` | string | `"uniform"` \| `"per_day"` |
| `notes` | string \| null | General catering notes |
| `sessions` | array | Flat list of date-stamped session objects |

### `meal.sessions[]` Item

| Field | Type | Notes |
|---|---|---|
| `session_name` | string \| null | Display label for the session; optional |
| `meal_date` | string (YYYY-MM-DD) \| null | Date this session falls on |
| `meal_period` | string | See enum table |
| `service_type` | string | See enum table |
| `pax_count` | integer \| null | Cover count for this session |
| `dietary_notes` | string \| null | Dietary requirements summary for this session |
| `arrangements_notes` | string \| null | Setup / service instructions; corporate only (null for individual) |
| `individual_orders` | array \| null | Present only when `participant_mode = "detailed"` AND orders were assigned (see below) |

### `meal.sessions[].individual_orders[]` Item

Present when `service_type` is `"individual_order"` or `"mixed"`, and `participant_mode` is `"detailed"`, and at least one order was assigned.

| Field | Type | Notes |
|---|---|---|
| `attendant_idx` | integer | 0-based index into the top-level `attendants` array |
| `menu_item_id` | string | UUID of the menu item from `GET /guest/menu` |
| `quantity` | integer | Default 1; can be higher for multiple of same item |
| `notes` | string \| null | Per-item instruction; null if not provided |

> **When `individual_orders` is null:** Service type is buffet or set_menu, OR participant mode is headcount, OR no orders were assigned in the UI.

### `attendants[]` Item

| Field | Type | Required |
|---|---|---|
| `full_name` | string \| null | Lead: required. Non-lead: required |
| `email` | string \| null | Lead: required. Non-lead: optional |
| `phone` | string \| null | Lead: required. Non-lead: optional |
| `id_number` | string \| null | Lead: required. Non-lead: optional |
| `dietary_notes` | string \| null | Optional for all |
| `company` | string \| null | Optional; attendee's own organisation if different |
| `is_lead_contact` | boolean | true for index 0 only |

### `company` Object (corporate only, else null)

| Field | Type | Required |
|---|---|---|
| `name` | string \| null | Required |
| `tpin` | string \| null | Required |
| `industry` | string \| null | Required |
| `email` | string \| null | Required (billing email) |
| `phone` | string \| null | Required |
| `city` | string \| null | Optional |
| `street_address` | string \| null | Optional |
| `branch_name` | string \| null | Optional |
| `department_name` | string \| null | Optional |
| `cost_center` | string \| null | Optional |
| `gl_code` | string \| null | Optional |

### `approver` Object (corporate only, else null)

| Field | Type | Required |
|---|---|---|
| `name` | string \| null | Required |
| `email` | string \| null | Required |
| `phone` | string \| null | Required |
| `title` | string \| null | Required (job title) |

---

## Decision Matrix — `individual_orders` Presence

| `participant_mode` | `service_type` | Orders assigned in UI | `individual_orders` in payload |
|---|---|---|---|
| `headcount` | any | — | `null` |
| `detailed` | `buffet` | — | `null` |
| `detailed` | `set_menu` | — | `null` |
| `detailed` | `a_la_carte` | — | `null` |
| `detailed` | `individual_order` | none assigned | `null` |
| `detailed` | `individual_order` | assigned | `[{attendant_idx, menu_item_id, quantity, notes}, ...]` |
| `detailed` | `mixed` | none assigned | `null` |
| `detailed` | `mixed` | assigned | `[{attendant_idx, menu_item_id, quantity, notes}, ...]` |

# Accommodation Booking — API Payload Reference

**Endpoint:** `POST /guest/bookings/accommodation`  
**Content-Type:** `application/json`

---

## Top-Level Fields (always present)

| Field | Type | Values / Notes |
|---|---|---|
| `org_id` | string | Lodge / property ID |
| `branch_id` | string \| null | Property branch ID; null if not applicable |
| `booking_type` | string | Always `"accommodation"` |
| `source` | string | Always `"web"` |
| `currency` | string | Always `"ZMW"` |
| `booking_context` | string | `"individual"` \| `"corporate"` |
| `participant_mode` | string | `"headcount"` \| `"detailed"` |
| `participant_count` | integer \| null | Total guest count when `participant_mode = "headcount"`; null when detailed |
| `booked_by` | object | Person submitting the booking (auto-filled from auth) |
| `attendants` | array | Guest list — shape differs by participant mode (see below) |
| `company` | object \| null | Corporate company snapshot; null for individual bookings |
| `approver` | object \| null | Corporate approver; null for individual bookings |
| `accommodation` | object | Check-in/out dates, rooms — shape differs by booking context |

---

## `booked_by` Object

Always present regardless of context or mode.

```json
"booked_by": {
  "name":      "Jane Mwansa",
  "email":     "jane.mwansa@example.com",
  "phone":     "+260971234567",
  "job_title": "Procurement Officer"
}
```

> `job_title` is only filled for corporate bookings; null for individual.

---

## Scenario 1 — Individual · Headcount Only

```json
{
  "org_id":           "lodge-uuid-001",
  "branch_id":        null,
  "booking_type":     "accommodation",
  "source":           "web",
  "currency":         "ZMW",
  "booking_context":  "individual",
  "participant_mode": "headcount",
  "participant_count": 3,

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

  "accommodation": {
    "check_in":             "2025-09-10",
    "check_out":            "2025-09-14",
    "notes":                "Late check-in expected around 10 PM.",
    "room_count":           null,
    "room_type_preference": null,
    "rooms": [
      {
        "slot_index":     0,
        "attendant_idx":  0,
        "room_id":        "room-uuid-101",
        "room_name":      "Savannah Suite",
        "room_type":      "suite",
        "rate_per_night": 850.00
      }
    ]
  }
}
```

> **Notes:**
> - `attendants` always contains exactly one entry in headcount mode — the booker — acting as lead contact.
> - `rooms` contains entries for however many rooms the booker selected (one per slot). Each entry maps a `slot_index` to an `attendant_idx` and the chosen room details.
> - `room_count` and `room_type_preference` are always `null` for individual bookings.

---

## Scenario 2 — Individual · Individual Records

```json
{
  "org_id":           "lodge-uuid-001",
  "branch_id":        null,
  "booking_type":     "accommodation",
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
      "dietary_notes":   null,
      "company":         null,
      "is_lead_contact": false
    }
  ],

  "company":  null,
  "approver": null,

  "accommodation": {
    "check_in":             "2025-09-10",
    "check_out":            "2025-09-14",
    "notes":                null,
    "room_count":           null,
    "room_type_preference": null,
    "rooms": [
      {
        "slot_index":     0,
        "attendant_idx":  0,
        "room_id":        "room-uuid-101",
        "room_name":      "Savannah Suite",
        "room_type":      "suite",
        "rate_per_night": 850.00
      },
      {
        "slot_index":     1,
        "attendant_idx":  1,
        "room_id":        "room-uuid-102",
        "room_name":      "Bush Standard Double",
        "room_type":      "double",
        "rate_per_night": 420.00
      },
      {
        "slot_index":     2,
        "attendant_idx":  2,
        "room_id":        "room-uuid-103",
        "room_name":      "Bush Standard Twin",
        "room_type":      "twin",
        "rate_per_night": 420.00
      }
    ]
  }
}
```

> **Notes:**
> - `participant_count` is `null` when mode is `"detailed"`.
> - Lead contact (index 0) always has name, email, phone, and id_number filled; non-leads only require name.
> - `rooms` array contains one entry per room slot assigned; `attendant_idx` maps back to the position in `attendants`.
> - A guest may not have a room assigned yet (slot not in `rooms`) — property handles late assignments.

---

## Scenario 3 — Corporate

Corporate bookings always send rooms as null and instead send `room_count` + `room_type_preference`. The property assigns specific rooms.

```json
{
  "org_id":           "lodge-uuid-001",
  "branch_id":        "branch-uuid-002",
  "booking_type":     "accommodation",
  "source":           "web",
  "currency":         "ZMW",
  "booking_context":  "corporate",
  "participant_mode": "headcount",
  "participant_count": 12,

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

  "accommodation": {
    "check_in":             "2025-09-10",
    "check_out":            "2025-09-14",
    "notes":                "All rooms to be on same floor if possible.",
    "room_count":           12,
    "room_type_preference": "double",
    "rooms":                null
  }
}
```

> **Notes:**
> - `company` and `approver` are `null` for individual bookings and a full object for corporate.
> - `company.city`, `company.street_address`, `company.branch_name`, `company.department_name`, `company.cost_center`, `company.gl_code` are all optional — send null if not provided.
> - `accommodation.rooms` is always `null` for corporate. `room_count` and `room_type_preference` are always `null` for individual.
> - In headcount mode (corporate), `attendants` is a single-item array containing only the booker.

---

## Corporate · Individual Records Mode

When a corporate booking uses `participant_mode: "detailed"`, `attendants` contains full delegate records:

```json
{
  "participant_mode":  "detailed",
  "participant_count": null,

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
      "dietary_notes":   "Gluten-free",
      "company":         null,
      "is_lead_contact": false
    }
  ]
}
```

---

## Field Reference

### `accommodation` Object

| Field | Type | Present when |
|---|---|---|
| `check_in` | string (YYYY-MM-DD) \| null | Always |
| `check_out` | string (YYYY-MM-DD) \| null | Always |
| `notes` | string \| null | Always; null if not entered |
| `room_count` | integer \| null | Corporate only; null for individual |
| `room_type_preference` | string \| null | Corporate only; null for individual |
| `rooms` | array \| null | Individual only; null for corporate |

### `rooms` Array Item

| Field | Type | Notes |
|---|---|---|
| `slot_index` | integer | 0-based position in the rooms list |
| `attendant_idx` | integer | Maps to position in `attendants` array |
| `room_id` | string | Room UUID from lodge inventory |
| `room_name` | string \| null | Display name |
| `room_type` | string \| null | e.g. `"suite"`, `"double"`, `"twin"`, `"single"` |
| `rate_per_night` | number \| null | Rate at time of booking in ZMW |

### `attendants` Array Item

| Field | Type | Required |
|---|---|---|
| `full_name` | string \| null | Lead: required. Non-lead: required (name only minimum) |
| `email` | string \| null | Lead: required. Non-lead: optional |
| `phone` | string \| null | Lead: required. Non-lead: optional |
| `id_number` | string \| null | Lead: required. Non-lead: optional |
| `dietary_notes` | string \| null | Optional for all |
| `company` | string \| null | Optional; used when guest is from a different company |
| `is_lead_contact` | boolean | true for index 0 only |

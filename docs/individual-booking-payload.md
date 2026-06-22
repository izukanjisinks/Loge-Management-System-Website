# Individual Booking — Complete API Payload Contract

## Design Rules
- Every top-level section is **always present**. When a service (accommodation, events, meals) is not enabled, it is sent as **`null`**, not omitted.
- Every field within an enabled section is **always present**. Empty strings become `null`; unset numbers become `null`.
- `attendants` is always an array of at least one record (the booker).
- `sessions` (events and meals) are **flattened** — one object per session per calendar date.

---

## Full Payload — All Services Enabled

```json
{
  "org_id": "5",
  "branch_id": "12",
  "booking_type": "individual",
  "source": "web",
  "currency": "ZMW",

  "participant_mode": "detailed",
  "participant_count": null,

  "booked_by": {
    "name": "Martin Sinkolongo",
    "email": "martin@example.com",
    "phone": "+260971234567"
  },

  "attendants": [
    {
      "full_name": "Martin Sinkolongo",
      "email": "martin@example.com",
      "phone": "+260971234567",
      "id_number": null,
      "dietary_notes": null,
      "is_lead_contact": true
    },
    {
      "full_name": "Jane Doe",
      "email": "jane@example.com",
      "phone": null,
      "id_number": "123456/78/1",
      "dietary_notes": "Vegetarian, no nuts",
      "is_lead_contact": false
    }
  ],

  "accommodation": {
    "check_in": "2026-07-15",
    "check_out": "2026-07-18",
    "notes": "Early check-in if possible",
    "rooms": [
      {
        "slot_index": 0,
        "attendant_idx": 0,
        "room_id": "42",
        "room_name": "Safari Suite",
        "room_type": "suite",
        "rate_per_night": 1250.00
      },
      {
        "slot_index": 1,
        "attendant_idx": 1,
        "room_id": "43",
        "room_name": "Savannah Twin",
        "room_type": "twin",
        "rate_per_night": 850.00
      }
    ]
  },

  "events": {
    "reason_for_booking": "Annual family gathering",
    "schedule_mode": "uniform",
    "sessions": [
      {
        "event_name": "Welcome Dinner",
        "event_type": "gala",
        "event_date": "2026-07-15",
        "start_time": "18:00",
        "end_time": "22:00",
        "expected_attendees": 2,
        "setup_type": "banquet",
        "venue_id": "7",
        "venue_name": "The Baobab Hall",
        "venue_capacity": 200,
        "pricing_basis": "flat_rate",
        "special_requirements": "Floral centrepieces, no shellfish"
      },
      {
        "event_name": "Welcome Dinner",
        "event_type": "gala",
        "event_date": "2026-07-16",
        "start_time": "18:00",
        "end_time": "22:00",
        "expected_attendees": 2,
        "setup_type": "banquet",
        "venue_id": "7",
        "venue_name": "The Baobab Hall",
        "venue_capacity": 200,
        "pricing_basis": "flat_rate",
        "special_requirements": "Floral centrepieces, no shellfish"
      }
    ]
  },

  "meals": {
    "reason_for_booking": null,
    "meal_mode": "event_linked",
    "schedule_mode": "uniform",
    "sessions": [
      {
        "session_name": null,
        "meal_date": "2026-07-15",
        "meal_period": "dinner",
        "service_type": "individual_order",
        "pax_count": 2,
        "linked_master_session_index": 0,
        "dietary_notes": "One vegetarian",
        "arrangements_notes": null,
        "individual_orders": [
          {
            "attendant_idx": 0,
            "menu_item_id": "menu_108",
            "quantity": 1,
            "notes": "No chilli please"
          },
          {
            "attendant_idx": 1,
            "menu_item_id": "menu_204",
            "quantity": 1,
            "notes": null
          }
        ]
      },
      {
        "session_name": null,
        "meal_date": "2026-07-16",
        "meal_period": "dinner",
        "service_type": "individual_order",
        "pax_count": 2,
        "linked_master_session_index": 0,
        "dietary_notes": "One vegetarian",
        "arrangements_notes": null,
        "individual_orders": [
          {
            "attendant_idx": 0,
            "menu_item_id": "menu_108",
            "quantity": 1,
            "notes": "No chilli please"
          },
          {
            "attendant_idx": 1,
            "menu_item_id": "menu_204",
            "quantity": 1,
            "notes": null
          }
        ]
      }
    ]
  },

  "notes": "Please arrange a quiet room away from the pool area."
}
```

---

## Minimal Payload — Headcount Mode, No Services

```json
{
  "org_id": "5",
  "branch_id": null,
  "booking_type": "individual",
  "source": "web",
  "currency": "ZMW",

  "participant_mode": "headcount",
  "participant_count": 3,

  "booked_by": {
    "name": "Martin Sinkolongo",
    "email": "martin@example.com",
    "phone": null
  },

  "attendants": [
    {
      "full_name": "Martin Sinkolongo",
      "email": "martin@example.com",
      "phone": null,
      "id_number": null,
      "dietary_notes": null,
      "is_lead_contact": true
    }
  ],

  "accommodation": null,
  "events": null,
  "meals": null,

  "notes": null
}
```

---

## Field Reference

### Root Object

| Field | Type | Always Present | Notes |
|---|---|---|---|
| `org_id` | `string` | ✅ | Lodge / property identifier |
| `branch_id` | `string \| null` | ✅ | Property branch; null if not applicable |
| `booking_type` | `"individual"` | ✅ | Fixed value |
| `source` | `string` | ✅ | Origin: `"web"` \| `"mobile"` \| `"reception"` |
| `currency` | `string` | ✅ | ISO 4217 — e.g. `"ZMW"` |
| `participant_mode` | `string` | ✅ | `"headcount"` \| `"detailed"` |
| `participant_count` | `integer \| null` | ✅ | Total guests incl. booker. Non-null only when `participant_mode = "headcount"` |
| `booked_by` | `object` | ✅ | See below |
| `attendants` | `array` | ✅ | Min 1 element (the booker). See below |
| `accommodation` | `object \| null` | ✅ | null when accommodation not selected |
| `events` | `object \| null` | ✅ | null when events not selected |
| `meals` | `object \| null` | ✅ | null when meals not selected |
| `notes` | `string \| null` | ✅ | General booking notes |

---

### `booked_by`

| Field | Type | Always Present | Notes |
|---|---|---|---|
| `name` | `string` | ✅ | Full name — required |
| `email` | `string \| null` | ✅ | |
| `phone` | `string \| null` | ✅ | |

---

### `attendants[]`

In **headcount mode**, the array contains exactly one record — the booker — with `is_lead_contact: true` and all optional fields as `null`.

In **detailed mode**, the array contains one record per guest entered by the user, with the booker record first.

| Field | Type | Always Present | Notes |
|---|---|---|---|
| `full_name` | `string` | ✅ | |
| `email` | `string \| null` | ✅ | |
| `phone` | `string \| null` | ✅ | |
| `id_number` | `string \| null` | ✅ | National ID / passport |
| `dietary_notes` | `string \| null` | ✅ | |
| `is_lead_contact` | `boolean` | ✅ | Exactly one attendant carries `true` |

---

### `accommodation` (when not null)

| Field | Type | Always Present | Notes |
|---|---|---|---|
| `check_in` | `string \| null` | ✅ | ISO 8601 date `YYYY-MM-DD` |
| `check_out` | `string \| null` | ✅ | ISO 8601 date `YYYY-MM-DD` |
| `notes` | `string \| null` | ✅ | Special requests |
| `rooms` | `array` | ✅ | Empty array `[]` if no rooms selected |

#### `accommodation.rooms[]`

In **headcount mode**, `slot_index` is the position of the room within the headcount slot list (0-based). `attendant_idx` mirrors `slot_index` for consistency.

In **detailed mode**, both `slot_index` and `attendant_idx` equal the index of the attendant in the `attendants` array.

| Field | Type | Always Present | Notes |
|---|---|---|---|
| `slot_index` | `integer` | ✅ | Position in the room slot list |
| `attendant_idx` | `integer` | ✅ | Corresponding attendant index |
| `room_id` | `string` | ✅ | |
| `room_name` | `string` | ✅ | Snapshot of room name at booking time |
| `room_type` | `string \| null` | ✅ | e.g. `"suite"`, `"twin"`, `"double"` |
| `rate_per_night` | `number \| null` | ✅ | ZMW amount at time of booking |

---

### `events` (when not null)

Sessions are **flattened by date**. If `schedule_mode` is `"uniform"` and the event runs for 3 days with 2 master sessions, the array will contain 6 objects (3 days × 2 sessions). Days explicitly excluded by the user are omitted from the array entirely.

| Field | Type | Always Present | Notes |
|---|---|---|---|
| `reason_for_booking` | `string \| null` | ✅ | |
| `schedule_mode` | `string` | ✅ | `"uniform"` \| `"per_day"` |
| `sessions` | `array` | ✅ | Flattened; see below |

#### `events.sessions[]`

| Field | Type | Always Present | Notes |
|---|---|---|---|
| `event_name` | `string \| null` | ✅ | Optional session label |
| `event_type` | `string` | ✅ | See **Event Types** enum |
| `event_date` | `string \| null` | ✅ | `YYYY-MM-DD`; null when no date range set |
| `start_time` | `string` | ✅ | `HH:MM` 24-hour |
| `end_time` | `string` | ✅ | `HH:MM` 24-hour |
| `expected_attendees` | `integer` | ✅ | |
| `setup_type` | `string` | ✅ | See **Setup Types** enum |
| `venue_id` | `string \| null` | ✅ | null if no venue selected |
| `venue_name` | `string \| null` | ✅ | Snapshot of venue name at booking time |
| `venue_capacity` | `integer \| null` | ✅ | Snapshot of max capacity at booking time |
| `pricing_basis` | `string` | ✅ | See **Pricing Basis** enum |
| `special_requirements` | `string \| null` | ✅ | AV, branding, staging notes |

---

### `meals` (when not null)

Sessions are **flattened by date**, same logic as events. When `meal_mode` is `"event_linked"`, the date range is derived from the events dates. When `"standalone"`, the meals module has its own independent date range.

| Field | Type | Always Present | Notes |
|---|---|---|---|
| `reason_for_booking` | `string \| null` | ✅ | |
| `meal_mode` | `string` | ✅ | `"event_linked"` \| `"standalone"` |
| `schedule_mode` | `string` | ✅ | `"uniform"` \| `"per_day"` |
| `sessions` | `array` | ✅ | Flattened; see below |

#### `meals.sessions[]`

| Field | Type | Always Present | Notes |
|---|---|---|---|
| `session_name` | `string \| null` | ✅ | Optional label |
| `meal_date` | `string \| null` | ✅ | `YYYY-MM-DD`; null when no date range |
| `meal_period` | `string` | ✅ | See **Meal Periods** enum |
| `service_type` | `string` | ✅ | See **Service Types** enum |
| `pax_count` | `integer` | ✅ | Total covers for this meal |
| `linked_master_session_index` | `integer \| null` | ✅ | Index into the master sessions list this meal is paired with; null when `meal_mode = "standalone"` or no link |
| `dietary_notes` | `string \| null` | ✅ | Group-level dietary notes |
| `arrangements_notes` | `string \| null` | ✅ | Service / logistics notes |
| `individual_orders` | `array` | ✅ | Empty array `[]` when `service_type = "buffet"` or `participant_mode = "headcount"` |

#### `meals.sessions[].individual_orders[]`

Only populated when `service_type` is `"individual_order"` or `"mixed"` **and** `participant_mode` is `"detailed"`.

| Field | Type | Always Present | Notes |
|---|---|---|---|
| `attendant_idx` | `integer` | ✅ | Index into root `attendants` array |
| `menu_item_id` | `string` | ✅ | |
| `quantity` | `integer` | ✅ | Min 1 |
| `notes` | `string \| null` | ✅ | Per-item dietary or preparation notes |

---

## Enum Reference

### `event_type`
| Value | Label |
|---|---|
| `conference` | Conference |
| `seminar` | Seminar |
| `workshop` | Workshop |
| `gala` | Gala / Dinner |
| `wedding` | Wedding |
| `training` | Training |

### `setup_type`
| Value | Label |
|---|---|
| `boardroom` | Boardroom |
| `theatre` | Theatre |
| `classroom` | Classroom |
| `u_shape` | U-Shape |
| `banquet` | Banquet |
| `cocktail` | Cocktail |

### `pricing_basis`
| Value | Label |
|---|---|
| `half_day` | Half Day |
| `full_day` | Full Day |
| `hourly` | Hourly |
| `flat_rate` | Flat Rate |

### `meal_period`
| Value | Label |
|---|---|
| `breakfast` | Breakfast |
| `lunch` | Lunch |
| `dinner` | Dinner |
| `tea_break` | Tea Break |
| `cocktail` | Cocktail |

### `service_type`
| Value | Label | `individual_orders` populated? |
|---|---|---|
| `buffet` | Buffet | No — always `[]` |
| `individual_order` | Individual Orders | Yes — when `participant_mode = "detailed"` |
| `mixed` | Mixed (Buffet + Exceptions) | Yes — exceptions only, when `participant_mode = "detailed"` |

---

## Fields Added to Contract vs. Current `submit()` Implementation

The following fields are in the data model and must be added to the frontend `submit()` function before going live:

| Field path | Currently sent | Action required |
|---|---|---|
| `source` | ❌ | Add hardcoded `"web"` |
| `currency` | ❌ | Add hardcoded `"ZMW"` |
| `participant_mode` | ❌ | Add from store |
| `participant_count` | ✅ (headcount only) | Send `null` in detailed mode instead of omitting |
| `accommodation.rooms[].slot_index` | ❌ | Mirror `attendant_idx` |
| `accommodation.rooms[].rate_per_night` | ❌ | Stored as `r.rate`; add to payload |
| `events.sessions[].venue_name` | ❌ | Stored as `s.venueName`; add to payload |
| `events.sessions[].venue_capacity` | ❌ | Stored as `s.venueCapacity`; add to payload |
| `meals.sessions[].arrangements_notes` | ❌ | Stored as `m.arrangementsNotes`; add to payload |
| `accommodation` | Omitted when disabled | Send `null` instead |
| `events` | Omitted when disabled | Send `null` instead |
| `meals` | Omitted when disabled | Send `null` instead |

# Event Booking — API Payload Reference

**Endpoint:** `POST /guest/bookings/event`  
**Content-Type:** `application/json`

---

## Top-Level Fields (always present)

| Field | Type | Values / Notes |
|---|---|---|
| `org_id` | string | Lodge / property ID |
| `branch_id` | string \| null | Property branch ID; null if not applicable |
| `booking_type` | string | Always `"event"` |
| `source` | string | Always `"web"` |
| `currency` | string | Always `"ZMW"` |
| `booking_context` | string | `"individual"` \| `"corporate"` |
| `participant_mode` | string | `"headcount"` \| `"detailed"` |
| `participant_count` | integer \| null | Total attendee count when `participant_mode = "headcount"`; null when detailed |
| `booked_by` | object | Person submitting the booking |
| `attendants` | array | Attendee list — shape differs by participant mode |
| `company` | object \| null | Corporate company snapshot; null for individual |
| `approver` | object \| null | Corporate approver; null for individual |
| `event` | object | Schedule, sessions, notes |

---

## Enum Values

| Field | Allowed values |
|---|---|
| `event.sessions[].event_type` | `"conference"`, `"workshop"`, `"seminar"`, `"gala"`, `"training"`, `"team_building"`, `"retreat"`, `"exhibition"`, `"other"` |
| `event.sessions[].setup_type` | `"boardroom"`, `"theatre"`, `"classroom"`, `"u_shape"`, `"cocktail"`, `"banquet"`, `"hollow_square"`, `"other"` |
| `event.sessions[].pricing_basis` | `"full_day"`, `"half_day"`, `"per_hour"` |
| `event.schedule_mode` | `"uniform"`, `"per_day"` |

---

## Scenario 1 — Individual · Headcount Only · Uniform Schedule

One set of sessions repeats across every day in the booking range.

```json
{
  "org_id":           "lodge-uuid-001",
  "branch_id":        null,
  "booking_type":     "event",
  "source":           "web",
  "currency":         "ZMW",
  "booking_context":  "individual",
  "participant_mode": "headcount",
  "participant_count": 40,

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

  "event": {
    "reason_for_booking": "Annual strategy planning retreat",
    "start_date":         "2025-10-06",
    "end_date":           "2025-10-08",
    "schedule_mode":      "uniform",
    "notes":              "AV equipment required in all sessions.",
    "sessions": [
      {
        "event_name":           "Morning Plenary",
        "event_type":           "conference",
        "event_date":           "2025-10-06",
        "start_time":           "08:00",
        "end_time":             "12:00",
        "expected_attendees":   40,
        "setup_type":           "theatre",
        "venue_id":             "venue-uuid-201",
        "venue_name":           "The Baobab Hall",
        "venue_capacity":       80,
        "pricing_basis":        "half_day",
        "special_requirements": null
      },
      {
        "event_name":           "Morning Plenary",
        "event_type":           "conference",
        "event_date":           "2025-10-07",
        "start_time":           "08:00",
        "end_time":             "12:00",
        "expected_attendees":   40,
        "setup_type":           "theatre",
        "venue_id":             "venue-uuid-201",
        "venue_name":           "The Baobab Hall",
        "venue_capacity":       80,
        "pricing_basis":        "half_day",
        "special_requirements": null
      },
      {
        "event_name":           "Morning Plenary",
        "event_type":           "conference",
        "event_date":           "2025-10-08",
        "start_time":           "08:00",
        "end_time":             "12:00",
        "expected_attendees":   40,
        "setup_type":           "theatre",
        "venue_id":             "venue-uuid-201",
        "venue_name":           "The Baobab Hall",
        "venue_capacity":       80,
        "pricing_basis":        "half_day",
        "special_requirements": null
      }
    ]
  }
}
```

> **How uniform sessions are sent:** The frontend expands the master session template across each day between `start_date` and `end_date` (inclusive). Each expanded entry gets an `event_date` injected. The backend receives a flat list of date-stamped sessions — it does not receive the master template itself.

---

## Scenario 2 — Individual · Headcount Only · Per-Day Schedule

Different sessions on different days. Days can be excluded entirely. The `sessions` array contains only non-excluded days; each day's entries may differ.

```json
{
  "org_id":           "lodge-uuid-001",
  "branch_id":        null,
  "booking_type":     "event",
  "source":           "web",
  "currency":         "ZMW",
  "booking_context":  "individual",
  "participant_mode": "headcount",
  "participant_count": 25,

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

  "event": {
    "reason_for_booking": "Product launch workshop series",
    "start_date":         "2025-10-06",
    "end_date":           "2025-10-08",
    "schedule_mode":      "per_day",
    "notes":              null,
    "sessions": [
      {
        "event_name":           "Kickoff Session",
        "event_type":           "workshop",
        "event_date":           "2025-10-06",
        "start_time":           "09:00",
        "end_time":             "17:00",
        "expected_attendees":   25,
        "setup_type":           "classroom",
        "venue_id":             "venue-uuid-201",
        "venue_name":           "The Baobab Hall",
        "venue_capacity":       40,
        "pricing_basis":        "full_day",
        "special_requirements": "Projector and whiteboard required"
      },
      {
        "event_name":           "Breakout Groups",
        "event_type":           "workshop",
        "event_date":           "2025-10-06",
        "start_time":           "14:00",
        "end_time":             "17:00",
        "expected_attendees":   12,
        "setup_type":           "boardroom",
        "venue_id":             "venue-uuid-202",
        "venue_name":           "Boardroom A",
        "venue_capacity":       14,
        "pricing_basis":        "half_day",
        "special_requirements": null
      },
      {
        "event_name":           "Synthesis Day",
        "event_type":           "conference",
        "event_date":           "2025-10-08",
        "start_time":           "09:00",
        "end_time":             "13:00",
        "expected_attendees":   25,
        "setup_type":           "theatre",
        "venue_id":             "venue-uuid-201",
        "venue_name":           "The Baobab Hall",
        "venue_capacity":       40,
        "pricing_basis":        "half_day",
        "special_requirements": null
      }
    ]
  }
}
```

> **Notes on per-day:**
> - 2025-10-07 is absent from `sessions` because it was excluded (marked as a rest day by the user).
> - Multiple sessions on the same `event_date` are allowed (e.g., both Kickoff Session and Breakout Groups on 2025-10-06).
> - When a day has no override set, the master sessions are used (same as uniform). When a day has an override with `excluded: true`, it is omitted entirely from the flat sessions list.

---

## Scenario 3 — Individual · Individual Records · Uniform Schedule

```json
{
  "org_id":           "lodge-uuid-001",
  "branch_id":        null,
  "booking_type":     "event",
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

  "event": {
    "reason_for_booking": null,
    "start_date":         "2025-10-06",
    "end_date":           "2025-10-06",
    "schedule_mode":      "uniform",
    "notes":              null,
    "sessions": [
      {
        "event_name":           "Team Building Day",
        "event_type":           "team_building",
        "event_date":           "2025-10-06",
        "start_time":           "09:00",
        "end_time":             "16:00",
        "expected_attendees":   3,
        "setup_type":           "other",
        "venue_id":             null,
        "venue_name":           null,
        "venue_capacity":       null,
        "pricing_basis":        "full_day",
        "special_requirements": null
      }
    ]
  }
}
```

---

## Scenario 4 — Corporate · Headcount Only · Per-Day Schedule

```json
{
  "org_id":           "lodge-uuid-001",
  "branch_id":        "branch-uuid-002",
  "booking_type":     "event",
  "source":           "web",
  "currency":         "ZMW",
  "booking_context":  "corporate",
  "participant_mode": "headcount",
  "participant_count": 60,

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

  "event": {
    "reason_for_booking": "Annual company conference",
    "start_date":         "2025-11-03",
    "end_date":           "2025-11-05",
    "schedule_mode":      "per_day",
    "notes":              "Reserved parking required for VIP delegates.",
    "sessions": [
      {
        "event_name":           "Opening Ceremony",
        "event_type":           "conference",
        "event_date":           "2025-11-03",
        "start_time":           "09:00",
        "end_time":             "12:00",
        "expected_attendees":   60,
        "setup_type":           "theatre",
        "venue_id":             "venue-uuid-201",
        "venue_name":           "The Baobab Hall",
        "venue_capacity":       100,
        "pricing_basis":        "half_day",
        "special_requirements": "Stage and podium required"
      },
      {
        "event_name":           "Departmental Breakouts",
        "event_type":           "workshop",
        "event_date":           "2025-11-04",
        "start_time":           "09:00",
        "end_time":             "17:00",
        "expected_attendees":   15,
        "setup_type":           "boardroom",
        "venue_id":             "venue-uuid-202",
        "venue_name":           "Boardroom A",
        "venue_capacity":       20,
        "pricing_basis":        "full_day",
        "special_requirements": null
      },
      {
        "event_name":           "Closing Gala",
        "event_type":           "gala",
        "event_date":           "2025-11-05",
        "start_time":           "18:00",
        "end_time":             "23:00",
        "expected_attendees":   60,
        "setup_type":           "banquet",
        "venue_id":             "venue-uuid-203",
        "venue_name":           "Sunset Terrace",
        "venue_capacity":       80,
        "pricing_basis":        "per_hour",
        "special_requirements": "Live band setup"
      }
    ]
  }
}
```

---

## Scenario 5 — Corporate · Individual Records · Uniform Schedule

```json
{
  "org_id":           "lodge-uuid-001",
  "branch_id":        "branch-uuid-002",
  "booking_type":     "event",
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
      "dietary_notes":   null,
      "company":         "Copper Belt Supplies Ltd",
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
    "branch_name":     null,
    "department_name": null,
    "cost_center":     null,
    "gl_code":         null
  },

  "approver": {
    "name":  "Dr. Francis Ng'uni",
    "email": "fnguni@acmecorp.zm",
    "phone": "+260977888999",
    "title": "Head of HR"
  },

  "event": {
    "reason_for_booking": "Leadership training programme",
    "start_date":         "2025-11-10",
    "end_date":           "2025-11-10",
    "schedule_mode":      "uniform",
    "notes":              null,
    "sessions": [
      {
        "event_name":           "Leadership Workshop",
        "event_type":           "training",
        "event_date":           "2025-11-10",
        "start_time":           "08:30",
        "end_time":             "16:30",
        "expected_attendees":   3,
        "setup_type":           "u_shape",
        "venue_id":             "venue-uuid-202",
        "venue_name":           "Boardroom A",
        "venue_capacity":       14,
        "pricing_basis":        "full_day",
        "special_requirements": "Flip chart and markers"
      }
    ]
  }
}
```

---

## Field Reference

### `event` Object

| Field | Type | Notes |
|---|---|---|
| `reason_for_booking` | string \| null | Purpose statement; optional |
| `start_date` | string (YYYY-MM-DD) \| null | Event period start |
| `end_date` | string (YYYY-MM-DD) \| null | Event period end; same as start for single-day |
| `schedule_mode` | string | `"uniform"` \| `"per_day"` |
| `notes` | string \| null | General booking notes |
| `sessions` | array | Flat list of date-stamped session objects |

### `event.sessions[]` Item

| Field | Type | Required | Notes |
|---|---|---|---|
| `event_name` | string \| null | Optional | Display name for the session |
| `event_type` | string | Required | See enum table above |
| `event_date` | string (YYYY-MM-DD) \| null | Injected | Date this session falls on |
| `start_time` | string (HH:MM) | Required | 24-hour format |
| `end_time` | string (HH:MM) | Required | 24-hour format |
| `expected_attendees` | integer \| null | Required | Headcount for this specific session |
| `setup_type` | string | Required | See enum table above |
| `venue_id` | string \| null | Optional | UUID from lodge venue list |
| `venue_name` | string \| null | Optional | Display name at time of booking |
| `venue_capacity` | integer \| null | Optional | Capacity at time of booking |
| `pricing_basis` | string | Required | `"full_day"` \| `"half_day"` \| `"per_hour"` |
| `special_requirements` | string \| null | Optional | Free-text requirements |

### `attendants[]` Item

| Field | Type | Required |
|---|---|---|
| `full_name` | string \| null | Lead: required. Non-lead: required (name only minimum) |
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

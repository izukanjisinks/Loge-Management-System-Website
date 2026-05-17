# Booking Creation Flow — Backend Spec

## Overview

The booking dialog operates as a multi-step form that handles two client types:
- **Individual** — a single guest booking a single room
- **Corporate** — a company booking on behalf of multiple employees (guests), each with their own room and stay dates

The frontend sends a **single payload** to `POST /api/v1/bookings`. The backend is responsible for:
1. Looking up or creating the client (individual or corporate)
2. For corporate bookings, creating each guest as an individual client record and linking them
3. Creating the booking record(s) and returning the result

---

## Client Search (Pre-flight)

Before the user fills in client details, they can search for an existing client:

- **Individual**: search by NRC or passport number → `GET /api/v1/clients/individual?search=<query>`
- **Corporate**: search by company name → `GET /api/v1/clients/corporate?search=<query>`

If a match is found, the form fields are prefilled and `client_id` is populated.

If **no match is found**, the user fills in the details manually. In this case `client_id` is omitted from the payload and the backend must create the client on the fly before creating the booking.

---

## Payload Structure

### Individual Booking

Sent to: `POST /api/v1/bookings`

```json
{
  "client_type": "individual",

  // Omit client_id if client does not exist yet — backend creates client on the fly
  "client_id": "uuid | omitted",

  // Included only when client_id is omitted (new client)
  "client": {
    "full_name": "John Banda",
    "email": "john@example.com",
    "phone": "+260971234567",
    "id_passport_number": "123456/78/1"
  },

  "room_id": "uuid",
  "check_in": "2026-05-10T00:00:00.000Z",
  "check_out": "2026-05-14T00:00:00.000Z",
  "guests": 1
}
```

**Backend behaviour:**
1. If `client_id` is present — look up the existing individual client, use it directly.
2. If `client_id` is absent — create a new `IndividualClient` from `client`, then use the new ID.
3. Create the booking record linked to the client.
4. Return the full `Booking` object.

---

### Corporate Booking

Sent to: `POST /api/v1/bookings`

```json
{
  "client_type": "corporate",

  // Omit client_id if company does not exist yet — backend creates it on the fly
  "client_id": "uuid | omitted",

  // Included only when client_id is omitted (new corporate client)
  "client": {
    "company_name": "Acme Corporation",
    "contact_person": "Jane Mwale",
    "email": "jane@acme.com",
    "phone": "+260211234567",
    "company_reg_number": "120043478",
    "industry": "Mining"
  },

  // Each guest is a separate individual with their own room and dates.
  // guest.client_id is omitted when the guest is new — backend creates an IndividualClient for them.
  "guests": [
    {
      "client_id": "uuid | omitted",
      "full_name": "Alice Phiri",
      "email": "alice@acme.com",
      "phone": "+260971112222",
      "id_number": "654321/89/1",
      "room_id": "uuid",
      "check_in": "2026-05-10T00:00:00.000Z",
      "check_out": "2026-05-12T00:00:00.000Z"
    },
    {
      "client_id": "uuid | omitted",
      "full_name": "Bob Zulu",
      "email": "bob@acme.com",
      "phone": "+260972223333",
      "id_number": "789012/90/1",
      "room_id": "uuid",
      "check_in": "2026-05-11T00:00:00.000Z",
      "check_out": "2026-05-15T00:00:00.000Z"
    }
  ]
}
```

**Backend behaviour:**
1. If `client_id` is present — look up the existing corporate client.
2. If `client_id` is absent — create a new `CorporateClient` from `client`, then use the new ID.
3. For each entry in `guests`:
   - If `guest.client_id` is present — look up the existing individual client.
   - If `guest.client_id` is absent — create a new `IndividualClient` from the guest fields.
   - Create a booking record for that guest linked to both the individual client and the parent corporate client.
4. Return a summary object (see Response section below).

---

## Field Reference

### Shared top-level fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `client_type` | `"individual" \| "corporate"` | Yes | Determines processing path |
| `client_id` | `string (uuid)` | No | Omit when client is new |
| `client` | object | Conditional | Required when `client_id` is absent |

### `client` object — Individual

| Field | Type | Required |
|---|---|---|
| `full_name` | string | Yes |
| `email` | string | No |
| `phone` | string | No |
| `id_passport_number` | string | No |

### `client` object — Corporate

| Field | Type | Required |
|---|---|---|
| `company_name` | string | Yes |
| `contact_person` | string | No |
| `email` | string | No |
| `phone` | string | No |
| `company_reg_number` | string | No |
| `industry` | string | No |

### Individual booking fields

| Field | Type | Required |
|---|---|---|
| `room_id` | string (uuid) | Yes |
| `check_in` | ISO 8601 timestamp | Yes |
| `check_out` | ISO 8601 timestamp | Yes |
| `guests` | `1` | Yes |

### Corporate `guests[]` item fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `client_id` | string (uuid) | No | Omit when guest is new |
| `full_name` | string | Yes |
| `email` | string | No |
| `phone` | string | No |
| `id_number` | string | No | NRC or passport |
| `room_id` | string (uuid) | Yes |
| `check_in` | ISO 8601 timestamp | Yes |
| `check_out` | ISO 8601 timestamp | Yes |

---

## Response

### Individual

Return the standard `Booking` object as currently defined.

### Corporate

Return a summary object wrapping all created bookings:

```json
{
  "corporate_client_id": "uuid",
  "company_name": "Acme Corporation",
  "bookings": [
    {
      "id": "uuid",
      "booking_number": "BK-00123",
      "client_id": "uuid",
      "client_name": "Alice Phiri",
      "room_id": "uuid",
      "room_name": "Room 4",
      "check_in": "2026-05-10T00:00:00.000Z",
      "check_out": "2026-05-12T00:00:00.000Z",
      "nights": 2,
      "room_cost": 600.00,
      "total_amount": 600.00,
      "status": "confirmed"
    },
    {
      "id": "uuid",
      "booking_number": "BK-00124",
      "client_id": "uuid",
      "client_name": "Bob Zulu",
      "room_id": "uuid",
      "room_name": "Suite 1",
      "check_in": "2026-05-11T00:00:00.000Z",
      "check_out": "2026-05-15T00:00:00.000Z",
      "nights": 4,
      "room_cost": 1200.00,
      "total_amount": 1200.00,
      "status": "confirmed"
    }
  ],
  "total_amount": 1800.00
}
```

---

## Error Handling

| Scenario | Expected behaviour |
|---|---|
| `room_id` not found | `404` with descriptive message |
| Room not available for the requested dates | `409` with message indicating the conflict |
| `client_id` provided but not found | `404` with descriptive message |
| `guest.client_id` provided but not found | `404` identifying which guest |
| Corporate `guests` array is empty | `422` — at least one guest is required |
| Missing required fields (`company_name`, `full_name`, etc.) | `422` with field-level errors |
| Partial failure (some guests succeed, some fail) | Roll back all — return `500` or `422` with detail. Do not create partial bookings. |

---

## Notes

- All new clients created on the fly should be set to `status: "active"` by default.
- Corporate guest bookings should each carry a reference to the parent `corporate_client_id` so the front-end can group them and display them together in the bookings list.
- The `booking_number` for each guest booking should be independently generated (not shared).
- Dates are always sent as ISO 8601 UTC timestamps from the frontend.
- The `guests` field on the top-level `Booking` record for an individual should always be `1`. For a corporate booking response, `guests` on each child booking is also `1` (it represents that specific guest).

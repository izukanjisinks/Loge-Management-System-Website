# Mwakwanda Lodge Management System — Website Documentation

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Routing & Navigation](#routing--navigation)
5. [Authentication](#authentication)
6. [State Management](#state-management)
7. [Pages & Views](#pages--views)
8. [Components](#components)
9. [Composables](#composables)
10. [API Layer](#api-layer)
11. [Firebase Integration](#firebase-integration)
12. [Booking Flows](#booking-flows)
13. [Theming & Styling](#theming--styling)
14. [Mock Data & Development Mode](#mock-data--development-mode)

---

## Overview

Mwakwanda is a **hospitality booking platform** for a luxury lodge management company. Guests can browse properties, check room availability by date, view event venues, and make reservations — either as individuals or as corporate clients with multi-service bookings (accommodation + conference events + meals).

The site connects to a Go backend via a RESTful API (`/api/v1/...`). All protected pages require a valid JWT auth token. Unauthenticated visitors can browse properties and rooms freely; they are redirected to `/login` only when they attempt to start a booking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build Tool | Vite 8 / Rolldown |
| State Management | Pinia 3 |
| Routing | Vue Router 4 |
| Styling | Tailwind CSS v4 (CSS variable theme) |
| UI Primitives | Reka UI (headless, accessible components) |
| Icons | Google Material Symbols Outlined (font) |
| HTTP Client | Axios (with request/response interceptors) |
| Date Handling | `@internationalized/date` |
| PDF Generation | `@ceereals/vue-pdf` |
| File Storage | Firebase Storage (`uploadBytesResumable`) |
| Utilities | `@vueuse/core`, `clsx`, `tailwind-merge` |

**Environment variables** (`.env`):
```
VITE_API_BASE_URL=http://localhost:8081/api/v1
VITE_USE_MOCK=false
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

---

## Project Structure

```
src/
├── App.vue                          # Root — just <RouterView />
├── main.js                          # App bootstrap: Vue, Pinia, Router
├── assets/main.css                  # Global CSS, design tokens, scroll animations
│
├── router/index.js                  # All routes + auth guards
│
├── layouts/
│   ├── AppLayout.vue                # Main layout: navbar + <slot> + footer + mobile nav
│   └── AuthLayout.vue               # Auth layout: decorative left panel + form right
│
├── stores/                          # Pinia stores (see State Management section)
│   ├── auth.js
│   ├── booking.js                   # Legacy simple booking (ReservationView)
│   ├── individualBooking.js         # Multi-service individual booking wizard
│   ├── corporateBooking.js          # Multi-service corporate booking wizard
│   ├── lodges.js                    # Lodge+branch cache
│   ├── reservations.js              # Booking history
│   └── mealPlans.js                 # Stub (not yet implemented)
│
├── composables/
│   ├── useClickOutside.js           # Closes dropdowns when clicking outside
│   ├── usePricing.js                # Reactive pricing calculator
│   ├── useRooms.js                  # Room/lodge fetch helpers
│   └── useScrollReveal.js           # Scroll-triggered fade-in animations
│
├── lib/
│   ├── api.js                       # Axios instance with auth + 401 interceptors
│   ├── firebase.js                  # Firebase app + Storage initialisation
│   └── mockAdapter.js               # Dev mock API (toggled by VITE_USE_MOCK)
│
├── services/
│   └── storage.js                   # Firebase document upload wrapper
│
├── views/                           # One file per page/route
│   ├── HomeView.vue
│   ├── AboutView.vue
│   ├── LodgesView.vue
│   ├── LodgeDetailView.vue
│   ├── RoomsView.vue
│   ├── RoomDetailView.vue
│   ├── VenuesView.vue
│   ├── VenueDetailView.vue
│   ├── ExploreView.vue
│   ├── LoginView.vue
│   ├── RegisterView.vue
│   ├── IndividualBookingView.vue
│   ├── CorporateBookingView.vue
│   ├── ReservationView.vue
│   ├── BookingsView.vue
│   ├── BookingDetailView.vue
│   ├── AccountView.vue
│   └── NotFoundView.vue
│
├── components/
│   ├── layout/                      # AppNavbar, AppFooter, MobileBottomNav
│   ├── home/                        # HeroSection, SearchBar, PropertyGrid, etc.
│   ├── rooms/                       # RoomCard
│   ├── venues/                      # VenueCard
│   ├── booking/                     # BookingTypeModal
│   ├── reservation/                 # All booking-flow sub-forms & invoice
│   └── ui/                          # Base components + Reka UI wrappers
│       └── calendar/                # Calendar, RangeCalendar, sub-components
│
└── data/
    ├── dummyData.js                 # Mock lodges, rooms, bookings, venues
    ├── dummyCorporateData.js        # Mock companies, branches, menu items
    └── bookingConstants.js          # Enums: event types, setup types, meal periods
```

---

## Routing & Navigation

Two top-level layout routes share the same path prefix but different layout components.

### AppLayout routes (public + protected)

| Path | Name | Auth | View |
|---|---|---|---|
| `/` | `home` | No | HomeView |
| `/about` | `about` | No | AboutView |
| `/lodges` | `lodges` | No | LodgesView |
| `/lodges/:id` | `lodge-detail` | No | LodgeDetailView |
| `/lodges/:id/individual` | `individual-booking` | **Yes** | IndividualBookingView |
| `/lodges/:id/corporate` | `corporate-booking` | **Yes** | CorporateBookingView |
| `/rooms` | `rooms` | No | RoomsView |
| `/rooms/:id` | `room-detail` | No | RoomDetailView |
| `/venues` | `venues` | No | VenuesView |
| `/venues/:id` | `venue-detail` | No | VenueDetailView |
| `/explore` | `explore` | No | ExploreView |
| `/reserve/:roomId` | `reservation` | **Yes** | ReservationView |
| `/bookings` | `bookings` | **Yes** | BookingsView |
| `/bookings/:id` | `booking-detail` | **Yes** | BookingDetailView |
| `/account` | `account` | **Yes** | AccountView |

### AuthLayout routes

| Path | Name | View |
|---|---|---|
| `/login` | `login` | LoginView |
| `/register` | `register` | RegisterView |

### Auth guards (`router.beforeEach`)

- If `to.meta.requiresAuth` is true and `auth.isAuthenticated` is false → redirect to `/login?redirect={originalPath}`
- If user is already authenticated and navigates to `login` or `register` → redirect to `/`
- `router.afterEach` scrolls `main` to the top after every navigation

---

## Authentication

**Store:** `src/stores/auth.js`

### State
- `token` — JWT stored in `localStorage`
- `user` — user object stored in `localStorage` (normalised: `full_name` → `firstName`, `lastName`, `name`)
- `isAuthenticated` — computed: `!!token.value`

### Actions

| Action | Endpoint | Description |
|---|---|---|
| `login(email, password)` | `POST /web/auth/login` | Stores token + normalised user |
| `register(payload)` | `POST /web/auth/register` | Creates account, auto-logs in |
| `fetchUser()` | `GET /web/profile` | Refreshes user object |
| `updateProfile(payload)` | `PUT /web/profile` | Updates name/phone |
| `changePassword(old, new)` | `PUT /web/auth/change-password` | Password update |
| `logout()` | — | Clears localStorage and state |

### API interceptors (`src/lib/api.js`)
- **Request:** Attaches `Authorization: Bearer {token}` header if token exists
- **Response 401:** If not an auth endpoint and token is present, clears the session and redirects to `/login`

---

## State Management

### `useAuthStore` — user session
Covered in the Authentication section above.

---

### `useBookingStore` — simple booking (legacy)
Used by `ReservationView` for quick one-room bookings started from room cards.

**Key state:** `roomId`, `lodgeId`, `lodgeName`, `roomType`, `baseRatePerNight`, `checkIn`, `checkOut`, `guestCount`, `mealPlanId`, `mealPlanRate`, `guestInfo` (name, email, phone, nationality, passportId)

**Computed pricing:**
```
nightCount   = days between checkIn and checkOut
baseTotal    = nightCount × baseRatePerNight
mealCost     = mealPlanRate × guestCount × nightCount
taxes        = (baseTotal + mealCost) × 0.12   // 12% VAT
grandTotal   = baseTotal + mealCost + taxes
```

**Key action:** `setRoom(id, type, rate, orgId, orgName)` — called from lodge/room pages before routing to `/reserve/:roomId`

---

### `useIndividualBookingStore` — multi-service individual booking
Powers the `IndividualBookingView` multi-step wizard.

**Services:** A booking can combine any subset of accommodation, events (conference sessions), and meals.

**Attendant model:**
```js
{ fullName, email, phone, idNumber, dietaryNotes, company, isLead }
```
- `participantMode`: `'headcount'` (just a number) or `'detailed'` (per-person list)
- `attendantRooms`: Maps an attendant index to a room assignment `{roomId, roomName, roomType, rate}`

**Accommodation:**
```js
{ checkIn, checkOut, notes }
// room assigned per attendant via attendantRooms[]
```

**Events (conference sessions):**
```js
{
  reasonForBooking, startDate, endDate,
  scheduleMode: 'uniform' | 'per_day',
  masterSessions: [{ sessionName, eventType, startTime, endTime, expectedAttendees,
                     setupType, venueId, venueName, venueCapacity, pricingBasis,
                     specialRequirements }],
  dayOverrides: { 'YYYY-MM-DD': { excluded: bool, sessions: [...] } }
}
```
`flattenSessions(events)` expands the master template across each date in the range, respecting per-day overrides and excluded dates.

**Meals:**
```js
{
  reasonForBooking,
  mealMode: 'event_linked' | 'standalone',
  startDate, endDate,   // standalone only
  scheduleMode: 'uniform' | 'per_day',
  masterMeals: [{ sessionName, mealPeriod, serviceType, paxCount,
                  linkedMasterSessionIndex, dietaryNotes, arrangementsNotes,
                  individualOrders: [] }],
  mealOverrides: { 'YYYY-MM-DD': { excluded: bool, sessions: [...] } }
}
```
`flattenMeals(meals, events)` works the same way, but can inherit date range from the events service when `mealMode === 'event_linked'`.

**Submission:** `POST /guest/bookings/individual` with flattened attendants, sessions, and meals arrays.

---

### `useCorporateBookingStore` — multi-service corporate booking
Powers `CorporateBookingView`. Identical service structure to individual but adds a full company layer.

**Company hierarchy state:**
```
selectedCompanyId → selectedBranchId → selectedProfileId
       ↓                   ↓                  ↓
  companyName          branchName        departmentName
  tpin                 companyPhone      costCenter
  industry             companyEmail      glCode
  city                                   approverName/Email/Phone/Title
  streetAddress
```

`fillFromProfile(company, branch, profile)` populates all snapshot fields from the selected company profile — values can be overridden by the rep before submission.

**Booker (`bookedBy`):** Auto-filled from the auth user on mount: `{ name, email, phone, jobTitle }`

**Documents:** Corporate bookings can have file attachments (Firebase Storage). Files are uploaded during the "Confirm" step and their download URLs are included in the submission payload.

**Submission:** `POST /guest/bookings/corporate?corporate_type={type}` where `corporate_type` is one of:
- `accommodation` — standard room booking with booked_by + authoriser
- `meals` — catering/dining service booking
- `conference` — conference/event session booking

---

### `useLodgesStore` — lodge + branch cache

Fetches all lodges once and caches them for the session, avoiding redundant API calls across pages.

```js
fetchLodges()          // GET /guest/lodges?page=1&page_size=100 (no-op if already loaded)
fetchLodgeDetail(id)   // GET /guest/lodges/{id} — updates branches for that lodge
branchesFor(lodgeId)   // Returns branches array or [] for the given lodge
```

Used by both `LodgeDetailView` (branch filter dropdown) and `RoomsView` (lodge + branch selectors).

---

### `useReservationsStore` — booking history

```js
fetchAll()      // GET /guest/bookings — splits into active[] and past[]
cancel(id)      // PATCH /guest/bookings/{id}/cancel — then refetches
create(payload) // POST /guest/bookings or /guest/bookings/corporate (legacy)
```

After fetching, room images are loaded in parallel via `Promise.allSettled` so one missing image doesn't break the list.

Status categories:
- **Active:** `pending`, `confirmed`, `checked_in`
- **Past:** `checked_out`, `cancelled`

---

## Pages & Views

### HomeView
The landing page. Displays a hero banner, three discovery cards (Rooms, Venues, Everything), a "Why Choose Us" section, and a properties strip with a CTA to `/lodges`. Scroll-reveal animations (`useScrollReveal`) fade content in as the user scrolls.

---

### AboutView
Static informational page with a full-width hero image, company story, and a values section (four value cards with Material icons). Team and leadership sections exist in the code but are currently commented out.

---

### LodgesView
Paginated grid of all properties. Each card shows the lodge logo, name, address, email, and a "View Property" button to `/lodges/:id`. Search input debounces and re-fetches from `/guest/lodges?search={q}`. Skeleton loaders are shown on initial load.

---

### LodgeDetailView
The most feature-rich public page.

**Header:** Hero image with back button, lodge name, and address.

**Availability checker:** Check-in and check-out date pickers (with min/max constraints) and a branch selector dropdown (populated from `useLodgesStore`). "Check Availability" re-fetches rooms with the date params.

**Booking CTAs:**
- "Book as Individual Guest" → opens `BookingTypeModal`
- "Corporate & Group Bookings" → opens `BookingTypeModal` (disabled if the lodge has branches but none is selected yet)

**Tabs:**
- **Rooms** — Paginated room grid. Each room card has a "Reserve" button that opens `BookingTypeModal`. After the modal, the user is routed to `/lodges/:id/individual` or `/lodges/:id/corporate` with query params: `roomId`, `roomName`, `roomType`, `rate`, `checkIn`, `checkOut`.
- **Venues** — Grid of event spaces with type, location, and capacity badges.

---

### RoomsView
Filterable catalog of all rooms across all properties.

**Sidebar filters:** Lodge dropdown → Branch dropdown (populated from selected lodge), Room Type, Price Range slider, Available Only toggle.

**Main area:** Paginated grid of room cards. Filters trigger a re-fetch via `useRooms().fetchRooms(params)`.

---

### RoomDetailView
Full-detail room page with a lightbox gallery.

**Gallery:** Multiple images with a thumbnail strip. Keyboard arrow navigation. Click outside or press Escape to close lightbox.

**Booking widget (right sidebar):**
- `RangeCalendar` for date selection — marks booked dates as unavailable
- Guest count stepper
- Real-time pricing breakdown (`usePricing`) — nights × rate + meal plan + 12% tax
- "Reserve" button (disabled until dates are selected) → `BookingTypeModal`

---

### VenuesView
Filterable list of event venues. Left sidebar filters: Venue Type (radio), Location Type (radio — indoor/outdoor/semi-outdoor), Minimum Capacity (number input), Event Type (dropdown). Cards show capacity, amenities, and a "View Details" link.

---

### VenueDetailView
Venue details page with gallery, capacity details, setup configuration table (theatre/classroom/boardroom counts), and an enquiry CTA that opens `BookingTypeModal`.

---

### ExploreView
Combined rooms + venues browser. Filter bar with a search input, tab toggles (All / Rooms / Venues), capacity filter, and location type filter (for venues). Shows separate sections for rooms and venues with independent pagination.

---

### LoginView
Two-mode form toggled by an internal `mode` ref:

**Login mode:**
- Email + password inputs with field-level validation
- "Forgot password?" link switches to reset mode
- Password visibility toggle
- Calls `auth.login()`, then redirects to `?redirect` param or `/`

**Reset password mode:**
- Email input only
- Sends `POST /web/auth/reset-password`
- Shows a success confirmation with the email address displayed
- Back link returns to login mode

---

### RegisterView
Account creation form: First Name, Last Name, Email, Phone, Password, Confirm Password. Password strength meter (0–5 score) with a colored bar. Full client-side validation before calling `auth.register()`.

---

### IndividualBookingView
Multi-step booking wizard for individual/small-group bookings. Backed by `useIndividualBookingStore`.

**Step 1 — Services & Details (tabbed)**

| Tab | Fields |
|---|---|
| **Guest** | Booked-by info (name, email, phone); attendants list (add/remove); participant mode toggle (headcount vs per-person) |
| **Accommodation** | Check-in/out dates; available rooms fetched by date range; room assignment per attendant |
| **Events** | Reason for booking; date range; master session template; schedule mode (uniform / per-day); per-day overrides |
| **Meals** | Meal mode (event-linked / standalone); master meal template; per-day overrides |

Tabs only appear when the corresponding service checkbox is enabled. Each tab shows an error indicator if validation fails.

**Step 2 — Confirm**
Summary of all entered details. Submit button calls `store.submit()` → `POST /guest/bookings/individual`.

---

### CorporateBookingView
Same tab/step structure as `IndividualBookingView` but powered by `useCorporateBookingStore` with an additional Organisation tab.

**Organisation tab:**
- TPIN lookup — searches the dummy company database, populates company snapshot fields
- Branch selector
- Department, cost center, GL code, approver details
- Document upload section (files uploaded to Firebase Storage on confirm)

**Submission:** `POST /guest/bookings/corporate?corporate_type={accommodation|meals|conference}`

---

### ReservationView
Lightweight confirmation page used after a quick "Reserve" from a room card (without going through the full multi-step wizard). Displays room, dates, guest count, pricing breakdown, and a final "Confirm Reservation" button that calls `reservations.create()`.

---

### BookingsView
User's reservation history in two sections:

**Active Reservations:** Upcoming stays (pending/confirmed/checked-in). Each card shows room image, status badge, dates, guest count, meal plan, and number of nights. Pending and confirmed reservations have a "Cancel" button.

**Past Journeys:** Historical stays (checked-out/cancelled). Cards with a "Book Again" button that links back to the room detail page.

---

### BookingDetailView
Full reservation details for a single booking. Includes PDF invoice generation via `BookingInvoiceDocument` and print/download options.

---

### AccountView
Profile management page with two sections:

- **Personal Information:** Edit display name and phone number
- **Change Password:** Old password + new password + confirm, with strength meter. Both sections show inline success/error feedback.

---

## Components

### Layout

**`AppNavbar`** — Sticky header with logo, desktop nav links, and auth controls.
- Authenticated: User avatar (initials), dropdown with "My Account", "My Bookings", "Sign Out"
- Unauthenticated: "Sign In" button
- Mobile: Hamburger icon that reveals an overlay nav

**`AppFooter`** — Footer with branding, nav links, social links, and copyright. Hidden on the home page.

**`MobileBottomNav`** — Fixed bottom tab bar visible only on small screens. Quick links to main sections.

---

### Booking

**`BookingTypeModal`** — Dialog that appears when the user clicks "Reserve" or a venue enquiry CTA. Presents two choices: "Individual Booking" and "Corporate Booking". Emits the chosen type to the parent, which then routes to the appropriate booking view.

---

### Reservation sub-components

| Component | Purpose |
|---|---|
| `StayDetailsForm` | Check-in/out date pickers + guest count |
| `GuestInfoForm` | Name, email, phone, passport, nationality |
| `MealPlanSelector` | Meal plan radio/dropdown |
| `PreferencesForm` | Special requests textarea |
| `ReservationSummary` | Pricing breakdown + `PDFDownloadLink` button |
| `BookingInvoiceDocument` | PDF-renderable invoice (lodge name, guest details, cost breakdown) |

`BookingInvoiceDocument` uses `@ceereals/vue-pdf` primitives (`Document`, `Page`, `View`, `Text`). Because the PDF renderer does not support Vue's `v-if` on `Text` nodes, conditional content is handled with ternary expressions: `{{ condition ? value : ' ' }}` (a space, not an empty string).

---

### Room & Venue Cards

**`RoomCard`** — Displays room image, name, type, capacity, amenities row, price per night, and a "Reserve" button. Falls back to an Unsplash stock photo if no image is provided.

**`VenueCard`** — Displays venue image, type badge, location badge, capacity, amenity icons, and a "View Details" link.

---

### Base UI Components

**`BaseInput`** — Labeled input field with placeholder, error message display, and validation styling. Used consistently across all forms.

**`BaseButton`** — Polymorphic button (renders as `<button>`, `<RouterLink>`, or any component via the `as` prop). Variants: `primary` (filled), `secondary` (outlined), `ghost` (text).

**`BaseCard`** — Card container with rounded corners and consistent padding.

**`StatusBadge`** — Color-coded status chip. Colors by status:
- `pending` → amber
- `confirmed` → blue
- `checked_in` → green
- `checked_out` → slate
- `cancelled` → red

---

### Calendar Components (Reka UI)

`Calendar` — Single-date picker with month navigation and min/max constraints. Used for individual date fields (check-in, check-out) via a `Popover`.

`RangeCalendar` — Start+end date selection in a single calendar. Used on the room detail page booking widget. Marks pre-booked date ranges as unavailable.

Sub-components: `CalendarGrid`, `CalendarHeader`, `CalendarCell`, `CalendarCellTrigger`, `CalendarPrevButton`, `CalendarNextButton`, and more — all assembled by the parent `Calendar`/`RangeCalendar` components.

---

## Composables

### `useClickOutside(targetRef, handler)`
Attaches a `mousedown` listener to `document` on mount. Calls `handler` if the click is outside `targetRef.value`. Cleans up on unmount. Used for closing dropdowns and search overlays.

---

### `usePricing(checkIn, checkOut, baseRate, guestCount, mealPlan)`
Reactive pricing calculator used on `RoomDetailView`.

Returns: `{ nightCount, baseTotal, mealCost, taxes, grandTotal }`

Hardcoded meal plan rates:
- `full_board`: ZMW 85/person/night
- `half_board`: ZMW 45/person/night
- `breakfast_only`: ZMW 20/person/night
- `room_only`: ZMW 0

Tax rate: 12% on (room total + meal total)

---

### `useRooms()`
A collection of four composables returned from the same file:

- **`useLodges()`** — Fetches `GET /guest/lodges`. Returns `{ lodges, total, loading, error, fetchLodges(params) }`.
- **`useRooms()`** — Paginated room fetcher. Returns `{ rooms, total, page, pageSize, totalPages, loading, error, fetchRooms(params) }`.
- **`useRoom()`** — Single room by ID. Returns `{ room, loading, error, fetchRoom(id) }`.
- **`useAvailableRooms()`** — Availability check for a date range + org. Returns `{ available, loading, error, searched, fetchAvailable(checkIn, checkOut, orgId) }`.

Helper exports:
- **`amenityIcon(name)`** — Maps amenity label strings to Material Symbol icon names
- **`roomImage(room, index)`** — Returns first room image URL or a deterministic Unsplash fallback

---

### `useScrollReveal()`
Adds an `IntersectionObserver` that watches all elements with the `.reveal` CSS class. When an element enters the viewport (threshold: 12%), the `.visible` class is added, which triggers a CSS fade-in + slide-up transition. A `MutationObserver` watches for newly added `.reveal` elements in case the DOM changes after mount.

---

## API Layer

### `src/lib/api.js`
Axios instance configured with:
- `baseURL`: `VITE_API_BASE_URL`
- **Request interceptor:** Reads token from `useAuthStore` and adds `Authorization: Bearer {token}`
- **Response interceptor:** On HTTP 401 (when a token exists and the failing URL is not an auth endpoint), calls `auth.logout()` and redirects to `/login`

The same instance is used everywhere — stores, composables, and views all import `api` from this file.

---

## Firebase Integration

### `src/lib/firebase.js`
Initialises a Firebase app using env vars. Exports `storage` — a Firebase Storage instance.

### `src/services/storage.js`

```js
uploadBookingDocument(file, onProgress) → Promise<downloadURL>
```

- Generates a random ID: `{randomId}.{ext}`
- Uploads to `bookings/documents/{filename}` in Firebase Storage using `uploadBytesResumable`
- Reports progress (0–100) via the `onProgress` callback
- Resolves with the public download URL on completion

Used during the **CorporateBookingView confirm step** — documents are uploaded before the booking payload is submitted to the backend. Download URLs are included in the `documents` array in the request body.

**Required Firebase Storage rules** (set in the Firebase console):
```
match /bookings/documents/{file} {
  allow read, write: if true;
}
```

---

## Booking Flows

### Individual Booking Flow

```
RoomCard / LodgeDetailView
  ↓ "Reserve" button
BookingTypeModal — user selects "Individual"
  ↓ router.push
/lodges/:id/individual?roomId=&roomName=&roomType=&rate=&checkIn=&checkOut=
  ↓
IndividualBookingView
  Step 1: Fill in Guest / Accommodation / Events / Meals tabs
  Step 2: Review & Confirm
  ↓ submit()
POST /guest/bookings/individual
  ↓ success
/bookings (reservation list)
```

---

### Corporate Booking Flow

```
LodgeDetailView → "Corporate & Group Bookings"
  ↓
BookingTypeModal — user selects "Corporate"
  ↓ router.push
/lodges/:id/corporate?roomId=&...
  ↓
CorporateBookingView
  Step 1: Fill Organisation / Accommodation / Events / Meals tabs
  Step 2: Review, upload documents, Confirm
          ↓ uploadBookingDocument() for each file (Firebase)
  ↓ submit()
POST /guest/bookings/corporate?corporate_type=accommodation|meals|conference
  ↓ success
/bookings
```

---

### Backend endpoint reference

| Endpoint | Method | Description |
|---|---|---|
| `/guest/bookings` | POST | Individual room booking |
| `/guest/bookings/individual` | POST | Multi-service individual booking |
| `/guest/bookings/corporate` | POST | Corporate booking (all types via `?corporate_type=`) |
| `/guest/bookings` | GET | Fetch current user's bookings |
| `/guest/bookings/:id/cancel` | PATCH | Cancel a booking |
| `/guest/rooms` | GET | Room list (filterable by org_id, branch_id, check_in, check_out) |
| `/guest/lodges` | GET | Lodge list |
| `/guest/lodges/:id` | GET | Single lodge detail |
| `/guest/venues` | GET | Venue list (filterable by org_id, branch_id, type, etc.) |
| `/web/auth/login` | POST | Login |
| `/web/auth/register` | POST | Register |
| `/web/auth/change-password` | PUT | Change password |
| `/web/auth/reset-password` | POST | Password reset |
| `/web/profile` | GET / PUT | Fetch / update user profile |

The `corporate_type` query param routes a single endpoint to three distinct backend handlers:
- `accommodation` → decodes `CorporateAccommodationBody`, triggers accommodation workflow
- `meals` → decodes `CorporateMealsBody`, stores in workflow TaskDetails.Metadata
- `conference` → decodes `CorporateConferenceBody`, stores in workflow TaskDetails.Metadata

---

## Theming & Styling

### Design System
Tailwind CSS v4 is used with a CSS custom property (variable) theme. All brand colors, surface colors, and semantic colors are defined as `--color-*` variables in `src/assets/main.css` inside a `@theme inline` block.

**Brand palette (oklch):**
- Primary: `--color-primary` — warm terra/clay tone
- Secondary, Tertiary — complementary warm tones
- Surface / Container hierarchy — from light mist to dark obsidian
- Error — standard red family

**Custom named colors:**
- `--color-clay-earth`: #A3644D (rich mid-brown)
- `--color-savannah-mist`: #F3EBE3 (warm off-white, used as input background)
- `--color-deep-obsidian`: #1F1A17 (near-black text)

### Usage in Tailwind
Because CSS variable names include hyphens, they are referenced in class names with parentheses:
```html
<div class="bg-(--color-surface-container) text-(--color-on-surface)">
```

Opacity modifiers are NOT used on CSS-variable color classes (e.g., avoid `bg-(--color-primary)/20`) because the Vite/Vue compiler treats the `/` as a template closing token.

### Fonts
Inter is loaded for both `font-sans` and `font-serif` utility classes. The `font-serif` class is used for headings to allow a future swap to an actual serif font without code changes.

### Scroll Animations
Elements with the `.reveal` CSS class receive a CSS transition. `useScrollReveal` adds `.visible` when they enter the viewport, triggering:
```css
.reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s, transform 0.6s; }
.reveal.visible { opacity: 1; transform: none; }
```

---

## Mock Data & Development Mode

Set `VITE_USE_MOCK=true` in `.env` to activate the mock API adapter (`src/lib/mockAdapter.js`).

The adapter intercepts all Axios requests and returns mock data with a simulated network delay of 120–700ms. It covers:
- Auth endpoints (login, register, profile, password reset)
- Lodge list + detail
- Room list (with availability filtering by date)
- Venue list (with type/location/capacity filtering)
- Booking create, list, detail, and cancel
- Company search by TPIN (for corporate booking organisation tab)
- Menu items

Mock data sources:
- `src/data/dummyData.js` — lodges, rooms, bookings, venues
- `src/data/dummyCorporateData.js` — companies, branches, cost center profiles, menu items

The mock data shapes match the real API responses exactly, so switching from mock to live only requires setting `VITE_USE_MOCK=false` and pointing `VITE_API_BASE_URL` at the real server.

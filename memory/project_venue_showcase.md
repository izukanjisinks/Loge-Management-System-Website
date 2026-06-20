---
name: project-venue-showcase
description: Public-facing property showcase and booking discovery experience — venues, rooms, and combined explore pages added in June 2026
metadata:
  type: project
---

Added a complete public-facing venue and accommodation discovery experience (June 2026).

**Why:** The site previously only showed lodges and rooms in a backend-style list. The goal was a conversion-focused public showcase with separate Rooms, Venues, and combined Explore pages.

**What was built:**
- `src/data/dummyData.js` — 12 venue records across 6 lodges (ALL_MOCK_VENUES, MOCK_VENUES_BY_ID), varied types: conference, boardroom, banquet, wedding, garden, marquee, training, exhibition, amphitheatre
- `src/lib/mockAdapter.js` — Added `/guest/venues` and `/guest/venues/:id` mock endpoints
- `src/components/venues/VenueCard.vue` — Venue card component (type badge, location badge, capacity chips, suitable events)
- `src/views/VenuesView.vue` — Venues listing with hero banner, sidebar filters (type, location, capacity, event type)
- `src/views/VenueDetailView.vue` — Full detail page: bento gallery + lightbox, capacity configs grid, amenities, suitable events, enquiry CTA sidebar (links to corporate/individual booking flows)
- `src/views/ExploreView.vue` — Combined All/Rooms/Venues browser with search, tab toggles, capacity and location filters
- `src/views/HomeView.vue` — Replaced placeholder with discovery CTA cards (Rooms / Venues / Explore All), property strip, Why Choose Us section
- `src/router/index.js` — Added routes: /rooms, /venues, /venues/:id, /explore
- `src/components/layout/AppNavbar.vue` — Added Rooms, Venues, Properties links
- `src/components/layout/MobileBottomNav.vue` — Updated to Home/Rooms/Venues/Bookings
- `src/components/layout/AppFooter.vue` — Added Accommodation and Venues links in footer

**How to apply:** When extending the venue/rooms discovery experience, check these files. The venue enquiry CTA links to existing corporate-booking and individual-booking flows (no new auth-gated forms needed).

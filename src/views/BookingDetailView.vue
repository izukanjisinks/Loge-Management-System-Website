<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useReservationsStore } from '@/stores/reservations'
import { useRebookStore } from '@/stores/rebook'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import api from '@/lib/api'

const route        = useRoute()
const router       = useRouter()
const reservations = useReservationsStore()
const rebook       = useRebookStore()

const loading = ref(false)

const record = computed(() =>
  [...reservations.active, ...reservations.past].find(r => r.id === route.params.id),
)

onMounted(async () => {
  if (!record.value) {
    loading.value = true
    await reservations.fetchAll()
    loading.value = false
    if (!record.value) router.push({ name: 'bookings' })
  }
  if (record.value?.bookingType === 'meals') fetchMenuItems()
})

// Full metadata blob from the backend
const meta = computed(() => record.value?.metadata || {})

// Corporate convenience accessors
const company       = computed(() => meta.value.company       || null)
const approver      = computed(() => meta.value.approver      || null)
const bookedBy      = computed(() => meta.value.booked_by     || null)
const attendants    = computed(() => meta.value.attendants    || [])
const accommodation = computed(() => meta.value.accommodation || null)

// Individual accommodation
const indAccommodation = computed(() => {
  const acc = meta.value.accommodation
  if (acc) return acc
  if (meta.value.check_in) return { check_in: meta.value.check_in, check_out: meta.value.check_out }
  return null
})
const indRooms = computed(() => meta.value.accommodation?.rooms || [])
const indNightCount = computed(() => meta.value.nights ?? nights(indAccommodation.value?.check_in, indAccommodation.value?.check_out) ?? 0)

// Assigned rooms (corporate accommodation, post-materialise)
const assignedRooms = computed(() => meta.value.assigned_rooms || [])

// Event
const eventBlock    = computed(() => meta.value.event || null)
const eventSessions = computed(() => eventBlock.value?.sessions || [])

// Meal
const mealBlock    = computed(() => meta.value.meal || null)
const mealSessions = computed(() => mealBlock.value?.sessions || [])

// Menu items (fetched once when a meal booking is opened)
const menuItems   = ref([])
const menuItemMap = computed(() => Object.fromEntries(menuItems.value.map(m => [m.id, m])))

async function fetchMenuItems() {
  const orgId    = meta.value.org_id
  const branchId = meta.value.branch_id
  if (!orgId || menuItems.value.length) return
  try {
    const params = { org_id: orgId }
    if (branchId) params.branch_id = branchId
    const { data }   = await api.get('/guest/menu', { params })
    const firstPage  = data.items?.data ?? []
    const total      = data.items?.total     ?? firstPage.length
    const pageSize   = data.items?.page_size ?? 10
    const totalPages = Math.ceil(total / pageSize)
    let rest = []
    if (totalPages > 1) {
      const pages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          api.get('/guest/menu', { params: { ...params, page: i + 2, page_size: pageSize } })
        )
      )
      rest = pages.flatMap(r => r.data.items?.data ?? [])
    }
    menuItems.value = [...firstPage, ...rest]
  } catch { menuItems.value = [] }
}

// Group a session's individual_orders by attendant index
function sessionOrderGroups(session) {
  const orders = session.individual_orders ?? []
  const map    = {}
  for (const o of orders) {
    const idx = o.attendant_idx ?? 0
    if (!map[idx]) map[idx] = { idx, attendant: attendants.value[idx] || null, items: [] }
    map[idx].items.push(o)
  }
  return Object.values(map).sort((a, b) => a.idx - b.idx)
}

// Documents
const documents = computed(() => meta.value.documents || [])

// ── Book Again ────────────────────────────────────────────────────────────────

// The lodge/org ID comes from the payload — it's the route param for booking flows
const lodgeId = computed(() => meta.value.org_id || null)

const canBookAgain = computed(() => !!lodgeId.value && !!record.value)

function bookAgain() {
  const r = record.value
  const m = meta.value
  if (!r || !lodgeId.value) return

  // Build a prefill draft from the original payload
  const draft = {
    bookingType:   r.bookingType,
    bookerType:    r.bookerType,
    lodgeId:       lodgeId.value,
    branchId:      m.branch_id || null,
    bookingContext: m.booking_context || (r.bookerType === 'corporate' ? 'corporate' : 'individual'),
    // Booked-by contact
    bookedBy: {
      name:     m.booked_by?.name  || r.bookerName  || '',
      email:    m.booked_by?.email || r.bookerEmail || '',
      phone:    m.booked_by?.phone || r.bookerPhone || '',
      jobTitle: m.booked_by?.job_title || '',
    },
    // Corporate company
    company: m.company ? {
      name:     m.company.name         || '',
      tpin:     m.company.tpin         || '',
      email:    m.company.email        || '',
      phone:    m.company.phone        || '',
      industry: m.company.industry     || '',
      branch:   m.company.branch_name  || '',
      department: m.company.department_name || '',
      costCenter: m.company.cost_center    || '',
      glCode:     m.company.gl_code        || '',
    } : null,
    // Corporate approver
    approver: m.approver ? {
      name:  m.approver.name  || '',
      email: m.approver.email || '',
      phone: m.approver.phone || '',
      title: m.approver.title || '',
    } : null,
    // Attendants (strip assigned-room data — rooms need fresh selection)
    attendants: (m.attendants || []).map((a, i) => ({
      fullName:  a.full_name || '',
      email:     a.email     || '',
      phone:     a.phone     || '',
      idNumber:  a.id_number || '',
      isLead:    a.is_lead_contact || i === 0,
    })),
    // Type-specific
    accommodation: r.bookingType === 'accommodation' ? {
      checkIn:  m.accommodation?.check_in  || '',
      checkOut: m.accommodation?.check_out || '',
      roomTypePreference: m.accommodation?.room_type_preference || '',
    } : null,
    event: r.bookingType === 'event' ? {
      startDate:        m.event?.start_date || '',
      endDate:          m.event?.end_date   || '',
      reasonForBooking: m.event?.reason_for_booking || '',
      sessions: (m.event?.sessions || []).map(s => ({
        venueId:   s.venue_id   || '',
        venueName: s.venue_name || '',
        eventType: s.event_type || '',
        eventDate: s.event_date || '',
        startTime: s.start_time || '',
        endTime:   s.end_time   || '',
        expectedAttendees: s.expected_attendees || '',
        setupType: s.setup_type || '',
        specialRequirements: s.special_requirements || '',
      })),
    } : null,
    meal: r.bookingType === 'meals' ? {
      startDate:        m.meal?.start_date || '',
      endDate:          m.meal?.end_date   || '',
      reasonForBooking: m.meal?.reason_for_booking || '',
      sessions: (m.meal?.sessions || []).map(s => ({
        sessionName:  s.session_name  || '',
        mealDate:     s.meal_date     || '',
        mealPeriod:   s.meal_period   || '',
        serviceType:  s.service_type  || '',
        paxCount:     s.pax_count     || '',
        dietaryNotes: s.dietary_notes || '',
      })),
    } : null,
  }

  rebook.set(draft)

  // Navigate to the appropriate booking flow
  const routeMap = {
    accommodation: { name: 'accommodation-booking', params: { id: lodgeId.value } },
    event:         { name: 'event-booking',         params: { id: lodgeId.value } },
    meals:         { name: 'meal-booking',          params: { id: lodgeId.value } },
  }

  router.push(routeMap[r.bookingType] || { name: 'lodges' })
}

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function nights(a, b) {
  if (!a || !b) return null
  const diff = (new Date(b) - new Date(a)) / 86400000
  return diff > 0 ? diff : null
}
function fmtTime(t) {
  if (!t) return '—'
  return t.slice(0, 5)
}
function isPdf(url) {
  return url?.toLowerCase().includes('.pdf')
}
</script>

<template>
  <div class="max-w-[1280px] mx-auto px-5 md:px-16 py-8">

    <RouterLink
      to="/bookings"
      class="inline-flex items-center gap-2 font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) transition-colors mb-8"
    >
      <span class="material-symbols-outlined text-base">arrow_back</span>
      My Reservations
    </RouterLink>

    <div v-if="loading" class="py-32 text-center">
      <span class="material-symbols-outlined text-4xl text-(--color-on-surface-variant) animate-spin">progress_activity</span>
    </div>

    <template v-else-if="record">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        <div>
          <span class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-primary) mb-2 block">
            {{ record.bookingType === 'accommodation'
                ? (record.bookerType === 'corporate' ? 'Corporate Stay' : 'Stay')
                : record.bookingType === 'event' ? 'Event' : 'Meal Booking' }}
            · {{ record.bookingNumber || '#' + record.id.slice(0, 8) }}
          </span>
          <h1 class="font-serif text-[32px] font-semibold leading-10 text-(--color-on-surface)">
            <template v-if="record.bookerType === 'corporate'">
              {{ company?.name || record.companyName || 'Corporate Booking' }}
            </template>
            <template v-else-if="record.bookingType === 'accommodation'">
              {{ indRooms[0]?.room_name || meta.room_name || 'Room Booking' }}
            </template>
            <template v-else-if="record.bookingType === 'event'">
              {{ eventSessions[0]?.venue_name || 'Event Booking' }}
            </template>
            <template v-else>Meal Booking</template>
          </h1>
          <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1">
            Booked {{ fmt(record.createdAt) }}
          </p>
        </div>
        <StatusBadge :status="record.status" class="shrink-0 mt-1" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

        <!-- â”€â”€ Left column â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
        <div class="lg:col-span-2 space-y-6">

          <!-- â•â•â•â• CORPORATE ACCOMMODATION â•â•â•â• -->
          <template v-if="record.bookingType === 'accommodation' && record.bookerType === 'corporate'">

            <!-- Dates -->
            <div class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-4">
              <h2 class="font-serif text-xl text-(--color-on-surface)">Stay Details</h2>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-5 font-sans text-sm">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Check In</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ fmt(accommodation?.check_in) }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Check Out</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ fmt(accommodation?.check_out) }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Nights</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ meta.nights ?? nights(accommodation?.check_in, accommodation?.check_out) ?? '—' }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Rooms</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ accommodation?.room_count ?? assignedRooms.length }}</p>
                </div>
                <div v-if="accommodation?.room_type_preference">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Room Type</p>
                  <p class="font-semibold text-(--color-on-surface) capitalize">{{ accommodation.room_type_preference }}</p>
                </div>
                <div v-if="meta.currency">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Currency</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ meta.currency }}</p>
                </div>
              </div>
            </div>

            <!-- Company -->
            <div v-if="company" class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-4">
              <h2 class="font-serif text-xl text-(--color-on-surface)">Company Details</h2>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-5 font-sans text-sm">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Company</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ company.name }}</p>
                </div>
                <div v-if="company.industry">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Industry</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ company.industry }}</p>
                </div>
                <div v-if="company.tpin">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">TPIN</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ company.tpin }}</p>
                </div>
                <div v-if="company.branch_name">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Branch</p>
                  <p class="font-semibold text-(--color-on-surface) capitalize">{{ company.branch_name }}</p>
                </div>
                <div v-if="company.department_name">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Department</p>
                  <p class="font-semibold text-(--color-on-surface) capitalize">{{ company.department_name }}</p>
                </div>
                <div v-if="company.cost_center">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Cost Centre</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ company.cost_center }}</p>
                </div>
                <div v-if="company.gl_code">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">GL Code</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ company.gl_code }}</p>
                </div>
                <div v-if="company.email">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Email</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ company.email }}</p>
                </div>
                <div v-if="company.phone">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Phone</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ company.phone }}</p>
                </div>
              </div>
            </div>

            <!-- Booked by + Approver -->
            <div
              v-if="bookedBy || approver"
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-4"
            >
              <h2 class="font-serif text-xl text-(--color-on-surface)">Contact Details</h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 font-sans text-sm">
                <div v-if="bookedBy" class="space-y-2">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Booked By</p>
                  <p class="value font-semibold">{{ bookedBy.name }}</p>
                  <p v-if="bookedBy.email" class="text-(--color-on-surface-variant)">{{ bookedBy.email }}</p>
                  <p v-if="bookedBy.phone" class="text-(--color-on-surface-variant)">{{ bookedBy.phone }}</p>
                </div>
                <div v-if="approver" class="space-y-2">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Approver</p>
                  <p class="value font-semibold">{{ approver.name }}</p>
                  <p v-if="approver.title" class="text-(--color-on-surface-variant) capitalize">{{ approver.title }}</p>
                  <p v-if="approver.email" class="text-(--color-on-surface-variant)">{{ approver.email }}</p>
                  <p v-if="approver.phone" class="text-(--color-on-surface-variant)">{{ approver.phone }}</p>
                </div>
              </div>
            </div>

            <!-- Attendants -->
            <div
              v-if="attendants.length"
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-3"
            >
              <h2 class="font-serif text-xl text-(--color-on-surface)">Attendants</h2>
              <div
                v-for="(a, i) in attendants"
                :key="i"
                class="flex items-start justify-between py-3 border-b border-(--color-outline-variant) last:border-0"
              >
                <div class="font-sans text-sm space-y-0.5">
                  <p class="font-semibold text-(--color-on-surface)">
                    {{ a.full_name }}
                    <span v-if="a.is_lead_contact" class="ml-2 text-[10px] font-semibold uppercase tracking-wider bg-(--color-savannah-mist) text-(--color-primary) px-2 py-0.5 rounded-full">Lead</span>
                  </p>
                  <p v-if="a.id_number" class="text-(--color-on-surface-variant) text-xs">ID: {{ a.id_number }}</p>
                  <p v-if="a.email" class="text-(--color-on-surface-variant) text-xs">{{ a.email }}</p>
                  <p v-if="a.phone" class="text-(--color-on-surface-variant) text-xs">{{ a.phone }}</p>
                </div>
              </div>
            </div>

            <!-- Assigned rooms -->
            <div
              v-if="assignedRooms.length"
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-3"
            >
              <h2 class="font-serif text-xl text-(--color-on-surface)">Assigned Rooms</h2>
              <div
                v-for="(room, i) in assignedRooms"
                :key="i"
                class="flex items-center justify-between py-3 border-b border-(--color-outline-variant) last:border-0"
              >
                <div class="font-sans text-sm">
                  <p class="font-semibold text-(--color-on-surface)">{{ room.room_name || 'Room ' + (i + 1) }}</p>
                  <p v-if="room.guest_name" class="text-(--color-on-surface-variant) text-xs mt-0.5">{{ room.guest_name }}</p>
                </div>
                <span
                  v-if="room.room_type"
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) bg-(--color-surface-container) px-2.5 py-1 rounded-full"
                >
                  {{ room.room_type }}
                </span>
              </div>
            </div>
          </template>

          <!-- â•â•â•â• INDIVIDUAL ACCOMMODATION â•â•â•â• -->
          <template v-else-if="record.bookingType === 'accommodation'">

            <!-- Stay details -->
            <div class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-4">
              <h2 class="font-serif text-xl text-(--color-on-surface)">Stay Details</h2>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-5 font-sans text-sm">
                <div v-if="record.bookingNumber">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Booking No.</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ record.bookingNumber }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Check In</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ fmt(indAccommodation?.check_in) }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Check Out</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ fmt(indAccommodation?.check_out) }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Nights</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ indNightCount || '—' }}</p>
                </div>
                <div v-if="indRooms.length === 1 && (meta.room_name || indRooms[0]?.room_name)">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Room</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ meta.room_name || indRooms[0].room_name }}</p>
                </div>
                <div v-if="indRooms.length === 1 && (meta.room_type || indRooms[0]?.room_type)">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Room Type</p>
                  <p class="font-semibold text-(--color-on-surface) capitalize">{{ meta.room_type || indRooms[0].room_type }}</p>
                </div>
                <div v-if="meta.currency">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Currency</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ meta.currency }}</p>
                </div>
              </div>

              <!-- Multiple rooms list -->
              <div v-if="indRooms.length > 1" class="pt-3 border-t border-(--color-outline-variant) space-y-1">
                <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-2">Rooms ({{ indRooms.length }})</p>
                <div
                  v-for="(room, i) in indRooms"
                  :key="i"
                  class="flex items-center justify-between py-3 border-b border-(--color-outline-variant) last:border-0 font-sans text-sm"
                >
                  <div>
                    <p class="font-semibold text-(--color-on-surface)">{{ room.room_name || 'Room ' + (i + 1) }}</p>
                    <p v-if="attendants[room.attendant_idx]" class="text-(--color-on-surface-variant) text-xs mt-0.5">
                      {{ attendants[room.attendant_idx].full_name }}
                    </p>
                  </div>
                  <div class="text-right">
                    <span v-if="room.room_type" class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) bg-(--color-surface-container) px-2.5 py-1 rounded-full">{{ room.room_type }}</span>
                    <p v-if="room.rate_per_night" class="text-(--color-on-surface-variant) text-xs mt-1">K{{ Number(room.rate_per_night).toLocaleString() }}/night</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Booked By -->
            <div class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-4">
              <h2 class="font-serif text-xl text-(--color-on-surface)">Booked By</h2>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-5 font-sans text-sm">
                <div v-if="meta.booked_by?.name || record.bookerName">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Name</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ meta.booked_by?.name || record.bookerName }}</p>
                </div>
                <div v-if="meta.booked_by?.email || record.bookerEmail">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Email</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ meta.booked_by?.email || record.bookerEmail }}</p>
                </div>
                <div v-if="meta.booked_by?.phone || record.bookerPhone">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Phone</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ meta.booked_by?.phone || record.bookerPhone }}</p>
                </div>
              </div>
            </div>

            <!-- Guests -->
            <div
              v-if="attendants.length"
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-3"
            >
              <h2 class="font-serif text-xl text-(--color-on-surface)">Guests ({{ attendants.length }})</h2>
              <div
                v-for="(a, i) in attendants"
                :key="i"
                class="py-4 border-b border-(--color-outline-variant) last:border-0"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="font-sans text-sm space-y-1">
                    <p class="font-semibold text-(--color-on-surface)">
                      {{ a.full_name }}
                      <span v-if="a.is_lead_contact" class="ml-2 text-[10px] font-semibold uppercase tracking-wider bg-(--color-savannah-mist) text-(--color-primary) px-2 py-0.5 rounded-full">Lead</span>
                    </p>
                    <p v-if="a.id_number" class="text-(--color-on-surface-variant) text-xs">ID: {{ a.id_number }}</p>
                    <p v-if="a.email" class="text-(--color-on-surface-variant) text-xs">{{ a.email }}</p>
                    <p v-if="a.phone" class="text-(--color-on-surface-variant) text-xs">{{ a.phone }}</p>
                  </div>
                  <div v-if="indRooms.find(r => r.attendant_idx === i)" class="shrink-0 text-right font-sans text-xs text-(--color-on-surface-variant)">
                    <p class="font-semibold text-(--color-on-surface) text-sm">{{ indRooms.find(r => r.attendant_idx === i).room_name }}</p>
                    <p v-if="indRooms.find(r => r.attendant_idx === i).room_type" class="capitalize mt-0.5">{{ indRooms.find(r => r.attendant_idx === i).room_type }}</p>
                    <p v-if="indRooms.find(r => r.attendant_idx === i).rate_per_night" class="mt-0.5">K{{ Number(indRooms.find(r => r.attendant_idx === i).rate_per_night).toLocaleString() }}/night</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Cost Breakdown -->
            <div
              v-if="indRooms.some(r => r.rate_per_night) && indNightCount > 0"
              class="bg-(--color-surface-container-lowest) rounded-xl p-6"
            >
              <h2 class="font-serif text-xl text-(--color-on-surface) mb-4">Cost Breakdown</h2>
              <div class="font-sans text-sm space-y-0.5">
                <div
                  v-for="(room, i) in indRooms.filter(r => r.rate_per_night)"
                  :key="i"
                  class="flex justify-between py-2.5 border-b border-(--color-outline-variant) text-(--color-on-surface)"
                >
                  <span>{{ room.room_name }} <span class="text-(--color-on-surface-variant)">&times; {{ indNightCount }} night{{ indNightCount !== 1 ? 's' : '' }}</span></span>
                  <span class="font-semibold">K{{ (Number(room.rate_per_night) * indNightCount).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between py-2.5 text-(--color-on-surface-variant)">
                  <span>Base Total</span>
                  <span>K{{ indRooms.filter(r => r.rate_per_night).reduce((s, r) => s + Number(r.rate_per_night) * indNightCount, 0).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between py-2.5 text-(--color-on-surface-variant)">
                  <span>VAT (16%)</span>
                  <span>K{{ Math.round(indRooms.filter(r => r.rate_per_night).reduce((s, r) => s + Number(r.rate_per_night) * indNightCount, 0) * 0.16).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between py-2.5 font-semibold text-(--color-on-surface) border-t border-(--color-outline-variant) text-base">
                  <span>Total</span>
                  <span>K{{ Math.round(indRooms.filter(r => r.rate_per_night).reduce((s, r) => s + Number(r.rate_per_night) * indNightCount, 0) * 1.16).toLocaleString() }}</span>
                </div>
              </div>
            </div>

          </template>

          <!-- â•â•â•â• EVENT â•â•â•â• -->
          <template v-else-if="record.bookingType === 'event'">

            <!-- Event Details -->
            <div class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-4">
              <h2 class="font-serif text-xl text-(--color-on-surface)">Event Details</h2>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-5 font-sans text-sm">
                <div v-if="record.bookingNumber">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Booking No.</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ record.bookingNumber }}</p>
                </div>
                <div v-if="eventBlock?.start_date">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Start Date</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ fmt(eventBlock.start_date) }}</p>
                </div>
                <div v-if="eventBlock?.end_date">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">End Date</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ fmt(eventBlock.end_date) }}</p>
                </div>
                <div v-if="eventSessions.length">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Sessions</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ eventSessions.length }}</p>
                </div>
                <div v-if="eventBlock?.schedule_mode">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Schedule</p>
                  <p class="font-semibold text-(--color-on-surface) capitalize">{{ eventBlock.schedule_mode.replace('_', ' ') }}</p>
                </div>
                <div v-if="meta.currency">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Currency</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ meta.currency }}</p>
                </div>
              </div>
            </div>

            <!-- Company (corporate event) -->
            <div v-if="company" class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-4">
              <h2 class="font-serif text-xl text-(--color-on-surface)">Company Details</h2>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-5 font-sans text-sm">
                <div><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Company</p><p class="font-semibold text-(--color-on-surface)">{{ company.name }}</p></div>
                <div v-if="company.industry"><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Industry</p><p class="font-semibold text-(--color-on-surface)">{{ company.industry }}</p></div>
                <div v-if="company.tpin"><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">TPIN</p><p class="font-semibold text-(--color-on-surface)">{{ company.tpin }}</p></div>
                <div v-if="company.department_name"><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Department</p><p class="font-semibold text-(--color-on-surface) capitalize">{{ company.department_name }}</p></div>
                <div v-if="company.cost_center"><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Cost Centre</p><p class="font-semibold text-(--color-on-surface)">{{ company.cost_center }}</p></div>
                <div v-if="company.gl_code"><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">GL Code</p><p class="font-semibold text-(--color-on-surface)">{{ company.gl_code }}</p></div>
              </div>
            </div>

            <!-- Booked By -->
            <div
              v-if="bookedBy || record.bookerName"
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-4"
            >
              <h2 class="font-serif text-xl text-(--color-on-surface)">Booked By</h2>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-5 font-sans text-sm">
                <div v-if="bookedBy?.name || record.bookerName">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Name</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ bookedBy?.name || record.bookerName }}</p>
                </div>
                <div v-if="bookedBy?.email || record.bookerEmail">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Email</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ bookedBy?.email || record.bookerEmail }}</p>
                </div>
                <div v-if="bookedBy?.phone || record.bookerPhone">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Phone</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ bookedBy?.phone || record.bookerPhone }}</p>
                </div>
              </div>
            </div>

            <!-- Attendants -->
            <div
              v-if="attendants.length"
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-3"
            >
              <h2 class="font-serif text-xl text-(--color-on-surface)">Attendants ({{ attendants.length }})</h2>
              <div
                v-for="(a, i) in attendants"
                :key="i"
                class="flex items-start justify-between py-4 border-b border-(--color-outline-variant) last:border-0"
              >
                <div class="font-sans text-sm space-y-1">
                  <p class="font-semibold text-(--color-on-surface)">
                    {{ a.full_name }}
                    <span v-if="a.is_lead_contact" class="ml-2 text-[10px] font-semibold uppercase tracking-wider bg-(--color-savannah-mist) text-(--color-primary) px-2 py-0.5 rounded-full">Lead</span>
                  </p>
                  <p v-if="a.id_number" class="text-(--color-on-surface-variant) text-xs">ID: {{ a.id_number }}</p>
                  <p v-if="a.email" class="text-(--color-on-surface-variant) text-xs">{{ a.email }}</p>
                  <p v-if="a.phone" class="text-(--color-on-surface-variant) text-xs">{{ a.phone }}</p>
                </div>
              </div>
            </div>

            <!-- Sessions -->
            <div
              v-if="eventSessions.length"
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-3"
            >
              <h2 class="font-serif text-xl text-(--color-on-surface)">Sessions</h2>
              <div
                v-for="(s, i) in eventSessions"
                :key="i"
                class="py-4 border-b border-(--color-outline-variant) last:border-0 space-y-3"
              >
                <!-- Name + badges -->
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-sans font-semibold text-sm text-(--color-on-surface)">{{ s.event_name || 'Session ' + (i + 1) }}</p>
                    <p v-if="s.venue_name" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">{{ s.venue_name }}</p>
                  </div>
                  <div class="flex flex-wrap gap-1.5 shrink-0 justify-end">
                    <span v-if="s.event_type" class="font-sans text-xs font-semibold uppercase tracking-wider bg-(--color-surface-container) text-(--color-on-surface-variant) px-2.5 py-1 rounded-full">{{ s.event_type }}</span>
                    <span v-if="s.setup_type" class="font-sans text-xs font-semibold uppercase tracking-wider bg-(--color-surface-container) text-(--color-on-surface-variant) px-2.5 py-1 rounded-full capitalize">{{ s.setup_type }}</span>
                  </div>
                </div>
                <!-- Detail chips -->
                <div class="flex flex-wrap gap-x-5 gap-y-1.5 font-sans text-xs text-(--color-on-surface-variant)">
                  <span v-if="s.event_date" class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[13px]">calendar_today</span>
                    {{ fmt(s.event_date) }}
                  </span>
                  <span v-if="s.start_time" class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[13px]">schedule</span>
                    {{ fmtTime(s.start_time) }} – {{ fmtTime(s.end_time) }}
                  </span>
                  <span v-if="s.expected_attendees" class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[13px]">group</span>
                    {{ s.expected_attendees }} attendees
                  </span>
                  <span v-if="s.venue_capacity" class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[13px]">meeting_room</span>
                    Capacity {{ s.venue_capacity }}
                  </span>
                  <span v-if="s.pricing_basis" class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[13px]">payments</span>
                    {{ s.pricing_basis.replace('_', ' ') }}
                  </span>
                </div>
                <!-- Special requirements -->
                <p
                  v-if="s.special_requirements"
                  class="font-sans text-xs text-(--color-on-surface-variant) bg-(--color-surface-container) rounded-lg px-3 py-2 leading-relaxed"
                >
                  <span class="material-symbols-outlined text-[13px] align-middle mr-1">info</span>
                  {{ s.special_requirements }}
                </p>
              </div>
            </div>
          </template>

          <!-- â•â•â•â• MEAL â•â•â•â• -->
          <template v-else-if="record.bookingType === 'meals'">

            <!-- Meal Details -->
            <div class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-4">
              <h2 class="font-serif text-xl text-(--color-on-surface)">Meal Details</h2>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-5 font-sans text-sm">
                <div v-if="record.bookingNumber">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Booking No.</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ record.bookingNumber }}</p>
                </div>
                <div v-if="mealBlock?.start_date">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Start Date</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ fmt(mealBlock.start_date) }}</p>
                </div>
                <div v-if="mealBlock?.end_date">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">End Date</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ fmt(mealBlock.end_date) }}</p>
                </div>
                <div v-if="mealSessions.length">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Sessions</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ mealSessions.length }}</p>
                </div>
                <div v-if="mealBlock?.schedule_mode">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Schedule</p>
                  <p class="font-semibold text-(--color-on-surface) capitalize">{{ mealBlock.schedule_mode.replace('_', ' ') }}</p>
                </div>
                <div v-if="mealBlock?.meal_mode">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Mode</p>
                  <p class="font-semibold text-(--color-on-surface) capitalize">{{ mealBlock.meal_mode.replace('_', ' ') }}</p>
                </div>
                <div v-if="meta.currency">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Currency</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ meta.currency }}</p>
                </div>
              </div>
            </div>

            <!-- Company (corporate meal) -->
            <div v-if="company" class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-4">
              <h2 class="font-serif text-xl text-(--color-on-surface)">Company Details</h2>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-5 font-sans text-sm">
                <div><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Company</p><p class="font-semibold text-(--color-on-surface)">{{ company.name }}</p></div>
                <div v-if="company.industry"><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Industry</p><p class="font-semibold text-(--color-on-surface)">{{ company.industry }}</p></div>
                <div v-if="company.tpin"><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">TPIN</p><p class="font-semibold text-(--color-on-surface)">{{ company.tpin }}</p></div>
                <div v-if="company.branch_name"><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Branch</p><p class="font-semibold text-(--color-on-surface) capitalize">{{ company.branch_name }}</p></div>
                <div v-if="company.department_name"><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Department</p><p class="font-semibold text-(--color-on-surface) capitalize">{{ company.department_name }}</p></div>
                <div v-if="company.cost_center"><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Cost Centre</p><p class="font-semibold text-(--color-on-surface)">{{ company.cost_center }}</p></div>
                <div v-if="company.gl_code"><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">GL Code</p><p class="font-semibold text-(--color-on-surface)">{{ company.gl_code }}</p></div>
                <div v-if="company.email"><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Email</p><p class="font-semibold text-(--color-on-surface)">{{ company.email }}</p></div>
                <div v-if="company.phone"><p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Phone</p><p class="font-semibold text-(--color-on-surface)">{{ company.phone }}</p></div>
              </div>
            </div>

            <!-- Contact Details (booked by + approver) -->
            <div
              v-if="bookedBy || approver || record.bookerName"
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-4"
            >
              <h2 class="font-serif text-xl text-(--color-on-surface)">Contact Details</h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 font-sans text-sm">
                <div v-if="bookedBy || record.bookerName" class="space-y-1.5">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-2">Booked By</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ bookedBy?.name || record.bookerName }}</p>
                  <p v-if="bookedBy?.job_title" class="text-(--color-on-surface-variant) text-xs capitalize">{{ bookedBy.job_title }}<span v-if="bookedBy.man_number"> · #{{ bookedBy.man_number }}</span></p>
                  <p v-if="bookedBy?.email || record.bookerEmail" class="text-(--color-on-surface-variant) text-xs">{{ bookedBy?.email || record.bookerEmail }}</p>
                  <p v-if="bookedBy?.phone || record.bookerPhone" class="text-(--color-on-surface-variant) text-xs">{{ bookedBy?.phone || record.bookerPhone }}</p>
                </div>
                <div v-if="approver" class="space-y-1.5">
                  <p class="text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-2">Approver</p>
                  <p class="font-semibold text-(--color-on-surface)">{{ approver.name }}</p>
                  <p v-if="approver.title" class="text-(--color-on-surface-variant) text-xs capitalize">{{ approver.title }}</p>
                  <p v-if="approver.email" class="text-(--color-on-surface-variant) text-xs">{{ approver.email }}</p>
                  <p v-if="approver.phone" class="text-(--color-on-surface-variant) text-xs">{{ approver.phone }}</p>
                </div>
              </div>
            </div>

            <!-- Attendants -->
            <div
              v-if="attendants.length"
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-3"
            >
              <h2 class="font-serif text-xl text-(--color-on-surface)">Attendants ({{ attendants.length }})</h2>
              <div
                v-for="(a, i) in attendants"
                :key="i"
                class="flex items-start justify-between py-4 border-b border-(--color-outline-variant) last:border-0"
              >
                <div class="font-sans text-sm space-y-1">
                  <p class="font-semibold text-(--color-on-surface)">
                    {{ a.full_name }}
                    <span v-if="a.is_lead_contact" class="ml-2 text-[10px] font-semibold uppercase tracking-wider bg-(--color-savannah-mist) text-(--color-primary) px-2 py-0.5 rounded-full">Lead</span>
                  </p>
                  <p v-if="a.id_number" class="text-(--color-on-surface-variant) text-xs">ID: {{ a.id_number }}</p>
                  <p v-if="a.email" class="text-(--color-on-surface-variant) text-xs">{{ a.email }}</p>
                  <p v-if="a.phone" class="text-(--color-on-surface-variant) text-xs">{{ a.phone }}</p>
                </div>
              </div>
            </div>

            <!-- Sessions -->
            <div
              v-if="mealSessions.length"
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-3"
            >
              <h2 class="font-serif text-xl text-(--color-on-surface)">Sessions</h2>
              <div
                v-for="(s, i) in mealSessions"
                :key="i"
                class="py-4 border-b border-(--color-outline-variant) last:border-0 space-y-3"
              >
                <!-- Name + badges -->
                <div class="flex items-start justify-between gap-3">
                  <p class="font-sans font-semibold text-sm text-(--color-on-surface)">{{ s.session_name || 'Session ' + (i + 1) }}</p>
                  <div class="flex flex-wrap gap-1.5 shrink-0 justify-end">
                    <span v-if="s.meal_period" class="font-sans text-xs font-semibold uppercase tracking-wider bg-(--color-surface-container) text-(--color-on-surface-variant) px-2.5 py-1 rounded-full">{{ s.meal_period }}</span>
                    <span v-if="s.service_type" class="font-sans text-xs font-semibold uppercase tracking-wider bg-(--color-surface-container) text-(--color-on-surface-variant) px-2.5 py-1 rounded-full capitalize">{{ s.service_type.replace(/_/g, ' ') }}</span>
                  </div>
                </div>
                <!-- Detail chips -->
                <div class="flex flex-wrap gap-x-5 gap-y-1.5 font-sans text-xs text-(--color-on-surface-variant)">
                  <span v-if="s.meal_date" class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[13px]">calendar_today</span>
                    {{ fmt(s.meal_date) }}
                  </span>
                  <span v-if="s.pax_count" class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[13px]">group</span>
                    {{ s.pax_count }} {{ s.pax_count === 1 ? 'diner' : 'diners' }}
                  </span>
                </div>
                <!-- Dietary notes -->
                <p
                  v-if="s.dietary_notes"
                  class="font-sans text-xs text-(--color-on-surface-variant) bg-(--color-surface-container) rounded-lg px-3 py-2 leading-relaxed"
                >
                  <span class="material-symbols-outlined text-[13px] align-middle mr-1">restaurant</span>
                  {{ s.dietary_notes }}
                </p>
                <!-- Arrangements notes -->
                <p
                  v-if="s.arrangements_notes"
                  class="font-sans text-xs text-(--color-on-surface-variant) bg-(--color-surface-container) rounded-lg px-3 py-2 leading-relaxed"
                >
                  <span class="material-symbols-outlined text-[13px] align-middle mr-1">info</span>
                  {{ s.arrangements_notes }}
                </p>
                <!-- Buffet item -->
                <div
                  v-if="s.service_type !== 'individual_order' && s.menu_item_id && menuItemMap[s.menu_item_id]"
                  class="flex items-center justify-between font-sans text-sm bg-(--color-surface-container) rounded-lg px-3 py-2"
                >
                  <span class="flex items-center gap-1.5 text-(--color-on-surface)">
                    <span class="material-symbols-outlined text-[14px] text-(--color-on-surface-variant)">dinner_dining</span>
                    {{ menuItemMap[s.menu_item_id].name }}
                  </span>
                  <span class="font-semibold text-(--color-on-surface)">K{{ menuItemMap[s.menu_item_id].price?.toLocaleString() }}</span>
                </div>
                <!-- Individual orders — grouped by attendant -->
                <div v-if="s.individual_orders?.length" class="space-y-3 pt-1">
                  <p class="font-sans text-[11px] font-semibold uppercase tracking-widest text-(--color-on-surface-variant)">Orders</p>
                  <div
                    v-for="group in sessionOrderGroups(s)"
                    :key="group.idx"
                    class="space-y-1.5"
                  >
                    <!-- Attendant name -->
                    <p class="font-sans text-xs font-semibold text-(--color-on-surface) flex items-center gap-1.5">
                      <span class="material-symbols-outlined text-[13px] text-(--color-on-surface-variant)">person</span>
                      {{ group.attendant?.full_name || ('Guest ' + (group.idx + 1)) }}
                      <span v-if="group.attendant?.is_lead_contact" class="text-[9px] font-semibold uppercase tracking-wider bg-(--color-savannah-mist) text-(--color-primary) px-1.5 py-0.5 rounded-full">Lead</span>
                    </p>
                    <!-- Items -->
                    <div
                      v-for="(order, oi) in group.items"
                      :key="oi"
                      class="flex items-center justify-between font-sans text-xs text-(--color-on-surface-variant) pl-5"
                    >
                      <span class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[12px]">dinner_dining</span>
                        <span class="text-(--color-on-surface)">{{ menuItemMap[order.menu_item_id]?.name || '—' }}</span>
                        <span v-if="order.quantity > 1">× {{ order.quantity }}</span>
                      </span>
                      <span v-if="menuItemMap[order.menu_item_id]" class="font-semibold text-(--color-on-surface) shrink-0 ml-4">
                        K{{ (menuItemMap[order.menu_item_id].price * order.quantity).toLocaleString() }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Special requests -->
          <div
            v-if="record.specialRequests || meta.accommodation?.notes || mealBlock?.notes || eventBlock?.notes"
            class="bg-(--color-surface-container-lowest) rounded-xl p-6"
          >
            <h2 class="font-serif text-xl text-(--color-on-surface) mb-3">Notes / Special Requests</h2>
            <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed">
              {{ record.specialRequests || meta.accommodation?.notes || mealBlock?.notes || eventBlock?.notes }}
            </p>
          </div>

          <!-- Documents -->
          <div
            v-if="documents.length"
            class="bg-(--color-surface-container-lowest) rounded-xl p-6 space-y-3"
          >
            <h2 class="font-serif text-xl text-(--color-on-surface)">Documents</h2>
            <div class="space-y-2">
              <a
                v-for="(doc, i) in documents"
                :key="i"
                :href="doc"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-3 p-3 rounded-lg border border-(--color-outline-variant) hover:bg-(--color-surface-container) transition-colors"
              >
                <span class="material-symbols-outlined text-lg text-(--color-primary)">
                  {{ isPdf(doc) ? 'picture_as_pdf' : 'image' }}
                </span>
                <span class="font-sans text-sm text-(--color-primary) truncate">Document {{ i + 1 }}</span>
                <span class="material-symbols-outlined text-base text-(--color-on-surface-variant) ml-auto">open_in_new</span>
              </a>
            </div>
          </div>

        </div>

        <!-- â”€â”€ Right: summary + actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
        <aside class="lg:sticky lg:top-28 space-y-4">

          <div class="bg-(--color-surface-container-high) p-6 rounded-xl shadow-lg">
            <h2 class="font-serif text-xl text-(--color-on-surface) mb-4">Summary</h2>
            <div class="space-y-3 font-sans text-sm">
              <div class="flex justify-between text-(--color-on-surface-variant)">
                <span>Booking #</span>
                <span class="font-mono font-semibold text-(--color-on-surface)">{{ record.bookingNumber || record.id.slice(0, 8).toUpperCase() }}</span>
              </div>
              <div class="flex justify-between text-(--color-on-surface-variant)">
                <span>Type</span>
                <span class="capitalize">{{ record.bookingType }}</span>
              </div>
              <div class="flex justify-between text-(--color-on-surface-variant)">
                <span>Booked</span>
                <span>{{ fmt(record.createdAt) }}</span>
              </div>
              <div v-if="record.totalAmount" class="flex justify-between font-bold text-lg pt-3 border-t border-(--color-outline-variant)">
                <span>Total</span>
                <span class="text-(--color-primary)">{{ meta.currency || 'K' }}{{ record.totalAmount.toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <button
              v-if="canBookAgain"
              class="w-full bg-(--color-primary) text-white py-3 rounded-2xl font-sans text-sm font-semibold hover:opacity-90 transition-opacity"
              @click="bookAgain"
            >
              Book Again
            </button>
            <RouterLink
              to="/lodges"
              class="w-full text-center border-2 border-(--color-primary) text-(--color-primary) py-3 rounded-2xl font-sans text-sm font-semibold hover:bg-(--color-primary) hover:text-white transition-all"
            >
              Browse Lodges
            </RouterLink>
          </div>

        </aside>
      </div>
    </template>
  </div>
</template>



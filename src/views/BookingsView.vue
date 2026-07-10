<script setup>
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useReservationsStore } from '@/stores/reservations'
import StatusBadge from '@/components/ui/StatusBadge.vue'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function cardTitle(r) {
  if (r.bookingType === 'accommodation') {
    if (r.bookerType === 'corporate') return r.companyName || 'Corporate Stay'
    const rooms = r.metadata?.accommodation?.rooms || []
    if (rooms.length > 1) return `${rooms.length}-Room Stay`
    return r.roomName || rooms[0]?.room_name || 'Room Booking'
  }
  if (r.bookingType === 'event') return r.sessions[0]?.venue_name || 'Event Booking'
  if (r.bookingType === 'meals') return 'Meal Booking'
  return 'Booking'
}

function typeLabel(r) {
  if (r.bookingType === 'accommodation') return r.bookerType === 'corporate' ? 'Corporate Stay' : 'Stay'
  if (r.bookingType === 'event') return 'Event'
  if (r.bookingType === 'meals') return 'Meal'
  return 'Booking'
}

function fallbackIcon(r) {
  if (r.bookingType === 'accommodation') return 'bed'
  if (r.bookingType === 'event') return 'event'
  if (r.bookingType === 'meals') return 'restaurant'
  return 'bed'
}

const reservations = useReservationsStore()
onMounted(() => reservations.fetchAll())
</script>

<template>
  <div class="max-w-[1280px] mx-auto px-5 md:px-16 py-12">

    <!-- Page Header -->
    <header class="mb-12">
      <span class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-primary) mb-2 block">
        Your Account
      </span>
      <h1 class="font-serif text-[32px] font-semibold leading-10 text-(--color-on-surface)">Your Journeys</h1>
      <p class="font-sans text-base text-(--color-on-surface-variant) mt-3 max-w-md leading-relaxed">
        Every reservation, past and present — gathered in one quiet place.
      </p>
    </header>

    <!-- Loading -->
    <div v-if="reservations.loading" class="py-32 flex flex-col items-center gap-4">
      <span class="material-symbols-outlined text-5xl text-(--color-outline) animate-spin">progress_activity</span>
      <p class="font-sans text-sm text-(--color-on-surface-variant)">Loading your reservations…</p>
    </div>

    <template v-else>

      <!-- ── Active Reservations ─────────────────────────────────────── -->
      <section class="mb-16">
        <div class="flex items-center justify-between mb-8">
          <h2 class="font-serif text-2xl text-(--color-on-surface)">Active Reservations</h2>
          <RouterLink
            to="/lodges"
            class="font-sans text-sm font-semibold text-(--color-primary) flex items-center gap-1 hover:underline"
          >
            Browse lodges
            <span class="material-symbols-outlined text-base">arrow_forward</span>
          </RouterLink>
        </div>

        <!-- Empty state -->
        <div
          v-if="reservations.active.length === 0"
          class="text-center py-20 bg-(--color-surface-container-lowest) rounded-2xl"
        >
          <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">calendar_today</span>
          <p class="font-serif text-xl text-(--color-on-surface) mb-2">No upcoming stays</p>
          <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Your next adventure is waiting to be planned.</p>
          <RouterLink
            to="/lodges"
            class="inline-flex items-center gap-2 bg-(--color-primary) text-white px-6 py-2.5 rounded-full font-sans text-sm font-semibold hover:bg-(--color-primary-container) transition-colors"
          >
            <span class="material-symbols-outlined text-base">search</span>
            Explore Lodges
          </RouterLink>
        </div>

        <!-- Reservation cards -->
        <div v-else class="space-y-4">
          <component
            :is="r.recordType === 'booking' ? RouterLink : 'article'"
            v-for="r in reservations.active"
            :key="r.id"
            :to="r.recordType === 'booking' ? `/bookings/${r.id}` : undefined"
            class="bg-(--color-surface-container-lowest) rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row"
            :class="r.recordType === 'booking' ? 'cursor-pointer' : ''"
          >
            <!-- Image / icon panel -->
            <div class="sm:w-52 shrink-0 overflow-hidden relative">
              <img
                v-if="r.roomImage"
                :src="r.roomImage"
                :alt="r.roomName"
                class="w-full h-44 sm:h-full object-cover"
              />
              <div
                v-else
                class="w-full h-44 sm:h-full bg-(--color-surface-container) flex items-center justify-center"
              >
                <span class="material-symbols-outlined text-4xl text-(--color-outline)">{{ fallbackIcon(r) }}</span>
              </div>
              <div class="absolute top-3 left-3 flex flex-col gap-1.5">
                <StatusBadge :status="r.status" />
                <span
                  v-if="r.recordType === 'request'"
                  class="text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full"
                >
                  Awaiting approval
                </span>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 p-6 flex flex-col gap-4">
              <div class="flex items-start justify-between gap-4">
                <div class="space-y-1.5">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-primary)">
                      {{ typeLabel(r) }} · {{ r.bookingNumber || '#' + r.id.slice(0, 8) }}
                    </p>
                    <span class="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider bg-(--color-surface-container) text-(--color-on-surface-variant) px-2 py-0.5 rounded-full">
                      <span class="material-symbols-outlined text-[11px]">{{ r.bookerType === 'corporate' ? 'domain' : 'person' }}</span>
                      {{ r.bookerType === 'corporate' ? 'Corporate' : 'Individual' }}
                    </span>
                  </div>
                  <h3 class="font-serif text-2xl text-(--color-on-surface)">{{ cardTitle(r) }}</h3>
                  <p class="font-sans text-xs text-(--color-on-surface-variant) flex items-center gap-1">
                    <span class="material-symbols-outlined text-[13px]">{{ r.bookerType === 'corporate' ? 'domain' : 'person' }}</span>
                    {{ r.bookerType === 'corporate' ? (r.companyName || '—') : (r.bookerName || '—') }}
                  </p>
                </div>
                <p v-if="r.totalAmount" class="font-serif text-2xl text-(--color-primary) shrink-0">
                  K{{ r.totalAmount.toLocaleString() }}
                </p>
              </div>

              <!-- Details — individual accommodation -->
              <div
                v-if="r.bookingType === 'accommodation' && r.bookerType !== 'corporate'"
                class="flex flex-col gap-2 font-sans text-sm text-(--color-on-surface-variant)"
              >
                <div class="flex flex-wrap gap-x-6 gap-y-1.5">
                  <span v-if="r.checkIn" class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
                    {{ formatDate(r.checkIn) }} → {{ formatDate(r.checkOut) }}
                  </span>
                  <span v-if="r.nights" class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-base text-(--color-primary)">nights_stay</span>
                    {{ r.nights }} {{ r.nights === 1 ? 'night' : 'nights' }}
                  </span>
                </div>
                <!-- Rooms -->
                <div
                  v-if="(r.metadata?.accommodation?.rooms || []).length"
                  class="flex flex-wrap gap-2"
                >
                  <span
                    v-for="(room, i) in r.metadata.accommodation.rooms"
                    :key="i"
                    class="inline-flex items-center gap-1.5 text-xs bg-(--color-surface-container) text-(--color-on-surface) px-2.5 py-1 rounded-full"
                  >
                    <span class="material-symbols-outlined text-xs text-(--color-primary)">bed</span>
                    {{ room.room_name }}
                    <span v-if="room.room_type" class="text-(--color-on-surface-variant) capitalize">({{ room.room_type }})</span>
                  </span>
                </div>
                <span v-else-if="r.roomType" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-base text-(--color-primary)">bed</span>
                  {{ r.roomType }}
                </span>
              </div>

              <!-- Details — corporate accommodation -->
              <div
                v-else-if="r.bookingType === 'accommodation' && r.bookerType === 'corporate'"
                class="flex flex-wrap gap-x-6 gap-y-2 font-sans text-sm text-(--color-on-surface-variant)"
              >
                <span v-if="r.checkIn" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
                  {{ formatDate(r.checkIn) }} → {{ formatDate(r.checkOut) }}
                </span>
                <span v-if="r.nights" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-base text-(--color-primary)">nights_stay</span>
                  {{ r.nights }} {{ r.nights === 1 ? 'night' : 'nights' }}
                </span>
                <span v-if="r.assignedRooms.length" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-base text-(--color-primary)">bed</span>
                  {{ r.assignedRooms.length }} {{ r.assignedRooms.length === 1 ? 'room' : 'rooms' }} assigned
                </span>
                <span v-else-if="r.roomCount" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-base text-(--color-primary)">bed</span>
                  {{ r.roomCount }} {{ r.roomCount === 1 ? 'room' : 'rooms' }} requested
                </span>
              </div>

              <!-- Details — event -->
              <div
                v-else-if="r.bookingType === 'event'"
                class="flex flex-wrap gap-x-6 gap-y-2 font-sans text-sm text-(--color-on-surface-variant)"
              >
                <span v-if="r.startDate" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
                  {{ formatDate(r.startDate) }} → {{ formatDate(r.endDate) }}
                </span>
                <span v-if="r.sessions.length" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-base text-(--color-primary)">event</span>
                  {{ r.sessions.length }} {{ r.sessions.length === 1 ? 'session' : 'sessions' }}
                </span>
                <span v-if="r.sessions[0]?.expected_attendees" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-base text-(--color-primary)">group</span>
                  {{ r.sessions[0].expected_attendees }} attendees
                </span>
              </div>

              <!-- Details — meal -->
              <div
                v-else-if="r.bookingType === 'meals'"
                class="flex flex-wrap gap-x-6 gap-y-2 font-sans text-sm text-(--color-on-surface-variant)"
              >
                <span v-if="r.startDate" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
                  {{ formatDate(r.startDate) }} → {{ formatDate(r.endDate) }}
                </span>
                <span v-if="r.headcount" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-base text-(--color-primary)">group</span>
                  {{ r.headcount }} {{ r.headcount === 1 ? 'guest' : 'guests' }}
                </span>
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-between pt-4 mt-auto border-t border-(--color-outline-variant)">
                <div class="flex flex-col gap-0.5">
                  <span class="font-sans text-xs text-(--color-on-surface-variant)">
                    {{ r.recordType === 'request' ? 'Pending approval from lodge' : 'View details →' }}
                  </span>
                  <span v-if="r.createdAt" class="font-sans text-xs text-(--color-outline) flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">schedule</span>
                    Booked {{ formatDateTime(r.createdAt) }}
                  </span>
                </div>
                <button
                  v-if="r.recordType === 'request' && r.status === 'pending'"
                  class="border-2 border-(--color-error) text-(--color-error) px-4 py-1.5 rounded-full font-sans text-xs font-semibold hover:bg-(--color-error) hover:text-white transition-all"
                  @click="reservations.cancelRequest(r.id)"
                >
                  Cancel Request
                </button>
              </div>
            </div>
          </component>
        </div>
      </section>

      <!-- ── Past Journeys ──────────────────────────────────────────── -->
      <section>
        <h2 class="font-serif text-2xl text-(--color-on-surface) mb-8">Past Journeys</h2>

        <div
          v-if="reservations.past.length === 0"
          class="text-center py-16 font-sans text-sm text-(--color-on-surface-variant) bg-(--color-surface-container-low) rounded-2xl"
        >
          Your story is just beginning.
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <RouterLink
            v-for="r in reservations.past"
            :key="r.id"
            :to="`/bookings/${r.id}`"
            class="bg-(--color-surface-container-lowest) rounded-2xl overflow-hidden flex flex-col cursor-pointer hover:shadow-lg transition-all duration-300"
          >
            <!-- Image -->
            <div class="relative h-44 overflow-hidden">
              <img
                v-if="r.roomImage"
                :src="r.roomImage"
                :alt="r.roomName"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full bg-(--color-surface-container) flex items-center justify-center"
              >
                <span class="material-symbols-outlined text-4xl text-(--color-outline)">{{ fallbackIcon(r) }}</span>
              </div>
              <div class="absolute inset-0 bg-linear-to-t from-black/50 to-transparent"></div>
              <div class="absolute bottom-3 left-3">
                <StatusBadge :status="r.status" />
              </div>
            </div>

            <!-- Content -->
            <div class="p-5 flex flex-col gap-3 flex-1">
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-primary)">
                    {{ typeLabel(r) }}
                  </p>
                  <span class="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider bg-(--color-surface-container) text-(--color-on-surface-variant) px-2 py-0.5 rounded-full">
                    <span class="material-symbols-outlined text-[11px]">{{ r.bookerType === 'corporate' ? 'domain' : 'person' }}</span>
                    {{ r.bookerType === 'corporate' ? 'Corporate' : 'Individual' }}
                  </span>
                </div>
                <h3 class="font-serif text-xl text-(--color-on-surface)">{{ cardTitle(r) }}</h3>
                <p class="font-sans text-xs text-(--color-on-surface-variant) flex items-center gap-1">
                  <span class="material-symbols-outlined text-[13px]">{{ r.bookerType === 'corporate' ? 'domain' : 'person' }}</span>
                  {{ r.bookerType === 'corporate' ? (r.companyName || '—') : (r.bookerName || '—') }}
                </p>
              </div>

              <!-- individual accommodation -->
              <div v-if="r.bookingType === 'accommodation' && r.bookerType !== 'corporate'" class="space-y-2 font-sans text-xs text-(--color-on-surface-variant)">
                <p v-if="r.checkIn" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">calendar_today</span>
                  {{ formatDate(r.checkIn) }} — {{ formatDate(r.checkOut) }}
                </p>
                <p v-if="r.nights" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">nights_stay</span>
                  {{ r.nights }} {{ r.nights === 1 ? 'night' : 'nights' }}
                </p>
                <div v-if="(r.metadata?.accommodation?.rooms || []).length" class="flex flex-wrap gap-1.5">
                  <span
                    v-for="(room, i) in r.metadata.accommodation.rooms"
                    :key="i"
                    class="inline-flex items-center gap-1 bg-(--color-surface-container) text-(--color-on-surface) px-2 py-0.5 rounded-full"
                  >
                    <span class="material-symbols-outlined text-xs text-(--color-primary)">bed</span>
                    {{ room.room_name }}
                    <span v-if="room.room_type" class="text-(--color-on-surface-variant) capitalize">({{ room.room_type }})</span>
                  </span>
                </div>
              </div>

              <!-- corporate accommodation -->
              <div v-else-if="r.bookingType === 'accommodation' && r.bookerType === 'corporate'" class="space-y-1.5 font-sans text-xs text-(--color-on-surface-variant)">
                <p v-if="r.checkIn" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">calendar_today</span>
                  {{ formatDate(r.checkIn) }} — {{ formatDate(r.checkOut) }}
                </p>
                <p v-if="r.assignedRooms.length" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">bed</span>
                  {{ r.assignedRooms.length }} {{ r.assignedRooms.length === 1 ? 'room' : 'rooms' }}
                </p>
              </div>

              <!-- event -->
              <div v-else-if="r.bookingType === 'event'" class="space-y-1.5 font-sans text-xs text-(--color-on-surface-variant)">
                <p v-if="r.startDate" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">calendar_today</span>
                  {{ formatDate(r.startDate) }} — {{ formatDate(r.endDate) }}
                </p>
                <p v-if="r.sessions.length" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">event</span>
                  {{ r.sessions.length }} {{ r.sessions.length === 1 ? 'session' : 'sessions' }}
                </p>
              </div>

              <!-- meal -->
              <div v-else-if="r.bookingType === 'meals'" class="space-y-1.5 font-sans text-xs text-(--color-on-surface-variant)">
                <p v-if="r.startDate" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">calendar_today</span>
                  {{ formatDate(r.startDate) }} — {{ formatDate(r.endDate) }}
                </p>
                <p v-if="r.headcount" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">group</span>
                  {{ r.headcount }} {{ r.headcount === 1 ? 'guest' : 'guests' }}
                </p>
              </div>

              <div class="flex items-center justify-between pt-3 mt-auto border-t border-(--color-outline-variant)">
                <div>
                  <p class="font-serif text-xl text-(--color-primary)">K{{ r.totalAmount.toLocaleString() }}</p>
                  <p v-if="r.createdAt" class="font-sans text-xs text-(--color-outline) flex items-center gap-1 mt-0.5">
                    <span class="material-symbols-outlined text-xs">schedule</span>
                    {{ formatDateTime(r.createdAt) }}
                  </p>
                </div>
                <span class="font-sans text-xs text-(--color-on-surface-variant)">View details →</span>
              </div>
            </div>
          </RouterLink>
        </div>
      </section>

    </template>
  </div>
</template>

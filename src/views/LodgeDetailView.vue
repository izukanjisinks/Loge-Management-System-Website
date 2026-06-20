<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLodgesStore } from '@/stores/lodges'
import { useBookingStore } from '@/stores/booking'
import { useRooms, amenityIcon, roomImage } from '@/composables/useRooms'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/index'
import api from '@/lib/api'
import BookingTypeModal from '@/components/booking/BookingTypeModal.vue'

const route = useRoute()
const router = useRouter()

const lodgeId     = route.params.id
const lodgesStore = useLodgesStore()
const booking     = useBookingStore()

const lodgeLoading = computed(() => lodgesStore.loading)
const lodgeError   = computed(() => lodgesStore.error)
const lodge        = computed(() => lodgesStore.lodges.find(l => l.id === lodgeId))
const branches     = computed(() => lodgesStore.branchesFor(lodgeId))

const { rooms, total: roomsTotal, page: roomsPage, totalPages: roomsTotalPages, loading: roomsLoading, error: roomsError, fetchRooms } = useRooms()

const activeTab     = ref('rooms')  // 'rooms' | 'venues'
const searched      = ref(false)
const dateFilters   = ref({})
const filterBranch  = ref('')

// ── Venues ────────────────────────────────────────────────────────────────────
const venues        = ref([])
const venuesLoading = ref(false)
const venuesError   = ref('')

async function fetchVenues() {
  venuesLoading.value = true
  venuesError.value   = ''
  try {
    const { data } = await api.get('/guest/venues', { params: { org_id: lodgeId } })
    venues.value = data.data ?? data
  } catch {
    venuesError.value = 'Unable to load venues. Please try again.'
  } finally {
    venuesLoading.value = false
  }
}

watch(filterBranch, () => {
  const params = { org_id: lodgeId, ...dateFilters.value }
  if (filterBranch.value) params.branch_id = filterBranch.value
  fetchRooms(params)
})

async function goToPage(p) {
  const params = { org_id: lodgeId, page: p, ...dateFilters.value }
  if (filterBranch.value) params.branch_id = filterBranch.value
  await fetchRooms(params)
}

const todayDate    = today(getLocalTimeZone())
const checkInOpen  = ref(false)
const checkOutOpen = ref(false)
const checkIn  = ref('')
const checkOut = ref('')

function toIso(cd) {
  if (!cd) return ''
  return `${cd.year}-${String(cd.month).padStart(2, '0')}-${String(cd.day).padStart(2, '0')}`
}

function formatDisplay(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const checkInValue = computed({
  get: () => checkIn.value ? parseDate(checkIn.value) : undefined,
  set: (v) => { checkIn.value = toIso(v); checkInOpen.value = false },
})

const checkOutValue = computed({
  get: () => checkOut.value ? parseDate(checkOut.value) : undefined,
  set: (v) => { checkOut.value = toIso(v); checkOutOpen.value = false },
})

const checkOutMin = computed(() =>
  checkIn.value ? parseDate(checkIn.value).add({ days: 1 }) : todayDate.add({ days: 1 })
)

const nights = computed(() => {
  if (!checkIn.value || !checkOut.value) return 0
  const diff = new Date(checkOut.value) - new Date(checkIn.value)
  return Math.max(0, Math.floor(diff / 86400000))
})

onMounted(async () => {
  await lodgesStore.fetchLodges()
  lodgesStore.fetchLodgeDetail(lodgeId)
  fetchRooms({ org_id: lodgeId })
  fetchVenues()
})

const COVERS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=80',
  'https://images.unsplash.com/photo-1444201983204-c43cbd584d93?w=1200&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
]

function lodgeCover(i) {
  return lodge.value?.logoUrl ?? COVERS[i % COVERS.length]
}

async function checkAvailability() {
  if (nights.value === 0) return
  searched.value = false
  dateFilters.value = { check_in: checkIn.value, check_out: checkOut.value }
  const params = { org_id: lodgeId, ...dateFilters.value }
  if (filterBranch.value) params.branch_id = filterBranch.value
  await fetchRooms(params)
  searched.value = true
}

const selectedRoom     = ref(null)
const bookingModalOpen = ref(false)

function reserve(room) {
  selectedRoom.value     = room
  bookingModalOpen.value = true
}

function onRoomBookingConfirmed(type) {
  const room = selectedRoom.value
  if (!room) return
  const q = {
    roomId:   room.id,
    roomName: room.name,
    roomType: room.type ?? room.type_label ?? '',
    rate:     parseFloat(room.price_per_night) || 0,
  }
  if (checkIn.value)  q.checkIn  = checkIn.value
  if (checkOut.value) q.checkOut = checkOut.value
  router.push({
    name:   type === 'individual' ? 'individual-booking' : 'corporate-booking',
    params: { id: lodgeId },
    query:  q,
  })
}

// ── Venue display helpers ─────────────────────────────────────────────────────
function venueLocationIcon(type) {
  if (type === 'outdoor')      return 'park'
  if (type === 'semi_outdoor') return 'open_in_full'
  return 'warehouse'
}
function venueLocationLabel(type) {
  if (type === 'outdoor')      return 'Outdoor'
  if (type === 'semi_outdoor') return 'Semi-Outdoor'
  return 'Indoor'
}
function venueTypeIcon(type) {
  const icons = {
    conference_room: 'corporate_fare', boardroom: 'meeting_room',
    banquet_hall: 'celebration',       wedding_venue: 'favorite',
    garden: 'local_florist',           marquee: 'festival',
    training_room: 'school',           exhibition: 'museum',
    amphitheatre: 'theater_comedy',
  }
  return icons[type] ?? 'event'
}
function venueAmenityIcon(label) {
  const l = (label ?? '').toLowerCase()
  if (l.includes('wifi') || l.includes('wi-fi'))         return 'wifi'
  if (l.includes('projector') || l.includes('screen'))   return 'connected_tv'
  if (l.includes('pa') || l.includes('sound'))           return 'volume_up'
  if (l.includes('air') || l.includes('climate'))        return 'ac_unit'
  if (l.includes('stage') || l.includes('podium'))       return 'mic'
  if (l.includes('parking'))                             return 'local_parking'
  if (l.includes('catering') || l.includes('dining'))    return 'restaurant'
  if (l.includes('bar'))                                 return 'local_bar'
  if (l.includes('video') || l.includes('conferencing')) return 'videocam'
  if (l.includes('whiteboard') || l.includes('flip'))    return 'draw'
  if (l.includes('display') || l.includes('4k'))         return 'monitor'
  if (l.includes('generator'))                           return 'bolt'
  return 'check_circle'
}
</script>

<template>
  <!-- Loading -->
  <div v-if="lodgeLoading" class="max-w-[1280px] mx-auto px-5 md:px-16 py-10 animate-pulse space-y-6">
    <div class="h-72 bg-(--color-surface-container-highest) rounded-2xl"></div>
    <div class="h-8 bg-(--color-surface-container-highest) rounded max-w-xs"></div>
    <div class="h-4 bg-(--color-surface-container-highest) rounded max-w-48"></div>
  </div>

  <!-- Error / not found -->
  <div v-else-if="lodgeError || (!lodgeLoading && !lodge)"
    class="max-w-[1280px] mx-auto px-5 md:px-16 py-32 text-center">
    <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">search_off</span>
    <p class="font-serif text-2xl text-(--color-on-surface) mb-2">Lodge not found</p>
    <RouterLink to="/lodges" class="font-sans text-sm text-(--color-primary) hover:underline">← Back to lodges
    </RouterLink>
  </div>

  <div v-else-if="lodge" class="pb-24">

    <!-- ── Hero banner ────────────────────────────────────────────── -->
    <section class="relative h-64 md:h-80 overflow-hidden">
      <img :src="lodgeCover(0)" :alt="lodge.name" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent"></div>
      <div class="relative z-10 h-full flex flex-col justify-end px-5 md:px-16 pb-10 max-w-[1280px] mx-auto">
        <RouterLink to="/lodges"
          class="flex items-center gap-1 font-sans text-sm text-white/70 hover:text-white mb-4 transition-colors w-fit">
          <span class="material-symbols-outlined text-base">arrow_back</span>
          All lodges
        </RouterLink>
        <h1 class="font-serif text-3xl md:text-4xl font-semibold text-white">{{ lodge.name }}</h1>
        <p v-if="lodge.address" class="flex items-center gap-1.5 font-sans text-sm text-white/80 mt-2">
          <span class="material-symbols-outlined text-base">location_on</span>
          {{ lodge.address }}
        </p>
      </div>
    </section>

    <!-- ── Lodge info strip ───────────────────────────────────────── -->
    <div class="bg-(--color-surface) border-b border-(--color-outline-variant)">
      <div class="max-w-[1280px] mx-auto px-5 md:px-16 py-5 flex flex-wrap gap-6">
        <div v-if="lodge.email" class="flex items-center gap-2 font-sans text-sm text-(--color-on-surface-variant)">
          <span class="material-symbols-outlined text-base text-(--color-primary)">mail</span>
          {{ lodge.email }}
        </div>
        <div v-if="lodge.phone" class="flex items-center gap-2 font-sans text-sm text-(--color-on-surface-variant)">
          <span class="material-symbols-outlined text-base text-(--color-primary)">phone</span>
          {{ lodge.phone }}
        </div>
      </div>
    </div>

    <!-- ── Availability checker (Rooms only) ────────────────────────── -->
    <section v-if="activeTab === 'rooms'" class="max-w-[1280px] mx-auto px-5 md:px-16 mt-5">
      <h2 class="font-serif text-[28px] font-semibold text-(--color-on-surface) mb-2">Check Availability</h2>
      <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">
        Pick your dates to see which rooms are free at {{ lodge.name }}.
      </p>

      <div class="flex flex-col sm:flex-row gap-4 p-5 bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) mb-6">
        <!-- Branch  selector -->
        <div v-if="branches.length >1" class="flex-1 flex flex-col gap-1">
          <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Branch</label>
          <select
            v-model="filterBranch"
            class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all cursor-pointer"
          >
            <option value="">All Branches</option>
            <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>

        <!-- Check-in -->
        <div class="flex-1 flex flex-col gap-1">
          <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-in</label>
          <Popover v-model:open="checkInOpen">
            <PopoverTrigger as-child>
              <button type="button" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 flex items-center gap-2 text-left focus:outline-none">
                <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
                <span class="font-sans text-sm" :class="checkIn ? 'text-(--color-on-surface)' : 'text-(--color-outline)'">
                  {{ formatDisplay(checkIn) || 'Select date' }}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" class="w-auto">
              <Calendar v-model="checkInValue" :min-value="todayDate" layout="month-and-year" />
            </PopoverContent>
          </Popover>
        </div>

        <!-- Check-out -->
        <div class="flex-1 flex flex-col gap-1">
          <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-out</label>
          <Popover v-model:open="checkOutOpen">
            <PopoverTrigger as-child>
              <button type="button" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 flex items-center gap-2 text-left focus:outline-none">
                <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
                <span class="font-sans text-sm" :class="checkOut ? 'text-(--color-on-surface)' : 'text-(--color-outline)'">
                  {{ formatDisplay(checkOut) || 'Select date' }}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" class="w-auto">
              <Calendar v-model="checkOutValue" :min-value="checkOutMin" layout="month-and-year" />
            </PopoverContent>
          </Popover>
        </div>

        <div class="flex items-end">
          <button
            :disabled="nights === 0 || roomsLoading"
            class="w-full sm:w-auto px-7 py-2.5 bg-(--color-primary) text-white rounded-full font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors flex items-center gap-2 disabled:opacity-50"
            @click="checkAvailability"
          >
            <span v-if="roomsLoading" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
            <span v-else class="material-symbols-outlined text-base">search</span>
            {{ roomsLoading ? 'Checking…' : `Check${nights > 0 ? ` (${nights} night${nights !== 1 ? 's' : ''})` : ''}` }}
          </button>
        </div>
      </div>
    </section>

    <!-- ── Individual Booking CTA ───────────────────────────────────── -->
    <section class="max-w-[1280px] mx-auto px-5 md:px-16 mt-6">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant)">
        <div class="flex items-start gap-4">
          <span class="material-symbols-outlined text-2xl text-(--color-primary) mt-0.5 shrink-0" style="font-variation-settings: 'FILL' 1">person</span>
          <div>
            <h3 class="font-serif text-lg text-(--color-on-surface)">Individual Guest Booking</h3>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mt-0.5">Book accommodation, events, and meals for yourself or a small group of guests.</p>
          </div>
        </div>
        <RouterLink :to="{ name: 'individual-booking', params: { id: lodgeId }, query: filterBranch ? { branchId: filterBranch } : {} }"
          class="shrink-0 flex items-center gap-2 px-6 py-2.5 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-full hover:bg-(--color-clay-earth) transition-colors whitespace-nowrap">
          <span class="material-symbols-outlined text-base">arrow_forward</span>
          Book as Guest
        </RouterLink>
      </div>
    </section>

    <!-- ── Corporate Booking CTA ────────────────────────────────────── -->
    <section class="max-w-[1280px] mx-auto px-5 md:px-16 mt-4">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant)">
        <div class="flex items-start gap-4">
          <span class="material-symbols-outlined text-2xl text-(--color-primary) mt-0.5 shrink-0">business_center</span>
          <div>
            <h3 class="font-serif text-lg text-(--color-on-surface)">Corporate &amp; Group Bookings</h3>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mt-0.5">Book accommodation, meals, and conference rooms for your team in one request.</p>
            <p v-if="branches.length > 1 && !filterBranch" class="font-sans text-xs text-(--color-error) font-semibold mt-1.5 flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">warning</span>
              A branch must be selected before making a corporate booking.
            </p>
            <p v-if="branches.length > 1 && filterBranch" class="font-sans text-xs text-(--color-primary) font-semibold mt-1.5 flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">location_on</span>
              {{ branches.find(b => b.id === filterBranch)?.name }}
            </p>
          </div>
        </div>

        <!-- Disabled state when branch not selected -->
        <span v-if="branches.length > 1 && !filterBranch"
          class="shrink-0 flex items-center gap-2 px-6 py-2.5 bg-(--color-outline-variant) text-(--color-on-surface-variant) font-sans text-sm font-semibold rounded-full whitespace-nowrap cursor-not-allowed opacity-60"
          title="Select a branch first">
          <span class="material-symbols-outlined text-base">lock</span>
          Corporate Booking
        </span>
        <RouterLink v-else :to="{ name: 'corporate-booking', params: { id: lodgeId }, query: filterBranch ? { branchId: filterBranch } : {} }"
          class="shrink-0 flex items-center gap-2 px-6 py-2.5 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-full hover:bg-(--color-clay-earth) transition-colors whitespace-nowrap">
          <span class="material-symbols-outlined text-base">arrow_forward</span>
          Corporate Booking
        </RouterLink>
      </div>
    </section>

    <!-- ── Rooms & Venues tabs ───────────────────────────────────── -->
    <section class="max-w-[1280px] mx-auto px-5 md:px-16 mt-12">

      <!-- Tab header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 class="font-serif text-[28px] font-semibold text-(--color-on-surface)">What's Available</h2>
          <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1">
            <template v-if="activeTab === 'rooms'">
              <template v-if="roomsLoading">Loading rooms…</template>
              <template v-else-if="searched">{{ rooms.length }} room{{ rooms.length !== 1 ? 's' : '' }} available for selected dates</template>
              <template v-else>{{ rooms.length }} room{{ rooms.length !== 1 ? 's' : '' }} &middot; {{ venues.length }} venue{{ venues.length !== 1 ? 's' : '' }}</template>
            </template>
            <template v-else>
              {{ venues.length }} venue{{ venues.length !== 1 ? 's' : '' }} at {{ lodge.name }}
            </template>
          </p>
        </div>

        <!-- Tab toggle -->
        <div class="flex items-center gap-1 p-1 bg-(--color-savannah-mist) rounded-xl shrink-0 self-start sm:self-auto">
          <button
            :class="activeTab === 'rooms'
              ? 'bg-(--color-primary) text-white shadow-sm'
              : 'text-(--color-on-surface-variant) hover:text-(--color-on-surface)'"
            class="flex items-center gap-2 px-5 py-2.5 rounded-lg font-sans text-sm font-semibold transition-all"
            @click="activeTab = 'rooms'"
          >
            <span class="material-symbols-outlined text-base">bed</span>
            Rooms
          </button>
          <button
            :class="activeTab === 'venues'
              ? 'bg-(--color-primary) text-white shadow-sm'
              : 'text-(--color-on-surface-variant) hover:text-(--color-on-surface)'"
            class="flex items-center gap-2 px-5 py-2.5 rounded-lg font-sans text-sm font-semibold transition-all"
            @click="activeTab = 'venues'"
          >
            <span class="material-symbols-outlined text-base">event</span>
            Venues
          </button>
        </div>
      </div>

      <!-- ── Rooms tab content ─────────────────────────────────────── -->
      <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0" mode="out-in">
        <div v-if="activeTab === 'rooms'" key="rooms">

          <!-- Rooms error -->
          <div v-if="roomsError && !roomsLoading" class="py-12 text-center bg-(--color-error-container) rounded-2xl mb-8">
            <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-3">wifi_off</span>
            <p class="font-sans text-sm text-(--color-on-error-container)">{{ roomsError }}</p>
          </div>

          <!-- Rooms skeleton -->
          <div v-if="roomsLoading && !rooms.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <div v-for="i in 3" :key="i"
              class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden animate-pulse">
              <div class="h-44 bg-(--color-surface-container-highest)"></div>
              <div class="p-4 space-y-2">
                <div class="h-4 bg-(--color-surface-container-highest) rounded max-w-48"></div>
                <div class="h-3 bg-(--color-surface-container-highest) rounded max-w-32"></div>
              </div>
            </div>
          </div>

          <!-- Room cards -->
          <div v-else-if="rooms.length" class="relative mb-16">
            <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100"
              leave-active-class="transition duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="roomsLoading" class="absolute inset-0 z-10 bg-(--color-background) flex items-center justify-center rounded-2xl">
                <span class="material-symbols-outlined text-4xl text-(--color-primary) animate-spin">progress_activity</span>
              </div>
            </Transition>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div v-for="room in rooms" :key="room.id"
                class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden shadow-sm flex flex-col cursor-pointer group hover:shadow-lg transition-shadow duration-300"
                @click="router.push({ name: 'room-detail', params: { id: room.id } })">
                <div class="relative h-44 overflow-hidden">
                  <img :src="roomImage(room)" :alt="room.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div class="absolute inset-0 bg-linear-to-t from-black/40 to-transparent"></div>
                  <span :class="room.is_available ? 'bg-emerald-500/90' : 'bg-rose-500/90'"
                    class="absolute top-3 right-3 text-white font-sans text-xs font-semibold px-2.5 py-1 rounded-full">
                    {{ room.is_available ? 'Available' : 'Unavailable' }}
                  </span>
                  <span class="absolute bottom-3 left-3 font-sans text-xs font-semibold bg-(--color-primary) text-white px-2.5 py-1 rounded-full capitalize">
                    {{ room.type }}
                  </span>
                </div>
                <div class="p-5 flex flex-col flex-1">
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <h3 class="font-serif text-lg text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">{{ room.name }}</h3>
                    <div class="text-right shrink-0">
                      <p class="font-serif text-lg text-(--color-primary)">K{{ Number(room.price_per_night).toLocaleString() }}</p>
                      <span class="font-sans text-xs text-(--color-on-surface-variant)">/ night</span>
                    </div>
                  </div>
                  <p class="flex items-center gap-1.5 font-sans text-xs text-(--color-on-surface-variant) mb-3">
                    <span class="material-symbols-outlined text-sm text-(--color-primary)">people</span>
                    Sleeps {{ room.capacity }}
                  </p>
                  <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed line-clamp-2 mb-4 flex-1">
                    {{ room.description || 'A comfortable and well-appointed room.' }}
                  </p>
                  <div class="flex flex-wrap gap-1 mb-4">
                    <span v-for="a in (room.amenities ?? []).slice(0, 3)" :key="a"
                      class="flex items-center gap-1 bg-(--color-savannah-mist) text-(--color-on-surface-variant) px-2 py-0.5 rounded font-sans text-xs">
                      <span class="material-symbols-outlined text-sm text-(--color-primary)">{{ amenityIcon(a) }}</span>
                      {{ a }}
                    </span>
                  </div>
                  <button
                    :disabled="!room.is_available"
                    class="w-full py-2.5 rounded-full font-sans text-sm font-semibold transition-all bg-(--color-primary) text-white hover:bg-(--color-clay-earth) disabled:opacity-40 disabled:cursor-not-allowed"
                    @click.stop="reserve(room)">
                    {{ room.is_available ? 'Reserve' : 'Unavailable' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="!roomsLoading"
            class="py-16 text-center bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) mb-8">
            <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">{{ searched ? 'event_busy' : 'bed' }}</span>
            <p class="font-serif text-xl text-(--color-on-surface)">{{ searched ? 'No rooms available' : 'No rooms listed' }}</p>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mt-2">{{ searched ? 'All rooms are booked for those dates. Try different dates.' : 'This property has no rooms configured yet.' }}</p>
          </div>

          <!-- Pagination -->
          <div class="flex items-center justify-center gap-2 mt-10 mb-4">
            <button :disabled="roomsPage <= 1 || roomsLoading"
              class="w-9 h-9 flex items-center justify-center rounded-full border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              @click="goToPage(roomsPage - 1)">
              <span class="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <button v-for="p in roomsTotalPages" :key="p"
              :class="p === roomsPage ? 'bg-(--color-primary) text-white border-transparent' : 'border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container)'"
              class="w-9 h-9 flex items-center justify-center rounded-full border font-sans text-sm font-medium transition-colors"
              @click="goToPage(p)">
              {{ p }}
            </button>
            <button :disabled="roomsPage >= roomsTotalPages || roomsLoading"
              class="w-9 h-9 flex items-center justify-center rounded-full border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              @click="goToPage(roomsPage + 1)">
              <span class="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>

        <!-- ── Venues tab content ──────────────────────────────────────── -->
        <div v-else-if="activeTab === 'venues'" key="venues">

          <!-- Venues error -->
          <div v-if="venuesError && !venuesLoading" class="py-12 text-center bg-(--color-error-container) rounded-2xl mb-8">
            <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-3">wifi_off</span>
            <p class="font-sans text-sm text-(--color-on-error-container)">{{ venuesError }}</p>
          </div>

          <!-- Venues skeleton — same structure as rooms skeleton -->
          <div v-if="venuesLoading && !venues.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <div v-for="i in 3" :key="i"
              class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden animate-pulse">
              <div class="h-44 bg-(--color-surface-container-highest)"></div>
              <div class="p-5 space-y-2">
                <div class="h-4 bg-(--color-surface-container-highest) rounded max-w-48"></div>
                <div class="h-3 bg-(--color-surface-container-highest) rounded max-w-32"></div>
                <div class="h-3 bg-(--color-surface-container-highest) rounded max-w-full"></div>
                <div class="h-3 bg-(--color-surface-container-highest) rounded max-w-3/4"></div>
              </div>
            </div>
          </div>

          <!-- Venue cards — inline, same structure as room cards above -->
          <div v-else-if="venues.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <div
              v-for="venue in venues"
              :key="venue.id"
              class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden shadow-sm flex flex-col cursor-pointer group hover:shadow-lg transition-shadow duration-300"
              @click="router.push({ name: 'venue-detail', params: { id: venue.id } })"
            >
              <!-- Image -->
              <div class="relative h-44 overflow-hidden">
                <img v-if="venue.images?.[0]" :src="venue.images[0]" :alt="venue.name"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy" />
                <div v-else class="w-full h-full bg-(--color-surface-container) flex items-center justify-center">
                  <span class="material-symbols-outlined text-5xl text-(--color-outline)">event</span>
                </div>
                <div class="absolute inset-0 bg-linear-to-t from-black/40 to-transparent"></div>

                <!-- Indoor / Outdoor — top left -->
                <span class="absolute top-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-full font-sans text-xs font-semibold">
                  <span class="material-symbols-outlined text-sm">{{ venueLocationIcon(venue.location_type) }}</span>
                  {{ venueLocationLabel(venue.location_type) }}
                </span>

                <!-- Capacity — top right -->
                <span class="absolute top-3 right-3 flex items-center gap-1 bg-white/90 text-(--color-on-surface) px-2.5 py-1 rounded-full font-sans text-xs font-semibold">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">group</span>
                  up to {{ venue.max_capacity }}
                </span>

                <!-- Venue type — bottom left -->
                <span class="absolute bottom-3 left-3 flex items-center gap-1 bg-(--color-primary) text-white px-2.5 py-1 rounded-full font-sans text-xs font-semibold">
                  <span class="material-symbols-outlined text-sm">{{ venueTypeIcon(venue.type) }}</span>
                  {{ venue.type_label }}
                </span>
              </div>

              <!-- Info -->
              <div class="p-5 flex flex-col flex-1">
                <h3 class="font-serif text-lg text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors mb-2">
                  {{ venue.name }}
                </h3>
                <p class="flex items-center gap-1.5 font-sans text-xs text-(--color-on-surface-variant) mb-3">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">groups</span>
                  Up to {{ venue.max_capacity }} guests
                </p>
                <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed line-clamp-2 mb-4 flex-1">
                  {{ venue.description }}
                </p>
                <div class="flex flex-wrap gap-1 mb-4">
                  <span
                    v-for="a in (venue.amenities ?? []).slice(0, 3)"
                    :key="a"
                    class="flex items-center gap-1 bg-(--color-savannah-mist) text-(--color-on-surface-variant) px-2 py-0.5 rounded font-sans text-xs"
                  >
                    <span class="material-symbols-outlined text-sm text-(--color-primary)">{{ venueAmenityIcon(a) }}</span>
                    {{ a }}
                  </span>
                </div>
                <button
                  type="button"
                  class="w-full py-2.5 rounded-full font-sans text-sm font-semibold bg-(--color-primary) text-white hover:bg-(--color-clay-earth) transition-colors"
                  @click.stop="router.push({ name: 'venue-detail', params: { id: venue.id } })"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else-if="!venuesLoading"
            class="py-16 text-center bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) mb-8">
            <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">event</span>
            <p class="font-serif text-xl text-(--color-on-surface)">No venues listed</p>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mt-2">This property has no event spaces configured yet.</p>
          </div>
        </div>
      </Transition>
    </section>

  </div>

  <BookingTypeModal
    v-model="bookingModalOpen"
    :context="selectedRoom
      ? { itemType: 'room', name: selectedRoom.name, lodgeName: lodge?.name ?? '' }
      : { itemType: 'room', name: '', lodgeName: lodge?.name ?? '' }"
    @confirm="onRoomBookingConfirmed"
  />
</template>

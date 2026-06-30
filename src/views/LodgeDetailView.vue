<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLodgesStore } from '@/stores/lodges'
import { useRooms, amenityIcon, roomImage } from '@/composables/useRooms'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/index'
import api from '@/lib/api'

const route = useRoute()
const router = useRouter()

const lodgeId     = route.params.id
const lodgesStore = useLodgesStore()

const lodgeLoading    = computed(() => lodgesStore.loading)
const lodgeError      = computed(() => lodgesStore.error)
const lodge           = computed(() => lodgesStore.lodges.find(l => l.id === lodgeId))
const branches        = computed(() => lodgesStore.branchesFor(lodgeId))
const selectedBranchObj = computed(() =>
  selectedBranch.value
    ? branches.value.find(b => String(b.id) === selectedBranch.value) ?? null
    : null
)

const { rooms, page: roomsPage, totalPages: roomsTotalPages, loading: roomsLoading, error: roomsError, fetchRooms } = useRooms()

// ── State — initialised from URL so refresh / link-sharing restores context ────
const VALID_TABS = ['accommodation', 'events', 'meals']
const selectedBranch = ref(route.query.branch ?? '')
const activeTab      = ref(VALID_TABS.includes(route.query.tab) ? route.query.tab : 'accommodation')

// Date filter
const todayDate    = today(getLocalTimeZone())
const checkInOpen  = ref(false)
const checkOutOpen = ref(false)
const checkIn      = ref('')
const checkOut     = ref('')
const searched     = ref(false)
const dateFilters  = ref({})

// Venues
const venues        = ref([])
const venuesLoading = ref(false)
const venuesError   = ref('')

// ── Date helpers ──────────────────────────────────────────────────────────────
function toIso(cd) {
  if (!cd) return ''
  return `${cd.year}-${String(cd.month).padStart(2, '0')}-${String(cd.day).padStart(2, '0')}`
}
function fmt(iso) {
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
  return Math.max(0, Math.floor((new Date(checkOut.value) - new Date(checkIn.value)) / 86400000))
})

// ── Data ──────────────────────────────────────────────────────────────────────
function buildRoomParams(extra = {}) {
  const p = { org_id: lodgeId, ...dateFilters.value, ...extra }
  if (selectedBranch.value) p.branch_id = selectedBranch.value
  return p
}

function loadRooms(extra = {}) { fetchRooms(buildRoomParams(extra)) }

async function checkAvailability() {
  if (nights.value === 0) return
  dateFilters.value = { check_in: checkIn.value, check_out: checkOut.value }
  await fetchRooms(buildRoomParams())
  searched.value = true
}

function clearDates() {
  checkIn.value = ''
  checkOut.value = ''
  dateFilters.value = {}
  searched.value = false
  loadRooms()
}

async function goToPage(p) { await fetchRooms(buildRoomParams({ page: p })) }

async function loadVenues() {
  venuesLoading.value = true
  venuesError.value   = ''
  try {
    const params = { org_id: lodgeId }
    if (selectedBranch.value) params.branch_id = selectedBranch.value
    const { data } = await api.get('/guest/venues', { params })
    venues.value = data.data ?? data
  } catch {
    venuesError.value = 'Unable to load venues. Please try again.'
  } finally {
    venuesLoading.value = false
  }
}

// ── Menu ──────────────────────────────────────────────────────────────────────
const menuItems   = ref([])
const menuLoading = ref(false)
const menuError   = ref('')

function menuBranchId() {
  if (selectedBranch.value) return selectedBranch.value
  if (branches.value.length === 1) return String(branches.value[0].id)
  return null
}

async function loadMenu() {
  menuLoading.value = true
  menuError.value   = ''
  menuItems.value   = []
  try {
    const params = { org_id: lodgeId }
    const branchId = menuBranchId()
    if (branchId) params.branch_id = branchId

    const { data } = await api.get('/guest/menu', { params })
    const wrapper  = data.items
    const firstPage = wrapper?.data ?? []
    const total     = wrapper?.total    ?? firstPage.length
    const pageSize  = wrapper?.page_size ?? 10
    const totalPages = Math.ceil(total / pageSize)

    // Fetch remaining pages in parallel so all categories show
    let rest = []
    if (totalPages > 1) {
      const requests = Array.from({ length: totalPages - 1 }, (_, i) =>
        api.get('/guest/menu', { params: { ...params, page: i + 2, page_size: pageSize } })
      )
      const results = await Promise.all(requests)
      rest = results.flatMap(r => r.data.items?.data ?? [])
    }

    menuItems.value = [...firstPage, ...rest]
  } catch (err) {
    if (err.response?.status === 400 || err.response?.status === 404) {
      menuItems.value = []
    } else {
      menuError.value = 'Unable to load menu. Please try again.'
    }
  } finally {
    menuLoading.value = false
  }
}

function menuCategoryIcon(category) {
  const m = {
    main: 'dinner_dining',       main_course: 'dinner_dining',  starter: 'restaurant',
    appetizer: 'restaurant',     dessert: 'cake',               beverage: 'local_cafe',
    drinks: 'local_cafe',        breakfast: 'free_breakfast',   brunch: 'brunch_dining',
    lunch: 'lunch_dining',       dinner: 'dinner_dining',       snack: 'bakery_dining',
    buffet: 'food_bank',         soup: 'soup_kitchen',          salad: 'nutrition',
  }
  return m[category?.toLowerCase()] ?? 'restaurant_menu'
}

function menuCategoryLabel(c) {
  if (!c) return 'Menu Item'
  return c.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const menuByCategory = computed(() => {
  const order = ['breakfast', 'brunch', 'starter', 'appetizer', 'soup', 'salad',
                  'main', 'main_course', 'lunch', 'dinner', 'buffet',
                  'dessert', 'snack', 'bakery', 'beverage', 'drinks']
  const map = {}
  for (const item of menuItems.value) {
    const key = item.category ?? 'other'
    if (!map[key]) map[key] = []
    map[key].push(item)
  }
  return Object.entries(map).sort(([a], [b]) => {
    const ia = order.indexOf(a), ib = order.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
})

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(selectedBranch, (val) => {
  router.replace({ query: { ...route.query, branch: val || undefined } })
  checkIn.value = ''
  checkOut.value = ''
  dateFilters.value = {}
  searched.value = false
  loadRooms()
  if (activeTab.value === 'events') loadVenues()
  if (activeTab.value === 'meals') loadMenu()
})

watch(activeTab, (tab) => {
  router.replace({ query: { ...route.query, tab: tab === 'accommodation' ? undefined : tab } })
  if (tab === 'events' && !venues.value.length && !venuesLoading.value) loadVenues()
  if (tab === 'meals') loadMenu()
})

// ── Init ──────────────────────────────────────────────────────────────────────
const COVERS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=80',
  'https://images.unsplash.com/photo-1444201983204-c43cbd584d93?w=1200&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
]
function lodgeCover(i) { return lodge.value?.logoUrl ?? COVERS[i % COVERS.length] }

onMounted(async () => {
  await lodgesStore.fetchLodges()
  lodgesStore.fetchLodgeDetail(lodgeId)
  loadRooms()
  if (activeTab.value === 'events') loadVenues()
  if (activeTab.value === 'meals')  loadMenu()
})

// ── Venue helpers ─────────────────────────────────────────────────────────────
function venueLocationIcon(t) {
  return t === 'outdoor' ? 'park' : t === 'semi_outdoor' ? 'open_in_full' : 'warehouse'
}
function venueLocationLabel(t) {
  return t === 'outdoor' ? 'Outdoor' : t === 'semi_outdoor' ? 'Semi-Outdoor' : 'Indoor'
}
function venueTypeIcon(type) {
  const m = {
    conference_room: 'corporate_fare', boardroom: 'meeting_room',
    banquet_hall: 'celebration',       wedding_venue: 'favorite',
    garden: 'local_florist',           marquee: 'festival',
    training_room: 'school',           exhibition: 'museum',
    amphitheatre: 'theater_comedy',
  }
  return m[type] ?? 'event'
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

// ── Booking ───────────────────────────────────────────────────────────────────
function branchQuery() {
  return selectedBranch.value ? { branchId: selectedBranch.value } : {}
}

function bookRoom(room) {
  router.push({
    name:   'accommodation-booking',
    params: { id: lodgeId },
    query:  {
      roomId:   room.id,
      roomName: room.name,
      roomType: room.type ?? room.type_label ?? '',
      rate:     parseFloat(room.price_per_night) || 0,
      ...(checkIn.value  ? { checkIn:  checkIn.value  } : {}),
      ...(checkOut.value ? { checkOut: checkOut.value } : {}),
      ...branchQuery(),
    },
  })
}

</script>

<template>
  <!-- ── Loading skeleton ─────────────────────────────────────────────────── -->
  <div v-if="lodgeLoading" class="max-w-[1280px] mx-auto px-5 md:px-16 py-10 animate-pulse space-y-6">
    <div class="h-72 bg-(--color-surface-container-highest) rounded-2xl"></div>
    <div class="h-8 bg-(--color-surface-container-highest) rounded max-w-xs"></div>
    <div class="h-4 bg-(--color-surface-container-highest) rounded max-w-48"></div>
  </div>

  <!-- ── Error / not found ─────────────────────────────────────────────────── -->
  <div v-else-if="lodgeError || (!lodgeLoading && !lodge)"
    class="max-w-[1280px] mx-auto px-5 md:px-16 py-32 text-center">
    <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">search_off</span>
    <p class="font-serif text-2xl text-(--color-on-surface) mb-2">Lodge not found</p>
    <RouterLink to="/lodges" class="font-sans text-sm text-(--color-primary) hover:underline">← Back to lodges</RouterLink>
  </div>

  <!-- ── Lodge page ────────────────────────────────────────────────────────── -->
  <div v-else-if="lodge" class="pb-24">

    <!-- ── Hero ──────────────────────────────────────────────────────────── -->
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
        <div class="flex flex-wrap items-center gap-4 mt-2">
          <p v-if="lodge.address" class="flex items-center gap-1.5 font-sans text-sm text-white/80">
            <span class="material-symbols-outlined text-base">location_on</span>
            {{ lodge.address }}
          </p>
          <a v-if="lodge.email" :href="`mailto:${lodge.email}`"
            class="flex items-center gap-1.5 font-sans text-sm text-white/70 hover:text-white transition-colors">
            <span class="material-symbols-outlined text-base">mail</span>
            {{ lodge.email }}
          </a>
          <a v-if="lodge.phone" :href="`tel:${lodge.phone}`"
            class="flex items-center gap-1.5 font-sans text-sm text-white/70 hover:text-white transition-colors">
            <span class="material-symbols-outlined text-base">phone</span>
            {{ lodge.phone }}
          </a>
        </div>
      </div>
    </section>

    <!-- ── Step 1: Branch selector ────────────────────────────────────────── -->
    <section v-if="branches.length > 1"
      class="bg-(--color-surface-container-lowest) border-b border-(--color-outline-variant)">
      <div class="max-w-[1280px] mx-auto px-5 md:px-16 py-5">
        <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-3 flex items-center gap-2">
          <span class="material-symbols-outlined text-base text-(--color-primary)">location_on</span>
          Select a location
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            @click="selectedBranch = ''"
            class="flex items-center gap-2 px-4 py-2 rounded-full font-sans text-sm font-semibold border-2 transition-all"
            :class="!selectedBranch
              ? 'border-(--color-primary) bg-(--color-primary) text-white'
              : 'border-(--color-outline-variant) text-(--color-on-surface-variant) hover:border-(--color-primary) hover:text-(--color-primary)'">
            <span class="material-symbols-outlined text-base">language</span>
            All Locations
          </button>
          <button
            v-for="b in branches" :key="b.id"
            @click="selectedBranch = String(b.id)"
            class="flex items-center gap-2 px-4 py-2 rounded-full font-sans text-sm font-semibold border-2 transition-all"
            :class="selectedBranch === String(b.id)
              ? 'border-(--color-primary) bg-(--color-primary) text-white'
              : 'border-(--color-outline-variant) text-(--color-on-surface-variant) hover:border-(--color-primary) hover:text-(--color-primary)'">
            <span class="material-symbols-outlined text-base">villa</span>
            {{ b.name }}
          </button>
        </div>
      </div>
    </section>

    <!-- ── Step 2: Service tab nav (sticky) ───────────────────────────────── -->
    <div class="sticky top-0 z-20 bg-(--color-surface)/95 backdrop-blur-sm border-b border-(--color-outline-variant)">
      <div class="max-w-[1280px] mx-auto px-5 md:px-16">
        <div class="flex items-center gap-1 py-2 overflow-x-auto">
          <!-- Branch context chip -->
          <div v-if="selectedBranchObj"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-(--color-savannah-mist) border border-(--color-primary) mr-3 shrink-0">
            <span class="material-symbols-outlined text-sm text-(--color-primary)">location_on</span>
            <span class="font-sans text-xs font-semibold text-(--color-primary) whitespace-nowrap">{{ selectedBranchObj.name }}</span>
          </div>
          <!-- Tabs -->
          <button v-for="tab in [
            { id: 'accommodation', icon: 'bed',        label: 'Accommodation' },
            { id: 'events',        icon: 'event',      label: 'Events' },
            { id: 'meals',         icon: 'restaurant', label: 'Meals' },
          ]" :key="tab.id"
            @click="activeTab = tab.id"
            class="flex items-center gap-2 px-5 py-2.5 rounded-lg font-sans text-sm font-semibold transition-all shrink-0"
            :class="activeTab === tab.id
              ? 'bg-(--color-primary) text-white shadow-sm'
              : 'text-(--color-on-surface-variant) hover:text-(--color-on-surface) hover:bg-(--color-surface-container)'">
            <span class="material-symbols-outlined text-base">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Step 3: Tab content ────────────────────────────────────────────── -->
    <div class="max-w-[1280px] mx-auto px-5 md:px-16 py-8 min-h-[70vh]">
      <Transition
        enter-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
        mode="out-in">

        <!-- ════════════ ACCOMMODATION ════════════ -->
        <div v-if="activeTab === 'accommodation'" key="accommodation" class="space-y-8">

          <!-- Rooms header + booking CTA -->
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h2 class="font-serif text-2xl font-semibold text-(--color-on-surface)">
                {{ searched ? 'Available Rooms' : 'Rooms &amp; Accommodation' }}
              </h2>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1">
                <template v-if="roomsLoading">Loading rooms…</template>
                <template v-else>
                  {{ rooms.length }} room{{ rooms.length !== 1 ? 's' : '' }}
                  at {{ selectedBranchObj?.name ?? lodge.name }}
                  <template v-if="searched"> · {{ checkIn && checkOut ? `${fmt(checkIn)} – ${fmt(checkOut)}` : '' }}</template>
                </template>
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0 flex-wrap">
              <RouterLink
                :to="{ name: 'accommodation-booking', params: { id: lodgeId }, query: { ...branchQuery() } }"
                class="flex items-center gap-2 px-5 py-2.5 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-full hover:bg-(--color-clay-earth) transition-colors whitespace-nowrap">
                Book Accommodation
                <span class="material-symbols-outlined text-base">arrow_forward</span>
              </RouterLink>
              <!-- <RouterLink
                :to="{ name: 'accommodation-booking', params: { id: lodgeId }, query: { context: 'corporate', ...branchQuery() } }"
                class="flex items-center gap-2 px-5 py-2.5 border-2 border-(--color-primary) text-(--color-primary) font-sans text-sm font-semibold rounded-full hover:bg-(--color-savannah-mist) transition-colors whitespace-nowrap">
                Corporate
              </RouterLink> -->
            </div>
          </div>

          <!-- Date filter -->
          <div class="p-5 bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant)">
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
              <span class="font-sans text-sm font-semibold text-(--color-on-surface)">Filter by availability</span>
              <button v-if="searched" @click="clearDates"
                class="ml-auto font-sans text-xs text-(--color-primary) hover:underline flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">close</span>
                Clear dates
              </button>
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
              <div class="flex-1 flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-in</label>
                <Popover v-model:open="checkInOpen">
                  <PopoverTrigger as-child>
                    <button type="button"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 flex items-center gap-2 text-left focus:outline-none">
                      <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
                      <span class="font-sans text-sm" :class="checkIn ? 'text-(--color-on-surface)' : 'text-(--color-outline)'">
                        {{ fmt(checkIn) || 'Select date' }}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" class="w-auto">
                    <Calendar v-model="checkInValue" :min-value="todayDate" layout="month-and-year" />
                  </PopoverContent>
                </Popover>
              </div>
              <div class="flex-1 flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-out</label>
                <Popover v-model:open="checkOutOpen">
                  <PopoverTrigger as-child>
                    <button type="button"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 flex items-center gap-2 text-left focus:outline-none">
                      <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
                      <span class="font-sans text-sm" :class="checkOut ? 'text-(--color-on-surface)' : 'text-(--color-outline)'">
                        {{ fmt(checkOut) || 'Select date' }}
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
                  class="w-full sm:w-auto px-7 py-2.5 bg-(--color-primary) text-white rounded-full font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  @click="checkAvailability">
                  <span v-if="roomsLoading" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  <span v-else class="material-symbols-outlined text-base">search</span>
                  {{ roomsLoading ? 'Checking…' : nights > 0 ? `Check (${nights} night${nights !== 1 ? 's' : ''})` : 'Check Availability' }}
                </button>
              </div>
            </div>
            <p v-if="searched && !roomsLoading" class="mt-3 font-sans text-sm text-(--color-on-surface-variant)">
              Showing {{ rooms.length }} room{{ rooms.length !== 1 ? 's' : '' }} available for selected dates.
            </p>
          </div>

          <!-- Rooms error -->
          <div v-if="roomsError && !roomsLoading"
            class="py-12 text-center bg-(--color-error-container) rounded-2xl">
            <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-3">wifi_off</span>
            <p class="font-sans text-sm text-(--color-on-error-container)">{{ roomsError }}</p>
          </div>

          <!-- Rooms skeleton -->
          <div v-else-if="roomsLoading && !rooms.length"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="i in 6" :key="i"
              class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden animate-pulse">
              <div class="h-48 bg-(--color-surface-container-highest)"></div>
              <div class="p-5 space-y-3">
                <div class="h-4 bg-(--color-surface-container-highest) rounded max-w-48"></div>
                <div class="h-3 bg-(--color-surface-container-highest) rounded max-w-32"></div>
                <div class="h-3 bg-(--color-surface-container-highest) rounded"></div>
                <div class="h-9 bg-(--color-surface-container-highest) rounded-full mt-4"></div>
              </div>
            </div>
          </div>

          <!-- Room cards -->
          <div v-else-if="rooms.length" class="relative">
            <Transition
              enter-active-class="transition duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100"
              leave-active-class="transition duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="roomsLoading"
                class="absolute inset-0 z-10 bg-(--color-background)/80 flex items-center justify-center rounded-2xl">
                <span class="material-symbols-outlined text-4xl text-(--color-primary) animate-spin">progress_activity</span>
              </div>
            </Transition>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div v-for="room in rooms" :key="room.id"
                class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden shadow-sm flex flex-col group hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                @click="router.push({ name: 'room-detail', params: { id: room.id }, query: { org_id: lodgeId } })">
                <div class="relative h-48 overflow-hidden">
                  <img :src="roomImage(room)" :alt="room.name"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div class="absolute inset-0 bg-linear-to-t from-black/40 to-transparent"></div>
                  <span :class="room.is_available ? 'bg-emerald-500/90' : 'bg-rose-500/90'"
                    class="absolute top-3 right-3 text-white font-sans text-xs font-semibold px-2.5 py-1 rounded-full">
                    {{ room.is_available ? 'In Service' : 'Out of Service' }}
                  </span>
                  <span class="absolute bottom-3 left-3 font-sans text-xs font-semibold bg-(--color-primary) text-white px-2.5 py-1 rounded-full capitalize">
                    {{ room.type }}
                  </span>
                </div>
                <div class="p-5 flex flex-col flex-1">
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <h3 class="font-serif text-lg text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">
                      {{ room.name }}
                    </h3>
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
                  <div class="flex gap-2">
                    <button
                      class="flex-1 py-2.5 rounded-full font-sans text-sm font-semibold border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) transition-colors"
                      @click.stop="router.push({ name: 'room-detail', params: { id: room.id }, query: { org_id: lodgeId } })">
                      View Details
                    </button>
                    <button
                      :disabled="!searched || !room.is_available"
                      class="flex-1 py-2.5 rounded-full font-sans text-sm font-semibold bg-(--color-primary) text-white hover:bg-(--color-clay-earth) transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      @click.stop="bookRoom(room)">
                      {{ room.is_available ? 'Reserve' : 'Unavailable' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty rooms -->
          <div v-else-if="!roomsLoading"
            class="py-16 text-center bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant)">
            <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">
              {{ searched ? 'event_busy' : 'bed' }}
            </span>
            <p class="font-serif text-xl text-(--color-on-surface)">
              {{ searched ? 'No rooms available' : 'No rooms listed' }}
            </p>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mt-2">
              {{ searched
                ? 'All rooms are booked for those dates. Try different dates or book directly.'
                : 'This property has no rooms configured yet.' }}
            </p>
            <div class="flex items-center justify-center gap-3 mt-6">
              <button v-if="searched" @click="clearDates"
                class="font-sans text-sm text-(--color-primary) hover:underline">
                Show all rooms
              </button>
              <RouterLink
                :to="{ name: 'accommodation-booking', params: { id: lodgeId }, query: branchQuery() }"
                class="inline-flex items-center gap-2 px-6 py-3 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-full hover:bg-(--color-clay-earth) transition-colors">
                Book Accommodation
                <span class="material-symbols-outlined text-base">arrow_forward</span>
              </RouterLink>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="roomsTotalPages > 1" class="flex items-center justify-center gap-2 pt-2">
            <button :disabled="roomsPage <= 1 || roomsLoading"
              class="w-9 h-9 flex items-center justify-center rounded-full border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) disabled:opacity-30 transition-colors"
              @click="goToPage(roomsPage - 1)">
              <span class="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <button v-for="p in roomsTotalPages" :key="p"
              class="w-9 h-9 flex items-center justify-center rounded-full border font-sans text-sm font-medium transition-colors"
              :class="p === roomsPage
                ? 'bg-(--color-primary) text-white border-transparent'
                : 'border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container)'"
              @click="goToPage(p)">
              {{ p }}
            </button>
            <button :disabled="roomsPage >= roomsTotalPages || roomsLoading"
              class="w-9 h-9 flex items-center justify-center rounded-full border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) disabled:opacity-30 transition-colors"
              @click="goToPage(roomsPage + 1)">
              <span class="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>

        <!-- ════════════ EVENTS ════════════ -->
        <div v-else-if="activeTab === 'events'" key="events" class="space-y-8">

          <!-- Header + CTA -->
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h2 class="font-serif text-2xl font-semibold text-(--color-on-surface)">Event Spaces &amp; Venues</h2>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1">
                <template v-if="venuesLoading">Loading venues…</template>
                <template v-else>
                  {{ venues.length }} venue{{ venues.length !== 1 ? 's' : '' }}
                  at {{ selectedBranchObj?.name ?? lodge.name }}
                </template>
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0 flex-wrap">
              <RouterLink
                :to="{ name: 'event-booking', params: { id: lodgeId }, query: { ...branchQuery() } }"
                class="flex items-center gap-2 px-5 py-2.5 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-full hover:bg-(--color-clay-earth) transition-colors whitespace-nowrap">
                Book Event Space
                <span class="material-symbols-outlined text-base">arrow_forward</span>
              </RouterLink>
              <!-- <RouterLink
                :to="{ name: 'event-booking', params: { id: lodgeId }, query: { context: 'corporate', ...branchQuery() } }"
                class="flex items-center gap-2 px-5 py-2.5 border-2 border-(--color-primary) text-(--color-primary) font-sans text-sm font-semibold rounded-full hover:bg-(--color-savannah-mist) transition-colors whitespace-nowrap">
                Corporate
              </RouterLink> -->
            </div>
          </div>

          <!-- Venues skeleton -->
          <div v-if="venuesLoading && !venues.length"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="i in 6" :key="i"
              class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden animate-pulse">
              <div class="h-48 bg-(--color-surface-container-highest)"></div>
              <div class="p-5 space-y-3">
                <div class="h-4 bg-(--color-surface-container-highest) rounded max-w-48"></div>
                <div class="h-3 bg-(--color-surface-container-highest) rounded max-w-32"></div>
                <div class="h-3 bg-(--color-surface-container-highest) rounded"></div>
                <div class="h-9 bg-(--color-surface-container-highest) rounded-full mt-4"></div>
              </div>
            </div>
          </div>

          <!-- Venue cards -->
          <div v-else-if="venues.length"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="venue in venues" :key="venue.id"
              class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden shadow-sm flex flex-col group hover:shadow-lg transition-shadow duration-300 cursor-pointer"
              @click="router.push({ name: 'venue-detail', params: { id: venue.id }, query: { org_id: venue.org_id } })">
              <div class="relative h-48 overflow-hidden">
                <img v-if="venue.images?.[0]" :src="venue.images[0]" :alt="venue.name"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                <div v-else class="w-full h-full bg-(--color-surface-container) flex items-center justify-center">
                  <span class="material-symbols-outlined text-5xl text-(--color-outline)">event</span>
                </div>
                <div class="absolute inset-0 bg-linear-to-t from-black/40 to-transparent"></div>
                <span class="absolute top-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-full font-sans text-xs font-semibold">
                  <span class="material-symbols-outlined text-sm">{{ venueLocationIcon(venue.location_type) }}</span>
                  {{ venueLocationLabel(venue.location_type) }}
                </span>
                <span class="absolute top-3 right-3 flex items-center gap-1 bg-white/90 text-(--color-on-surface) px-2.5 py-1 rounded-full font-sans text-xs font-semibold">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">group</span>
                  up to {{ venue.capacity }}
                </span>
                <span class="absolute bottom-3 left-3 flex items-center gap-1 bg-(--color-primary) text-white px-2.5 py-1 rounded-full font-sans text-xs font-semibold">
                  <span class="material-symbols-outlined text-sm">{{ venueTypeIcon(venue.type) }}</span>
                  {{ venue.type_label }}
                </span>
              </div>
              <div class="p-5 flex flex-col flex-1">
                <h3 class="font-serif text-lg text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors mb-2">
                  {{ venue.name }}
                </h3>
                <p class="flex items-center gap-1.5 font-sans text-xs text-(--color-on-surface-variant) mb-3">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">groups</span>
                  Up to {{ venue.capacity }} guests
                </p>
                <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed line-clamp-2 mb-4 flex-1">
                  {{ venue.description }}
                </p>
                <div class="flex flex-wrap gap-1 mb-4">
                  <span v-for="a in (venue.amenities ?? []).slice(0, 3)" :key="a"
                    class="flex items-center gap-1 bg-(--color-savannah-mist) text-(--color-on-surface-variant) px-2 py-0.5 rounded font-sans text-xs">
                    <span class="material-symbols-outlined text-sm text-(--color-primary)">{{ venueAmenityIcon(a) }}</span>
                    {{ a }}
                  </span>
                </div>
                <button
                  type="button"
                  class="w-full py-2.5 rounded-full font-sans text-sm font-semibold bg-(--color-primary) text-white hover:bg-(--color-clay-earth) transition-colors"
                  @click.stop="router.push({ name: 'venue-detail', params: { id: venue.id }, query: { org_id: venue.org_id } })">
                  View Details
                </button>
              </div>
            </div>
          </div>

          <!-- Empty venues -->
          <div v-else-if="!venuesLoading"
            class="py-16 text-center bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant)">
            <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">event_seat</span>
            <p class="font-serif text-xl text-(--color-on-surface)">No venues listed</p>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mt-2">This property has no venues configured yet.</p>
            <div class="flex items-center justify-center mt-6">
              <RouterLink
                :to="{ name: 'event-booking', params: { id: lodgeId }, query: { ...branchQuery() } }"
                class="inline-flex items-center gap-2 px-6 py-3 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-full hover:bg-(--color-clay-earth) transition-colors">
                Book Event Space
                <span class="material-symbols-outlined text-base">arrow_forward</span>
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- ════════════ MEALS ════════════ -->
        <div v-else-if="activeTab === 'meals'" key="meals" class="space-y-8">

          <!-- Header + CTA -->
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h2 class="font-serif text-2xl font-semibold text-(--color-on-surface)">Catering &amp; Meals</h2>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1">
                <template v-if="menuLoading">Loading menu…</template>
                <template v-else>
                  {{ menuItems.length }} item{{ menuItems.length !== 1 ? 's' : '' }}
                  on the menu at {{ selectedBranchObj?.name ?? lodge.name }}
                </template>
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0 flex-wrap">
              <RouterLink
                :to="{ name: 'meal-booking', params: { id: lodgeId }, query: { ...branchQuery() } }"
                class="flex items-center gap-2 px-5 py-2.5 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-full hover:bg-(--color-clay-earth) transition-colors whitespace-nowrap">
                Book Catering
                <span class="material-symbols-outlined text-base">arrow_forward</span>
              </RouterLink>
            </div>
          </div>

          <!-- Menu error -->
          <div v-if="menuError && !menuLoading"
            class="py-12 text-center bg-(--color-error-container) rounded-2xl">
            <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-3">wifi_off</span>
            <p class="font-sans text-sm text-(--color-on-error-container)">{{ menuError }}</p>
            <button @click="loadMenu"
              class="mt-4 font-sans text-sm text-(--color-primary) hover:underline">Try again</button>
          </div>

          <!-- Menu skeleton -->
          <div v-else-if="menuLoading && !menuItems.length"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="i in 6" :key="i"
              class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden animate-pulse">
              <div class="h-60 bg-(--color-surface-container-highest)"></div>
              <div class="p-5 space-y-3">
                <div class="h-4 bg-(--color-surface-container-highest) rounded max-w-48"></div>
                <div class="h-3 bg-(--color-surface-container-highest) rounded max-w-32"></div>
                <div class="h-3 bg-(--color-surface-container-highest) rounded"></div>
                <div class="h-9 bg-(--color-surface-container-highest) rounded-full mt-4"></div>
              </div>
            </div>
          </div>

          <!-- Menu items — grouped by category -->
          <div v-else-if="menuItems.length" class="space-y-10">
            <div v-for="[category, items] in menuByCategory" :key="category">
              <!-- Category header -->
              <div class="flex items-center gap-3 mb-5">
                <div class="w-9 h-9 rounded-full bg-(--color-savannah-mist) flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-lg text-(--color-primary)"
                    style="font-variation-settings: 'FILL' 1">{{ menuCategoryIcon(category) }}</span>
                </div>
                <h3 class="font-serif text-xl text-(--color-on-surface)">{{ menuCategoryLabel(category) }}</h3>
                <span class="font-sans text-xs text-(--color-on-surface-variant) bg-(--color-surface-container) px-2.5 py-0.5 rounded-full">
                  {{ items.length }} item{{ items.length !== 1 ? 's' : '' }}
                </span>
                <div class="flex-1 h-px bg-(--color-outline-variant)"></div>
              </div>

              <!-- Items grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="item in items" :key="item.id"
                  class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden flex flex-col group hover:shadow-md transition-shadow duration-200">
                  <!-- Icon band -->
                  <div class="relative h-65 bg-(--color-surface-container) flex items-center justify-center overflow-hidden">
                    <img v-if="item.image_url" :src="item.image_url" :alt="item.name"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <span v-else
                      class="material-symbols-outlined text-6xl text-(--color-outline) group-hover:text-(--color-primary) transition-colors duration-300"
                      style="font-variation-settings: 'FILL' 1">{{ menuCategoryIcon(item.category) }}</span>
                    <div class="absolute inset-0 bg-linear-to-t from-black/10 to-transparent"></div>
                    <span :class="item.is_available ? 'bg-emerald-500/90' : 'bg-rose-500/90'"
                      class="absolute top-3 right-3 text-white font-sans text-xs font-semibold px-2.5 py-1 rounded-full">
                      {{ item.is_available ? 'Available' : 'Unavailable' }}
                    </span>
                  </div>
                  <!-- Info -->
                  <div class="p-5 flex flex-col flex-1">
                    <div class="flex items-start justify-between gap-2 mb-1">
                      <p class="font-sans text-sm font-semibold text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors leading-snug flex-1">
                        {{ item.name }}
                      </p>
                      <p v-if="item.price" class="font-serif text-base text-(--color-primary) shrink-0">
                        K{{ Number(item.price).toLocaleString() }}
                      </p>
                    </div>
                    <p v-if="item.description"
                      class="font-sans text-xs text-(--color-on-surface-variant) leading-relaxed line-clamp-2 mt-1 mb-4 flex-1">
                      {{ item.description }}
                    </p>
                    <!-- <RouterLink v-if="item.is_available"
                      :to="{ name: 'meal-booking', params: { id: lodgeId }, query: branchQuery() }"
                      class="mt-auto w-full py-2 rounded-full font-sans text-xs font-semibold bg-(--color-primary) text-white hover:bg-(--color-clay-earth) transition-colors text-center block">
                      Book Now
                    </RouterLink> -->
                    <!-- <button v-else disabled
                      class="mt-auto w-full py-2 rounded-full font-sans text-xs font-semibold bg-(--color-surface-container) text-(--color-on-surface-variant) cursor-not-allowed text-center">
                      Not Available
                    </button> -->
                  </div>
                </div>
              </div>
            </div>

            <!-- Book CTA footer -->
            <div class="pt-2 flex justify-center">
              <RouterLink
                :to="{ name: 'meal-booking', params: { id: lodgeId }, query: branchQuery() }"
                class="inline-flex items-center gap-2 px-8 py-3 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-full hover:bg-(--color-clay-earth) transition-colors">
                Book Catering
                <span class="material-symbols-outlined text-base">arrow_forward</span>
              </RouterLink>
            </div>
          </div>

          <!-- Empty menu -->
          <div v-else-if="!menuLoading"
            class="py-16 text-center bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant)">
            <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">restaurant_menu</span>
            <p class="font-serif text-xl text-(--color-on-surface)">No menu items listed</p>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mt-2">The menu for this property hasn't been configured yet.</p>
            <RouterLink
              :to="{ name: 'meal-booking', params: { id: lodgeId }, query: branchQuery() }"
              class="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-full hover:bg-(--color-clay-earth) transition-colors">
              Book Catering Anyway
              <span class="material-symbols-outlined text-base">arrow_forward</span>
            </RouterLink>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useLodges, amenityIcon } from '@/composables/useRooms'
import api, { publicApi } from '@/lib/api'
import { useScrollReveal } from '@/composables/useScrollReveal'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/index'

useScrollReveal()
const router = useRouter()

// ── Mode ──────────────────────────────────────────────────────────────
const mode = ref<'lodges' | 'rooms'>('lodges')

// ── Lodges ────────────────────────────────────────────────────────────
const { lodges, total: lodgeTotal, loading: lodgeLoading, error: lodgeError, fetchLodges } = useLodges()
const lodgePage       = ref(1)
const LODGE_PAGE_SZ   = 9
const lodgeTotalPages = computed(() => Math.max(1, Math.ceil(lodgeTotal.value / LODGE_PAGE_SZ)))
const lodgeSearch     = ref('')

async function loadLodges(p = 1) {
  lodgePage.value = p
  const params: Record<string, unknown> = { page: p, page_size: LODGE_PAGE_SZ }
  if (lodgeSearch.value.trim()) params.search = lodgeSearch.value.trim()
  await fetchLodges(params)
}

let lodgeTimer: ReturnType<typeof setTimeout> | null = null
watch(lodgeSearch, () => {
  clearTimeout(lodgeTimer!)
  lodgeTimer = setTimeout(() => loadLodges(1), 400)
})

// ── Rooms ─────────────────────────────────────────────────────────────
const rooms        = ref<any[]>([])
const roomTotal    = ref(0)
const roomPage     = ref(1)
const ROOM_PAGE_SZ = 9
const roomLoading  = ref(false)
const roomError    = ref('')
const roomTotalPages = computed(() => Math.max(1, Math.ceil(roomTotal.value / ROOM_PAGE_SZ)))

const lodgeNameMap = ref<Record<string, string>>({})

async function fetchLodgeNames() {
  try {
    const { data } = await publicApi.get('/guest/lodges', { params: { page_size: 100 } })
    const list: any[] = data.data ?? data
    list.forEach((l: any) => { if (l.id && l.name) lodgeNameMap.value[l.id] = l.name })
  } catch { /* non-critical — cards just show no lodge name */ }
}

const roomSearch     = ref('')
const filterType     = ref('All')
const filterCapacity = ref(1)
const filterMaxPrice = ref(5000)
const showAvailOnly  = ref(false)

function capitalise(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }

function normaliseRoom(r: Record<string, any>) {
  return {
    id:          r.id          as string,
    name:        r.name        as string,
    type:        capitalise(r.type as string),
    capacity:    r.capacity    as number,
    price:       r.price_per_night as number,
    available:   r.is_available   as boolean,
    image:       (r.images?.[0]   as string) || null,
    amenities:   (r.amenities || []) as string[],
    description: (r.description || '') as string,
    orgName:     (lodgeNameMap.value[r.org_id] || '') as string,
    orgId:       (r.org_id || '') as string,
  }
}

const priceSliderMax = computed(() => {
  if (!rooms.value.length) return 5000
  return Math.ceil(Math.max(...rooms.value.map(r => r.price)) / 100) * 100
})
const ROOM_TYPES = computed(() => ['All', ...new Set(rooms.value.map(r => r.type))])

async function fetchRooms(p = roomPage.value) {
  roomLoading.value = true
  roomError.value   = ''
  roomPage.value    = p
  try {
    const params: Record<string, string | number> = { page: p, page_size: ROOM_PAGE_SZ }
    if (roomSearch.value.trim()) params.org_name = roomSearch.value.trim()
    if (filterType.value !== 'All') params.type  = filterType.value.toLowerCase()
    const { data } = await publicApi.get('/guest/rooms', { params })
    const list      = data.data ?? data
    rooms.value     = list.map(normaliseRoom)
    roomTotal.value = data.total ?? rooms.value.length
    if (rooms.value.length && filterMaxPrice.value === 5000) {
      filterMaxPrice.value = Math.ceil(Math.max(...rooms.value.map(r => r.price)) / 100) * 100
    }
  } catch (err: any) {
    roomError.value = err?.response?.data?.error?.message || 'Unable to load rooms. Please try again.'
  } finally {
    roomLoading.value = false
  }
}

const filteredRooms = computed(() =>
  rooms.value.filter(r => {
    if (filterType.value !== 'All' && r.type !== filterType.value) return false
    if (r.capacity < filterCapacity.value)                          return false
    if (r.price    > filterMaxPrice.value)                          return false
    if (showAvailOnly.value && !r.available)                        return false
    return true
  })
)

let roomTimer: ReturnType<typeof setTimeout> | null = null
watch(roomSearch, () => {
  clearTimeout(roomTimer!)
  roomTimer = setTimeout(() => fetchRooms(1), 400)
})
watch(filterType, () => fetchRooms(1))

function resetRoomFilters() {
  roomSearch.value     = ''
  filterType.value     = 'All'
  filterCapacity.value = 1
  filterMaxPrice.value = priceSliderMax.value
  showAvailOnly.value  = false
  searched.value       = false
  availableIds.value   = new Set()
  fetchRooms(1)
}

// ── Date pickers ──────────────────────────────────────────────────────
const todayDate    = today(getLocalTimeZone())
const checkInOpen  = ref(false)
const checkOutOpen = ref(false)
const checkIn      = ref('')
const checkOut     = ref('')

function toIso(cd: { year: number; month: number; day: number } | null | undefined): string {
  if (!cd) return ''
  return `${cd.year}-${String(cd.month).padStart(2, '0')}-${String(cd.day).padStart(2, '0')}`
}

function formatDisplay(iso: string): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const checkInValue = computed({
  get: () => checkIn.value  ? parseDate(checkIn.value)  : undefined,
  set: (v) => { checkIn.value  = toIso(v); checkInOpen.value  = false },
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
  return Math.max(0, Math.floor(
    (new Date(checkOut.value).getTime() - new Date(checkIn.value).getTime()) / 86400000,
  ))
})

// ── Availability ──────────────────────────────────────────────────────
const searched     = ref(false)
const availableIds = ref<Set<string>>(new Set())
const checkLoading = ref(false)
const checkError   = ref<string | null>(null)

async function checkAvailability() {
  if (nights.value === 0) return
  checkLoading.value = true
  checkError.value   = null
  searched.value     = false
  availableIds.value = new Set()
  try {
    const params: Record<string, string | number> = {
      check_in:  checkIn.value,
      check_out: checkOut.value,
      page_size: 100,
    }
    if (roomSearch.value.trim())    params.org_name = roomSearch.value.trim()
    if (filterType.value !== 'All') params.type     = filterType.value.toLowerCase()
    const { data } = await api.get('/guest/rooms', { params })
    const list = Array.isArray(data) ? data : (data.data ?? [])
    availableIds.value = new Set(list.map((r: any) => r.id as string))
    searched.value = true
  } catch (err: any) {
    checkError.value =
      err?.response?.data?.error?.message ||
      err?.response?.data?.message ||
      `Error ${err?.response?.status ?? ''}: Failed to check availability.`
  } finally {
    checkLoading.value = false
  }
}

function isAvailable(roomId: string) { return availableIds.value.has(roomId) }

function reserveLabel(roomId: string): string {
  if (nights.value === 0)   return 'Select dates to reserve'
  if (!searched.value)      return 'Check availability first'
  if (!isAvailable(roomId)) return 'Unavailable'
  return 'Reserve'
}

function reserve(room: ReturnType<typeof normaliseRoom>) {
  router.push({
    name: 'reservation',
    params: { roomId: room.id },
    query: {
      check_in:      checkIn.value,
      check_out:     checkOut.value,
      lodge_id:      room.orgId,
      lodge_name:    room.orgName,
      room_name:     room.name,
      room_type:     room.type,
      room_capacity: String(room.capacity),
      room_price:    String(room.price),
    },
  })
}

onMounted(async () => { loadLodges(1); await fetchLodgeNames(); fetchRooms(1) })
</script>

<template>
  <div class="max-w-[1280px] mx-auto px-5 md:px-16 pt-10 pb-12">

    <!-- Header + mode toggle -->
    <div class="mb-10">
      <span class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-primary) block mb-2">Discover</span>
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 class="font-serif text-[32px] font-semibold leading-10 text-(--color-on-surface)">Explore</h1>
          <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1 max-w-md leading-relaxed">
            Browse our collection of lodges or explore individual rooms across all properties.
          </p>
        </div>
        <div class="flex items-center bg-(--color-surface-container-low) rounded-full p-1 self-start md:self-auto shrink-0">
          <button
            :class="mode === 'lodges' ? 'bg-(--color-primary) text-white shadow-sm' : 'text-(--color-on-surface-variant) hover:text-(--color-on-surface)'"
            class="flex items-center gap-1.5 px-5 py-2 rounded-full font-sans text-sm font-semibold transition-all"
            @click="mode = 'lodges'"
          >
            <span class="material-symbols-outlined text-base">holiday_village</span>
            Lodges
          </button>
          <button
            :class="mode === 'rooms' ? 'bg-(--color-primary) text-white shadow-sm' : 'text-(--color-on-surface-variant) hover:text-(--color-on-surface)'"
            class="flex items-center gap-1.5 px-5 py-2 rounded-full font-sans text-sm font-semibold transition-all"
            @click="mode = 'rooms'"
          >
            <span class="material-symbols-outlined text-base">bed</span>
            Rooms
          </button>
        </div>
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
      mode="out-in"
    >

      <!-- ── LODGES ─────────────────────────────────────────────────── -->
      <div v-if="mode === 'lodges'" key="lodges" class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row md:items-center gap-4">
          <div class="relative w-full md:w-80">
            <span class="material-symbols-outlined absolute left-3 top-[50%] -translate-y-1/2 text-(--color-outline) text-base">search</span>
            <input
              v-model="lodgeSearch"
              type="text"
              placeholder="Search by name or location…"
              class="w-full bg-(--color-savannah-mist) border-none rounded-full pl-9 pr-4 py-2.5 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-outline) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20"
            />
          </div>
          <p v-if="!lodgeLoading" class="font-sans text-sm text-(--color-on-surface-variant)">
            {{ lodges.length }} {{ lodges.length === 1 ? 'lodge' : 'lodges' }} found
          </p>
        </div>

        <div v-if="lodgeError" class="py-16 text-center bg-(--color-error-container) rounded-2xl">
          <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-3">wifi_off</span>
          <p class="font-sans text-sm text-(--color-on-error-container) mb-4">{{ lodgeError }}</p>
          <button class="font-sans text-sm font-semibold text-(--color-error) hover:underline" @click="loadLodges(lodgePage)">Retry</button>
        </div>

        <div v-else-if="lodgeLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 9" :key="i" class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden animate-pulse">
            <div class="h-52 bg-(--color-surface-container-highest)" />
            <div class="p-5 space-y-3">
              <div class="h-4 bg-(--color-surface-container-highest) rounded w-3/4" />
              <div class="h-3 bg-(--color-surface-container-highest) rounded w-1/2" />
            </div>
          </div>
        </div>

        <div v-else-if="lodges.length === 0" class="py-24 text-center bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant)">
          <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">search_off</span>
          <p class="font-serif text-xl text-(--color-on-surface) mb-2">No lodges found</p>
          <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Try a different search term.</p>
          <button class="font-sans text-sm font-semibold text-(--color-primary) hover:underline" @click="lodgeSearch = ''">Clear search</button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <RouterLink
            v-for="lodge in lodges"
            :key="lodge.id"
            :to="`/lodges/${lodge.id}`"
            class="group flex flex-col bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <div class="relative h-52 overflow-hidden">
              <img v-if="lodge.logo_url" :src="lodge.logo_url" :alt="lodge.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div v-else class="w-full h-full bg-(--color-surface-container-high) flex flex-col items-center justify-center gap-3 group-hover:bg-(--color-surface-container-highest) transition-colors">
                <span class="material-symbols-outlined text-5xl text-(--color-outline)">holiday_village</span>
                <span class="font-serif text-sm text-(--color-on-surface-variant)">{{ lodge.name }}</span>
              </div>
              <template v-if="lodge.logo_url">
                <div class="absolute inset-0 bg-linear-to-t from-black/55 to-transparent" />
                <div class="absolute bottom-3 left-4 right-4">
                  <h3 class="font-serif text-xl font-semibold text-white leading-tight group-hover:text-(--color-inverse-primary) transition-colors">{{ lodge.name }}</h3>
                </div>
              </template>
            </div>
            <div class="p-5 flex flex-col flex-1">
              <p v-if="lodge.address" class="flex items-center gap-1.5 font-sans text-sm text-(--color-on-surface-variant) mb-3">
                <span class="material-symbols-outlined text-base text-(--color-primary)">location_on</span>
                {{ lodge.address }}
              </p>
              <p v-if="lodge.email" class="flex items-center gap-1.5 font-sans text-sm text-(--color-on-surface-variant) mb-4">
                <span class="material-symbols-outlined text-base text-(--color-primary)">mail</span>
                {{ lodge.email }}
              </p>
              <div class="flex items-center justify-end pt-4 border-t border-(--color-outline-variant) mt-auto">
                <span class="inline-flex items-center gap-1 bg-(--color-primary) text-white px-5 py-2 rounded-full font-sans text-sm font-semibold group-hover:bg-(--color-primary-container) transition-colors">
                  View Rooms <span class="material-symbols-outlined text-base">arrow_forward</span>
                </span>
              </div>
            </div>
          </RouterLink>
        </div>

        <div class="flex items-center justify-center gap-2 mt-4">
          <button :disabled="lodgePage <= 1 || lodgeLoading" class="w-9 h-9 flex items-center justify-center rounded-full border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) disabled:opacity-30 disabled:cursor-not-allowed transition-colors" @click="loadLodges(lodgePage - 1)">
            <span class="material-symbols-outlined text-base">chevron_left</span>
          </button>
          <button v-for="p in lodgeTotalPages" :key="p" :class="p === lodgePage ? 'bg-(--color-primary) text-white border-transparent' : 'border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container)'" class="w-9 h-9 flex items-center justify-center rounded-full border font-sans text-sm font-medium transition-colors" @click="loadLodges(p)">{{ p }}</button>
          <button :disabled="lodgePage >= lodgeTotalPages || lodgeLoading" class="w-9 h-9 flex items-center justify-center rounded-full border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) disabled:opacity-30 disabled:cursor-not-allowed transition-colors" @click="loadLodges(lodgePage + 1)">
            <span class="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
      </div>

      <!-- ── ROOMS ──────────────────────────────────────────────────── -->
      <div v-else key="rooms" class="flex flex-col md:flex-row gap-8">

        <!-- Sidebar filters -->
        <aside class="w-full md:w-64 shrink-0">
          <div class="sticky top-28 flex flex-col gap-6">
            <h2 class="font-serif text-2xl text-(--color-on-surface)">Filters</h2>

            <div class="flex flex-col gap-2">
              <span class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">Search by lodge</span>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-[50%] -translate-y-[50%] text-(--color-on-surface-variant) text-[18px]">search</span>
                <input v-model="roomSearch" type="text" placeholder="Lodge name…" class="w-full bg-(--color-savannah-mist) border-none rounded-lg pl-10 pr-3 py-2.5 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all" />
              </div>
            </div>

            <div class="h-px bg-(--color-outline-variant)" />

            <div class="flex flex-col gap-3">
              <span class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">Max Price</span>
              <input v-model.number="filterMaxPrice" type="range" min="100" :max="priceSliderMax" step="10" class="w-full h-1 bg-(--color-surface-container-highest) rounded-lg appearance-none cursor-pointer accent-(--color-primary)" />
              <div class="flex justify-between font-sans text-xs text-(--color-on-surface-variant)">
                <span>K100</span><span>K{{ filterMaxPrice.toLocaleString() }}/night</span>
              </div>
            </div>

            <div class="h-px bg-(--color-outline-variant)" />

            <div class="flex flex-col gap-3">
              <span class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">Room Type</span>
              <div class="flex flex-col gap-2">
                <label v-for="t in ROOM_TYPES" :key="t" class="flex items-center gap-3 cursor-pointer group">
                  <input v-model="filterType" :value="t" type="radio" class="w-4 h-4 border-(--color-outline) text-(--color-primary) focus:ring-(--color-primary)" />
                  <span class="font-sans text-sm text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">{{ t }}</span>
                </label>
              </div>
            </div>

            <div class="h-px bg-(--color-outline-variant)" />

            <div class="flex flex-col gap-3">
              <span class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
                Min Guests — <span class="text-(--color-on-surface)">{{ filterCapacity }}</span>
              </span>
              <input v-model.number="filterCapacity" type="range" min="1" max="6" step="1" class="w-full h-1 bg-(--color-surface-container-highest) rounded-lg appearance-none cursor-pointer accent-(--color-primary)" />
              <div class="flex justify-between font-sans text-xs text-(--color-on-surface-variant)"><span>1</span><span>6</span></div>
            </div>

            <div class="h-px bg-(--color-outline-variant)" />

            <label class="flex items-center gap-3 cursor-pointer group">
              <input v-model="showAvailOnly" type="checkbox" class="w-5 h-5 rounded border-(--color-outline) text-(--color-primary) focus:ring-(--color-primary)" />
              <span class="font-sans text-sm text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">Available only</span>
            </label>

            <button class="w-full bg-(--color-surface-container-high) text-(--color-on-surface-variant) py-3 rounded-lg font-sans text-sm font-semibold hover:bg-(--color-surface-container-highest) transition-colors" @click="resetRoomFilters">
              Clear All Filters
            </button>
          </div>
        </aside>

        <!-- Room results -->
        <section class="flex-1 flex flex-col">

          <!-- Header -->
          <div class="mb-6">
            <p class="font-sans text-sm text-(--color-on-surface-variant)">
              <template v-if="roomLoading">Loading rooms…</template>
              <template v-else-if="checkLoading">Checking availability…</template>
              <template v-else-if="searched">{{ filteredRooms.length }} room{{ filteredRooms.length !== 1 ? 's' : '' }} — availability shown below</template>
              <template v-else>{{ filteredRooms.length }} {{ filteredRooms.length === 1 ? 'room' : 'rooms' }} found</template>
            </p>
          </div>

          <!-- ── Date picker ─────────────────────────────────────────── -->
          <div class="flex flex-col sm:flex-row gap-4 p-5 bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) mb-8">
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

            <!-- Check button -->
            <div class="flex items-end">
              <div class="flex flex-col items-start gap-1">
                <button
                  :disabled="nights === 0 || checkLoading"
                  class="w-full sm:w-auto px-7 py-2.5 bg-(--color-primary) text-white rounded-full font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors flex items-center gap-2 disabled:opacity-50"
                  @click="checkAvailability"
                >
                  <span v-if="checkLoading" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  <span v-else class="material-symbols-outlined text-base">search</span>
                  {{ checkLoading ? 'Checking...' : `Check${nights > 0 ? ` (${nights} night${nights !== 1 ? 's' : ''})` : ''}` }}
                </button>
                <p v-if="checkError" class="font-sans text-xs text-(--color-error)">{{ checkError }}</p>
              </div>
            </div>
          </div>

          <!-- Skeleton -->
          <div v-if="roomLoading" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="n in 4" :key="n" class="rounded-2xl bg-(--color-surface-container-lowest) border border-(--color-outline-variant) overflow-hidden animate-pulse">
              <div class="h-44 bg-(--color-surface-container-highest)" />
              <div class="p-5 space-y-3">
                <div class="h-4 bg-(--color-surface-container-highest) rounded w-3/4" />
                <div class="h-3 bg-(--color-surface-container-highest) rounded w-1/2" />
              </div>
            </div>
          </div>

          <!-- Error -->
          <div v-else-if="roomError" class="flex-1 flex flex-col items-center justify-center py-24 text-center">
            <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-4">error</span>
            <p class="font-serif text-xl text-(--color-on-surface) mb-2">Something went wrong</p>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mb-4">{{ roomError }}</p>
            <button class="font-sans text-sm font-semibold text-(--color-primary) hover:underline" @click="fetchRooms(1)">Retry</button>
          </div>

          <template v-else>
            <!-- Room cards -->
            <div v-if="filteredRooms.length" class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                v-for="room in filteredRooms"
                :key="room.id"
                class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden shadow-sm flex flex-col"
              >
                <!-- Image -->
                <div class="relative h-44 overflow-hidden">
                  <img v-if="room.image" :src="room.image" :alt="room.name" class="w-full h-full object-cover" loading="lazy" />
                  <div v-else class="w-full h-full bg-(--color-surface-container-high) flex flex-col items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-5xl text-(--color-outline)">bed</span>
                    <span class="font-serif text-sm text-(--color-on-surface-variant)">{{ room.name }}</span>
                  </div>
                  <div class="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />

                  <!-- Availability badge -->
                  <span v-if="searched && isAvailable(room.id)" class="absolute top-3 right-3 text-white font-sans text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/90">Available</span>
                  <span v-else-if="searched" class="absolute top-3 right-3 text-white font-sans text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/90">Unavailable</span>

                  <!-- Room type badge -->
                  <span class="absolute bottom-3 left-3 font-sans text-xs font-semibold bg-(--color-primary) text-white px-2.5 py-1 rounded-full capitalize">
                    {{ room.type }}
                  </span>
                </div>

                <!-- Info -->
                <div class="p-5 flex flex-col flex-1">
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <h3 class="font-serif text-lg text-(--color-on-surface)">{{ room.name }}</h3>
                    <div class="text-right shrink-0">
                      <p class="font-serif text-lg text-(--color-primary)">K{{ room.price.toLocaleString() }}</p>
                      <span class="font-sans text-xs text-(--color-on-surface-variant)">/ night</span>
                    </div>
                  </div>

                  <p v-if="room.orgName" class="flex items-center gap-1.5 font-sans text-xs text-(--color-on-surface-variant) mb-1">
                    <span class="material-symbols-outlined text-sm text-(--color-primary)">holiday_village</span>
                    {{ room.orgName }}
                  </p>

                  <p class="flex items-center gap-1.5 font-sans text-xs text-(--color-on-surface-variant) mb-3">
                    <span class="material-symbols-outlined text-sm text-(--color-primary)">people</span>
                    Sleeps {{ room.capacity }}
                  </p>

                  <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed line-clamp-2 mb-4 flex-1">
                    {{ room.description || 'A comfortable and well-appointed room.' }}
                  </p>

                  <div class="flex flex-wrap gap-1 mb-4">
                    <span v-for="a in room.amenities.slice(0, 3)" :key="a" class="flex items-center gap-1 bg-(--color-savannah-mist) text-(--color-on-surface-variant) px-2 py-0.5 rounded font-sans text-xs">
                      <span class="material-symbols-outlined text-sm text-(--color-primary)">{{ amenityIcon(a) }}</span>
                      {{ a }}
                    </span>
                  </div>

                  <button
                    :disabled="!(searched && isAvailable(room.id))"
                    class="w-full py-2.5 rounded-full font-sans text-sm font-semibold transition-all bg-(--color-primary) text-white hover:bg-(--color-clay-earth) disabled:opacity-40 disabled:cursor-not-allowed"
                    @click="reserve(room)"
                  >
                    {{ reserveLabel(room.id) }}
                  </button>
                  <RouterLink
                    :to="`/rooms/${room.id}`"
                    class="w-full mt-2 py-2.5 rounded-full font-sans text-sm font-semibold text-center border-2 border-(--color-primary) text-(--color-primary) hover:bg-(--color-primary) hover:text-white transition-all"
                  >
                    View Details
                  </RouterLink>
                </div>
              </div>
            </div>

            <!-- Empty -->
            <div v-else class="flex-1 flex flex-col items-center justify-center py-24 text-center">
              <span class="material-symbols-outlined text-4xl text-(--color-on-surface-variant) block mb-4">search_off</span>
              <p class="font-serif text-xl text-(--color-on-surface) mb-2">No rooms match your filters</p>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Try adjusting the type, capacity, or price.</p>
              <button class="font-sans text-sm text-(--color-primary) hover:underline" @click="resetRoomFilters">Clear all filters</button>
            </div>
          </template>

          <!-- Pagination -->
          <div class="flex items-center justify-center gap-2 mt-8">
            <button :disabled="roomPage <= 1 || roomLoading" class="w-9 h-9 flex items-center justify-center rounded-full border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) disabled:opacity-30 disabled:cursor-not-allowed transition-colors" @click="fetchRooms(roomPage - 1)">
              <span class="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <button v-for="p in roomTotalPages" :key="p" :class="p === roomPage ? 'bg-(--color-primary) text-white border-transparent' : 'border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container)'" class="w-9 h-9 flex items-center justify-center rounded-full border font-sans text-sm font-medium transition-colors" @click="fetchRooms(p)">{{ p }}</button>
            <button :disabled="roomPage >= roomTotalPages || roomLoading" class="w-9 h-9 flex items-center justify-center rounded-full border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) disabled:opacity-30 disabled:cursor-not-allowed transition-colors" @click="fetchRooms(roomPage + 1)">
              <span class="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>

        </section>
      </div>

    </Transition>
  </div>
</template>

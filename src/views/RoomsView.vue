<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useScrollReveal } from '@/composables/useScrollReveal'
import RoomCard from '@/components/rooms/RoomCard.vue'
import api from '@/lib/api'

useScrollReveal()
const route = useRoute()

// ── API data ─────────────────────────────────────────────────────────────────
const rooms      = ref([])
const apiLoading = ref(false)
const apiError   = ref('')

// Capitalise first letter for display (e.g. "suite" → "Suite")
function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
}

// Map API room to the shape RoomCard expects
function normalise(r) {
  return {
    id:          r.id,
    name:        r.name,
    type:        capitalise(r.type),
    capacity:    r.capacity,
    price:       r.price_per_night,
    available:   r.is_available,
    image:       r.images?.[0] || null,
    amenities:   (r.amenities || []).map(a => ({ icon: amenityIcon(a), label: a })),
    description: r.description || '',
    orgName:     r.organization?.name || '',
  }
}

// Best-effort icon mapping from amenity label string
function amenityIcon(label) {
  const l = label.toLowerCase()
  if (l.includes('wifi') || l.includes('wi-fi'))   return 'wifi'
  if (l.includes('pool'))                           return 'pool'
  if (l.includes('jacuzzi') || l.includes('hot tub')) return 'hot_tub'
  if (l.includes('bar') || l.includes('mini bar')) return 'local_bar'
  if (l.includes('tv'))                             return 'tv'
  if (l.includes('kitchen'))                        return 'kitchen'
  if (l.includes('fireplace'))                      return 'fireplace'
  if (l.includes('lounge'))                         return 'weekend'
  if (l.includes('spa'))                            return 'spa'
  if (l.includes('air') || l.includes('ac'))        return 'ac_unit'
  if (l.includes('coffee') || l.includes('nespresso')) return 'local_cafe'
  if (l.includes('dining') || l.includes('restaurant')) return 'restaurant'
  if (l.includes('deck') || l.includes('terrace'))  return 'deck'
  if (l.includes('garden') || l.includes('yard'))   return 'yard'
  return 'check_circle'
}

onMounted(async () => {
  apiLoading.value = true
  apiError.value   = ''
  try {
    const { data } = await api.get('/guest/rooms', { params: { page_size: 100 } })
    rooms.value = (data.data ?? data).map(normalise)
    // Seed the max-price slider to the highest room price so nothing is filtered on load
    if (rooms.value.length) {
      const maxPrice = Math.max(...rooms.value.map(r => r.price))
      filterMaxPrice.value = Math.ceil(maxPrice / 100) * 100  // round up to nearest 100
    }
  } catch (err) {
    apiError.value = err.response?.data?.error?.message || 'Unable to load rooms. Please try again.'
  } finally {
    apiLoading.value = false
  }
})

// ── Room types and orgs for filters (derived from API data) ──────────────────
const TYPES = computed(() => ['All', ...new Set(rooms.value.map(r => r.type))])
const ORGS  = computed(() => [...new Set(rooms.value.map(r => r.orgName).filter(Boolean))])

// ── Filter state (seeded from search query params) ───────────────────────────
const searchQuery       = ref('')
const filterType        = ref('All')
const filterOrg         = ref('All')
const filterCapacity    = ref(1)
const filterMaxPrice    = ref(1000)
const showAvailableOnly = ref(false)

const priceSliderMax = computed(() => {
  if (!rooms.value.length) return 1000
  return Math.ceil(Math.max(...rooms.value.map(r => r.price)) / 100) * 100
})

watch(
  () => route.query,
  (q) => { if (q.guests) filterCapacity.value = Number(q.guests) },
  { immediate: true }
)

// ── Derived list ──────────────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return rooms.value.filter(r => {
    if (q && !r.name.toLowerCase().includes(q) && !r.orgName.toLowerCase().includes(q)) return false
    if (filterType.value !== 'All' && r.type !== filterType.value) return false
    if (filterOrg.value  !== 'All' && r.orgName !== filterOrg.value) return false
    if (r.capacity < filterCapacity.value)  return false
    if (r.price > filterMaxPrice.value)     return false
    if (showAvailableOnly.value && !r.available) return false
    return true
  })
})

const resultLabel = computed(() =>
  filtered.value.length === 1 ? '1 sanctuary' : `${filtered.value.length} sanctuaries`
)

function resetFilters() {
  searchQuery.value       = ''
  filterType.value        = 'All'
  filterOrg.value         = 'All'
  filterCapacity.value    = 1
  filterMaxPrice.value    = priceSliderMax.value
  showAvailableOnly.value = false
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 lg:px-8 py-12">

    <!-- Page header -->
    <header class="mb-10 reveal">
      <p class="font-sans text-xs font-bold tracking-[0.2em] uppercase text-[--color-on-muted] mb-2">
        Our Collection
      </p>
      <h1 class="font-serif text-5xl md:text-6xl text-[--color-on-surface]">
        Choose Your <em class="font-normal">Sanctuary</em>
      </h1>
    </header>

    <!-- Search bar -->
    <section class="mb-6 reveal">
      <div class="relative group">
        <div class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <span class="material-symbols-outlined text-[--color-on-muted] group-focus-within:text-[--color-primary] transition-colors">search</span>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by lodge or room name..."
          class="block w-full pl-14 pr-4 py-5 bg-white/40 border border-white/60 rounded-2xl
                 font-sans text-base text-[--color-on-surface] placeholder:text-[--color-on-muted]/60
                 focus:outline-none focus:ring-2 focus:ring-[--color-primary]/20 focus:border-[--color-primary]
                 shadow-sm transition-all"
        />
      </div>
    </section>

    <!-- ── Filter panel ───────────────────────────────────────────────────── -->
    <section
      class="reveal bg-white/40 backdrop-blur-sm rounded-2xl p-8 border border-white/60 shadow-sm mb-12"
    >
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">

        <!-- Room type chips -->
        <div class="lg:col-span-5">
          <label class="block font-sans text-[10px] font-bold tracking-widest uppercase text-[--color-on-muted] mb-4">
            Room Type
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="t in TYPES"
              :key="t"
              class="px-5 py-2 rounded-full font-sans text-xs font-semibold transition-all duration-200"
              :class="filterType === t
                ? 'bg-[oklch(0.88_0.01_50)] text-[oklch(0.25_0.01_50)] shadow-sm'
                : 'border border-[--color-on-surface]/10 text-[--color-on-muted] hover:border-[--color-primary] hover:text-[--color-primary]'"
              @click="filterType = t"
            >
              {{ t }}
            </button>
          </div>
        </div>

        <!-- Min guests slider -->
        <div class="lg:col-span-3">
          <div class="flex justify-between items-center mb-4">
            <label class="font-sans text-[10px] font-bold tracking-widest uppercase text-[--color-on-muted]">
              Min Guests — <span class="text-[--color-on-surface]">{{ filterCapacity }}</span>
            </label>
          </div>
          <div class="px-1">
            <input
              v-model.number="filterCapacity"
              type="range" min="1" max="6" step="1"
              class="rooms-slider w-full"
            />
            <div class="flex justify-between mt-2 font-sans text-[10px] text-[--color-on-muted] font-medium">
              <span>1</span><span>6</span>
            </div>
          </div>
        </div>

        <!-- Max price slider -->
        <div class="lg:col-span-3">
          <div class="flex justify-between items-center mb-4">
            <label class="font-sans text-[10px] font-bold tracking-widest uppercase text-[--color-on-muted]">
              Max Price — <span class="text-[--color-on-surface]">K{{ filterMaxPrice.toLocaleString() }}/night</span>
            </label>
          </div>
          <div class="px-1">
            <input
              v-model.number="filterMaxPrice"
              type="range" min="100" :max="priceSliderMax" step="10"
              class="rooms-slider w-full"
            />
            <div class="flex justify-between mt-2 font-sans text-[10px] text-[--color-on-muted] font-medium">
              <span>K100</span><span>K{{ priceSliderMax.toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <!-- Toggle + reset -->
        <div class="lg:col-span-1 flex flex-col items-start lg:items-end justify-between h-full py-1 gap-4">
          <label class="flex items-center gap-3 cursor-pointer">
            <span class="rooms-toggle">
              <input v-model="showAvailableOnly" type="checkbox" />
              <span class="rooms-toggle-slider" />
            </span>
            <span class="font-sans text-[10px] font-bold tracking-tight uppercase text-[--color-on-muted] whitespace-nowrap">
              Available only
            </span>
          </label>
          <button
            class="font-sans text-[11px] font-bold text-[--color-on-muted] underline decoration-[--color-on-muted]/30
                   hover:text-[--color-primary] hover:decoration-[--color-primary] transition-all"
            @click="resetFilters"
          >
            Reset filters
          </button>
        </div>

      </div>

      <!-- Lodge filter (full-width row, shown always) -->
      <div v-if="ORGS.length" class="mt-8 pt-6 border-t border-[--color-on-surface]/5">
        <label class="block font-sans text-[10px] font-bold tracking-widest uppercase text-[--color-on-muted] mb-4">
          Lodge
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            class="px-5 py-2 rounded-full font-sans text-xs font-semibold transition-all duration-200"
            :class="filterOrg === 'All'
              ? 'bg-[oklch(0.88_0.01_50)] text-[oklch(0.25_0.01_50)] shadow-sm'
              : 'border border-[--color-on-surface]/10 text-[--color-on-muted] hover:border-[--color-primary] hover:text-[--color-primary]'"
            @click="filterOrg = 'All'"
          >
            All Lodges
          </button>
          <button
            v-for="org in ORGS"
            :key="org"
            class="px-5 py-2 rounded-full font-sans text-xs font-semibold transition-all duration-200"
            :class="filterOrg === org
              ? 'bg-[oklch(0.88_0.01_50)] text-[oklch(0.25_0.01_50)] shadow-sm'
              : 'border border-[--color-on-surface]/10 text-[--color-on-muted] hover:border-[--color-primary] hover:text-[--color-primary]'"
            @click="filterOrg = org"
          >
            {{ org }}
          </button>
        </div>
      </div>

    </section>

    <!-- Loading skeleton -->
    <div v-if="apiLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div
        v-for="n in 6"
        :key="n"
        class="rounded-xl bg-[--color-surface-card] overflow-hidden animate-pulse"
        style="box-shadow: var(--shadow-card);"
      >
        <div class="aspect-4/3 bg-[--color-outline]/20" />
        <div class="p-5 space-y-3">
          <div class="h-3 bg-[--color-outline]/20 rounded w-1/3" />
          <div class="h-5 bg-[--color-outline]/20 rounded w-2/3" />
          <div class="h-3 bg-[--color-outline]/20 rounded w-1/2" />
        </div>
      </div>
    </div>

    <!-- API error -->
    <div v-else-if="apiError" class="py-24 text-center">
      <span class="material-symbols-outlined text-4xl text-[--color-error] block mb-4">error</span>
      <p class="font-serif text-xl text-[--color-on-surface] mb-2">Something went wrong</p>
      <p class="font-sans text-sm text-[--color-on-muted]">{{ apiError }}</p>
    </div>

    <template v-else>
      <!-- Result count -->
      <p class="font-sans text-xs text-[--color-on-muted] mb-8 reveal">
        Showing <span class="font-semibold text-[--color-on-surface]">{{ resultLabel }}</span>
      </p>

      <!-- ── Room grid ───────────────────────────────────────────────────── -->
      <Transition
        enter-active-class="transition duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        mode="out-in"
      >
        <div
          v-if="filtered.length"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          <RoomCard
            v-for="(room, i) in filtered"
            :key="room.id"
            :room="room"
            :index="i"
          />
        </div>

        <!-- Empty state -->
        <div v-else class="py-24 text-center">
          <span class="material-symbols-outlined text-4xl text-[--color-on-muted] block mb-4">search_off</span>
          <p class="font-serif text-xl text-[--color-on-surface] mb-2">No sanctuaries match your filters</p>
          <p class="font-sans text-sm text-[--color-on-muted] mb-6">Try adjusting the type, capacity, or price range.</p>
          <button
            class="font-sans text-sm text-[--color-primary] hover:underline"
            @click="resetFilters"
          >
            Clear all filters
          </button>
        </div>
      </Transition>
    </template>

  </div>
</template>

<style scoped>
/* ── Custom range slider ─────────────────────────────────────────────────── */
.rooms-slider {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  width: 100%;
}
.rooms-slider::-webkit-slider-runnable-track {
  background: #E5E7EB;
  height: 4px;
  border-radius: 2px;
}
.rooms-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  margin-top: -6px;
  background-color: oklch(0.55 0.12 45);
  height: 16px;
  width: 16px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.rooms-slider:focus::-webkit-slider-thumb {
  outline: 2px solid oklch(0.55 0.12 45);
  outline-offset: 2px;
}

/* ── Toggle switch ───────────────────────────────────────────────────────── */
.rooms-toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 22px;
  flex-shrink: 0;
}
.rooms-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}
.rooms-toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #D1D5DB;
  transition: 0.3s;
  border-radius: 34px;
}
.rooms-toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}
.rooms-toggle input:checked + .rooms-toggle-slider {
  background-color: oklch(0.55 0.12 45);
}
.rooms-toggle input:checked + .rooms-toggle-slider:before {
  transform: translateX(22px);
}
</style>
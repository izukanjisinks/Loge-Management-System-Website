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

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80',
  'https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=600&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80',
  'https://images.unsplash.com/photo-1440778303588-435521a205bc?w=600&q=80',
]

// Map API room to the shape RoomCard expects
function normalise(r, index) {
  return {
    id:          r.id,
    name:        r.name,
    type:        capitalise(r.type),
    capacity:    r.capacity,
    price:       r.price_per_night,
    available:   r.is_available,
    image:       r.image_url || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
    amenities:   (r.amenities || []).map(a => ({ icon: amenityIcon(a), label: a })),
    description: r.description || '',
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
    const { data } = await api.get('/rooms', { params: { page_size: 100 } })
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

// ── Room types for filter (derived from API data) ─────────────────────────────
const TYPES = computed(() => ['All', ...new Set(rooms.value.map(r => r.type))])

// ── Filter state (seeded from search query params) ───────────────────────────
const filterType        = ref('All')
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
const filtered = computed(() =>
  rooms.value.filter(r => {
    if (filterType.value !== 'All' && r.type !== filterType.value) return false
    if (r.capacity < filterCapacity.value)  return false
    if (r.price > filterMaxPrice.value)     return false
    if (showAvailableOnly.value && !r.available) return false
    return true
  })
)

const resultLabel = computed(() =>
  filtered.value.length === 1 ? '1 sanctuary' : `${filtered.value.length} sanctuaries`
)

function resetFilters() {
  filterType.value        = 'All'
  filterCapacity.value    = 1
  filterMaxPrice.value    = priceSliderMax.value
  showAvailableOnly.value = false
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 md:px-16 py-16">

    <!-- Page header -->
    <div class="mb-10 reveal">
      <p class="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-[--color-primary] mb-2">
        Our Collection
      </p>
      <h1 class="font-serif text-4xl md:text-5xl text-[--color-on-surface]">
        Choose Your <em>Sanctuary</em>
      </h1>
    </div>

    <!-- ── Filter bar ──────────────────────────────────────────────────────── -->
    <div
      class="reveal bg-[--color-surface-card] rounded-lg p-5 mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end"
      style="box-shadow: var(--shadow-card);"
    >
      <!-- Room type -->
      <div class="flex flex-col gap-1.5">
        <label class="font-sans text-[10px] font-bold tracking-[0.2em] uppercase text-[--color-on-muted]">
          Room Type
        </label>
        <div class="flex flex-wrap gap-2 pt-1">
          <button
            v-for="t in TYPES"
            :key="t"
            class="font-sans text-xs px-3 py-1.5 rounded-lg border transition-colors duration-200"
            :class="filterType === t
              ? 'bg-[--color-primary] text-white border-[--color-primary]'
              : 'border-[--color-outline]/40 text-[--color-on-muted] hover:border-[--color-primary]/40'"
            @click="filterType = t"
          >
            {{ t }}
          </button>
        </div>
      </div>

      <!-- Guest capacity -->
      <div class="flex flex-col gap-1.5">
        <label class="font-sans text-[10px] font-bold tracking-[0.2em] uppercase text-[--color-on-muted]">
          Min Guests — {{ filterCapacity }}
        </label>
        <input
          v-model.number="filterCapacity"
          type="range" min="1" max="6" step="1"
          class="w-full accent-[--color-primary] h-1 rounded-full appearance-none bg-[--color-outline]/30"
        />
        <div class="flex justify-between font-sans text-[10px] text-[--color-on-muted]">
          <span>1</span><span>6</span>
        </div>
      </div>

      <!-- Max price -->
      <div class="flex flex-col gap-1.5">
        <label class="font-sans text-[10px] font-bold tracking-[0.2em] uppercase text-[--color-on-muted]">
          Max Price — K{{ filterMaxPrice.toLocaleString() }}/night
        </label>
        <input
          v-model.number="filterMaxPrice"
          type="range" min="100" :max="priceSliderMax" step="10"
          class="w-full accent-[--color-primary] h-1 rounded-full appearance-none bg-[--color-outline]/30"
        />
        <div class="flex justify-between font-sans text-[10px] text-[--color-on-muted]">
          <span>K100</span><span>K{{ priceSliderMax.toLocaleString() }}</span>
        </div>
      </div>

      <!-- Availability + reset -->
      <div class="flex flex-col gap-3">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="showAvailableOnly"
            type="checkbox"
            class="w-4 h-4 rounded accent-[--color-accent]"
          />
          <span class="font-sans text-xs text-[--color-on-muted]">Available only</span>
        </label>
        <button
          class="font-sans text-xs text-[--color-primary] hover:underline text-left"
          @click="resetFilters"
        >
          Reset filters
        </button>
      </div>
    </div>

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
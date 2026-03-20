<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useScrollReveal } from '@/composables/useScrollReveal'
import RoomCard from '@/components/rooms/RoomCard.vue'

useScrollReveal()
const route = useRoute()

// ── Catalogue (replace with API call when backend is ready) ──────────────────
const ALL_ROOMS = [
  {
    id: 1, name: 'The Forest Suite',   type: 'Suite',   capacity: 2, price: 420, available: true,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    amenities: [
      { icon: 'wifi',       label: 'Wi-Fi' },
      { icon: 'local_cafe', label: 'Coffee' },
      { icon: 'hot_tub',    label: 'Hot Tub' },
      { icon: 'fireplace',  label: 'Fireplace' },
      { icon: 'deck',       label: 'Deck' },
    ],
  },
  {
    id: 2, name: 'Highland Cottage',   type: 'Cottage', capacity: 4, price: 280, available: true,
    image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80',
    amenities: [
      { icon: 'wifi',      label: 'Wi-Fi' },
      { icon: 'fireplace', label: 'Fireplace' },
      { icon: 'yard',      label: 'Garden' },
      { icon: 'kitchen',   label: 'Kitchenette' },
    ],
  },
  {
    id: 3, name: 'The Stone Pavilion', type: 'Pavilion', capacity: 2, price: 560, available: true,
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80',
    amenities: [
      { icon: 'wifi',     label: 'Wi-Fi' },
      { icon: 'hot_tub',  label: 'Hot Tub' },
      { icon: 'bathtub',  label: 'Soaking Tub' },
      { icon: 'deck',     label: 'Private Deck' },
      { icon: 'spa',      label: 'Spa Access' },
    ],
  },
  {
    id: 4, name: 'Riverside Cabin',    type: 'Cabin',   capacity: 3, price: 320, available: false,
    image: 'https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=600&q=80',
    amenities: [
      { icon: 'wifi',      label: 'Wi-Fi' },
      { icon: 'fireplace', label: 'Fireplace' },
      { icon: 'kayaking',  label: 'Kayaking' },
    ],
  },
  {
    id: 5, name: 'The Canopy Loft',    type: 'Loft',    capacity: 2, price: 380, available: true,
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80',
    amenities: [
      { icon: 'wifi',       label: 'Wi-Fi' },
      { icon: 'local_cafe', label: 'Coffee' },
      { icon: 'deck',       label: 'Sky Deck' },
    ],
  },
  {
    id: 6, name: 'Garden Villa',       type: 'Villa',   capacity: 6, price: 680, available: true,
    image: 'https://images.unsplash.com/photo-1440778303588-435521a205bc?w=600&q=80',
    amenities: [
      { icon: 'wifi',       label: 'Wi-Fi' },
      { icon: 'pool',       label: 'Private Pool' },
      { icon: 'kitchen',    label: 'Full Kitchen' },
      { icon: 'yard',       label: 'Garden' },
      { icon: 'fireplace',  label: 'Fireplace' },
      { icon: 'local_cafe', label: 'Coffee Bar' },
    ],
  },
]

// ── Room types for filter ────────────────────────────────────────────────────
const TYPES = ['All', ...new Set(ALL_ROOMS.map(r => r.type))]

// ── Filter state (seeded from search query params) ───────────────────────────
const filterType     = ref('All')
const filterCapacity = ref(1)
const filterMaxPrice = ref(1000)
const showAvailableOnly = ref(false)

// Seed from URL query (populated by SearchBar)
watch(
  () => route.query,
  (q) => {
    if (q.guests)   filterCapacity.value = Number(q.guests)
  },
  { immediate: true }
)

// ── Derived list ─────────────────────────────────────────────────────────────
const filtered = computed(() =>
  ALL_ROOMS.filter(r => {
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
  filterType.value     = 'All'
  filterCapacity.value = 1
  filterMaxPrice.value = 1000
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

    <!-- ── Filter bar ─────────────────────────────────────────────────────── -->
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
          Max Price — ${{ filterMaxPrice }}/night
        </label>
        <input
          v-model.number="filterMaxPrice"
          type="range" min="100" max="1000" step="10"
          class="w-full accent-[--color-primary] h-1 rounded-full appearance-none bg-[--color-outline]/30"
        />
        <div class="flex justify-between font-sans text-[10px] text-[--color-on-muted]">
          <span>$100</span><span>$1000</span>
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

    <!-- Result count -->
    <p class="font-sans text-xs text-[--color-on-muted] mb-8 reveal">
      Showing <span class="font-semibold text-[--color-on-surface]">{{ resultLabel }}</span>
    </p>

    <!-- ── Room grid ──────────────────────────────────────────────────────── -->
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

  </div>
</template>

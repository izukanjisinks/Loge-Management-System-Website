<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useScrollReveal } from '@/composables/useScrollReveal'
import RoomCard from '@/components/rooms/RoomCard.vue'
import VenueCard from '@/components/venues/VenueCard.vue'
import api from '@/lib/api'

useScrollReveal()

// ── Data ─────────────────────────────────────────────────────────────────────
const rooms     = ref([])
const venues    = ref([])
const loading   = ref(false)
const error     = ref('')

// ── Filters ──────────────────────────────────────────────────────────────────
const activeTab     = ref('all')   // 'all' | 'rooms' | 'venues'
const filterCapacity = ref(1)
const filterIndoor   = ref('')     // '' | 'indoor' | 'outdoor' | 'semi_outdoor'
const searchQuery    = ref('')

function normaliseRoom(r) {
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
  function amenityIcon(label) {
    const l = label.toLowerCase()
    if (l.includes('wifi') || l.includes('wi-fi')) return 'wifi'
    if (l.includes('pool'))        return 'pool'
    if (l.includes('jacuzzi'))     return 'hot_tub'
    if (l.includes('bar'))         return 'local_bar'
    if (l.includes('tv'))          return 'tv'
    if (l.includes('kitchen'))     return 'kitchen'
    if (l.includes('fireplace'))   return 'fireplace'
    if (l.includes('spa'))         return 'spa'
    if (l.includes('air') || l.includes('ac')) return 'ac_unit'
    return 'check_circle'
  }
  return {
    id:          r.id,
    name:        r.name,
    type:        cap(r.type),
    capacity:    r.capacity,
    price:       parseFloat(r.price_per_night) || 0,
    available:   r.is_available,
    image:       r.images?.[0] || null,
    amenities:   (r.amenities || []).map(a => ({ icon: amenityIcon(a), label: a })),
    description: r.description || '',
    orgName:     r.organization?.name || '',
    _kind:       'room',
  }
}

async function fetchAll() {
  loading.value = true
  error.value   = ''
  try {
    const [roomsRes, venuesRes] = await Promise.all([
      api.get('/guest/rooms'),
      api.get('/guest/venues'),
    ])
    rooms.value  = (roomsRes.data.data ?? roomsRes.data).map(normaliseRoom)
    venues.value = (venuesRes.data.data ?? venuesRes.data).map(v => ({ ...v, _kind: 'venue' }))
  } catch (err) {
    error.value = 'Unable to load listings. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchAll())

// ── Computed ──────────────────────────────────────────────────────────────────
const filteredRooms = computed(() => {
  if (activeTab.value === 'venues') return []
  return rooms.value.filter(r => {
    if (filterCapacity.value > 1 && r.capacity < filterCapacity.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false
    }
    return true
  })
})

const filteredVenues = computed(() => {
  if (activeTab.value === 'rooms') return []
  return venues.value.filter(v => {
    if (filterCapacity.value > 1 && v.capacity < filterCapacity.value) return false
    if (filterIndoor.value && v.location_type !== filterIndoor.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!v.name.toLowerCase().includes(q) && !v.description?.toLowerCase().includes(q)) return false
    }
    return true
  })
})

const totalCount = computed(() => filteredRooms.value.length + filteredVenues.value.length)

function resetFilters() {
  searchQuery.value   = ''
  filterCapacity.value = 1
  filterIndoor.value   = ''
}
</script>

<template>
  <!-- Page Hero -->
  <section class="relative h-52 md:h-64 overflow-hidden">
    <img
      src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=80"
      alt="Explore rooms and venues"
      class="absolute inset-0 w-full h-full object-cover"
      loading="eager"
    />
    <div class="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent"></div>
    <div class="relative z-10 h-full flex flex-col justify-end px-5 md:px-16 pb-10 max-w-[1280px] mx-auto">
      <h1 class="font-serif text-3xl md:text-4xl font-semibold text-white">Explore Everything</h1>
      <p class="font-sans text-sm text-white/80 mt-2 max-w-lg">
        Browse accommodation rooms and event venues together — find the perfect space for any occasion.
      </p>
    </div>
  </section>

  <div class="max-w-[1280px] mx-auto px-5 md:px-16 pt-8 pb-16">

    <!-- Filter bar -->
    <div class="flex flex-col md:flex-row gap-4 mb-8 p-5 bg-(--color-surface-container-lowest) rounded-2xl">

      <!-- Search -->
      <div class="flex-1 flex items-center gap-3 bg-(--color-savannah-mist) px-4 py-2.5 rounded-lg">
        <span class="material-symbols-outlined text-(--color-primary) shrink-0">search</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search rooms and venues…"
          class="w-full bg-transparent border-none focus:ring-0 focus:outline-none font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-outline)"
        />
      </div>

      <!-- Tab toggles -->
      <div class="flex items-center gap-1 p-1 bg-(--color-savannah-mist) rounded-lg shrink-0">
        <button
          v-for="tab in [
            { value: 'all',    label: 'All',        icon: 'apps' },
            { value: 'rooms',  label: 'Rooms',      icon: 'bed' },
            { value: 'venues', label: 'Venues',     icon: 'event' },
          ]"
          :key="tab.value"
          :class="activeTab === tab.value
            ? 'bg-(--color-primary) text-white shadow-sm'
            : 'text-(--color-on-surface-variant) hover:text-(--color-on-surface)'"
          class="flex items-center gap-1.5 px-4 py-2 rounded-md font-sans text-sm font-semibold transition-all"
          @click="activeTab = tab.value"
        >
          <span class="material-symbols-outlined text-base">{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </div>

      <!-- Min Capacity -->
      <div class="flex items-center gap-3 shrink-0">
        <span class="material-symbols-outlined text-(--color-primary)">group</span>
        <div class="flex flex-col gap-0.5">
          <span class="font-sans text-[10px] font-bold uppercase tracking-wider text-(--color-on-surface-variant)">Min Capacity</span>
          <input
            v-model.number="filterCapacity"
            type="number" min="1" max="1000"
            class="w-20 bg-(--color-savannah-mist) border-none rounded px-2 py-1 font-sans text-sm text-(--color-on-surface) focus:outline-none focus:ring-1 focus:ring-(--color-primary)"
          />
        </div>
      </div>

      <!-- Location (venues only) -->
      <div v-if="activeTab !== 'rooms'" class="flex items-center gap-2 shrink-0">
        <select
          v-model="filterIndoor"
          class="bg-(--color-savannah-mist) border-none rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all cursor-pointer"
        >
          <option value="">Any Location</option>
          <option value="indoor">Indoor</option>
          <option value="semi_outdoor">Semi-Outdoor</option>
          <option value="outdoor">Outdoor</option>
        </select>
      </div>

      <button
        class="shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-(--color-on-surface-variant) font-sans text-sm font-semibold hover:text-(--color-primary) transition-colors"
        @click="resetFilters"
      >
        <span class="material-symbols-outlined text-base">filter_alt_off</span>
        Reset
      </button>
    </div>

    <!-- Result count -->
    <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">
      Showing <span class="font-bold text-(--color-on-surface)">{{ totalCount }}</span>
      {{ totalCount === 1 ? 'result' : 'results' }}
      <template v-if="activeTab !== 'all'"> — {{ activeTab === 'rooms' ? 'Accommodation' : 'Venues' }} only</template>
    </p>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="n in 6" :key="n" class="rounded-xl bg-(--color-surface-container-lowest) border border-(--color-savannah-mist) overflow-hidden animate-pulse">
        <div class="h-56 bg-(--color-surface-container-high)"></div>
        <div class="p-5 space-y-3">
          <div class="h-4 bg-(--color-surface-container-high) rounded max-w-48"></div>
          <div class="h-3 bg-(--color-surface-container-high) rounded max-w-32"></div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="py-24 text-center">
      <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-4">error</span>
      <p class="font-serif text-xl text-(--color-on-surface)">Something went wrong</p>
      <p class="font-sans text-sm text-(--color-on-surface-variant) mt-2">{{ error }}</p>
    </div>

    <template v-else>
      <!-- Rooms section -->
      <template v-if="filteredRooms.length">
        <div v-if="activeTab === 'all'" class="flex items-center gap-3 mb-5">
          <span class="material-symbols-outlined text-(--color-primary)">bed</span>
          <h2 class="font-serif text-2xl text-(--color-on-surface)">Accommodation</h2>
          <span class="font-sans text-sm text-(--color-on-surface-variant)">({{ filteredRooms.length }})</span>
          <div class="flex-1 h-px bg-(--color-outline-variant)"></div>
          <RouterLink to="/rooms" class="font-sans text-sm text-(--color-primary) hover:underline flex items-center gap-1">
            View all <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </RouterLink>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <RoomCard v-for="(room, i) in filteredRooms" :key="room.id" :room="room" :index="i" />
        </div>
      </template>

      <!-- Venues section -->
      <template v-if="filteredVenues.length">
        <div v-if="activeTab === 'all'" class="flex items-center gap-3 mb-5 mt-4">
          <span class="material-symbols-outlined text-(--color-primary)">event</span>
          <h2 class="font-serif text-2xl text-(--color-on-surface)">Venues &amp; Event Spaces</h2>
          <span class="font-sans text-sm text-(--color-on-surface-variant)">({{ filteredVenues.length }})</span>
          <div class="flex-1 h-px bg-(--color-outline-variant)"></div>
          <RouterLink to="/venues" class="font-sans text-sm text-(--color-primary) hover:underline flex items-center gap-1">
            View all <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </RouterLink>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <VenueCard v-for="(venue, i) in filteredVenues" :key="venue.id" :venue="venue" :index="i" />
        </div>
      </template>

      <!-- Empty -->
      <div v-if="!filteredRooms.length && !filteredVenues.length" class="py-24 text-center">
        <span class="material-symbols-outlined text-4xl text-(--color-on-surface-variant) block mb-4">search_off</span>
        <p class="font-serif text-xl text-(--color-on-surface) mb-2">No results match your filters</p>
        <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Try adjusting your search or changing the capacity.</p>
        <button class="font-sans text-sm text-(--color-primary) hover:underline" @click="resetFilters">Clear all filters</button>
      </div>
    </template>
  </div>
</template>

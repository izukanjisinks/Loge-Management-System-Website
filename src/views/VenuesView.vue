<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useScrollReveal } from '@/composables/useScrollReveal'
import VenueCard from '@/components/venues/VenueCard.vue'
import api from '@/lib/api'

useScrollReveal()

const venues     = ref([])
const apiLoading = ref(false)
const apiError   = ref('')

const VENUE_TYPES = [
  { value: '',               label: 'All Types' },
  { value: 'conference_room', label: 'Conference Room' },
  { value: 'boardroom',       label: 'Boardroom' },
  { value: 'banquet_hall',    label: 'Banquet Hall' },
  { value: 'wedding_venue',   label: 'Wedding Venue' },
  { value: 'garden',          label: 'Garden' },
  { value: 'marquee',         label: 'Marquee / Pavilion' },
  { value: 'training_room',   label: 'Training Room' },
  { value: 'exhibition',      label: 'Exhibition Space' },
  { value: 'amphitheatre',    label: 'Amphitheatre' },
]

const EVENT_TYPES = [
  'All Events', 'Conferences', 'Weddings', 'Gala Dinners', 'Training Sessions',
  'Team Building', 'Corporate Meetings', 'Award Ceremonies', 'Exhibitions', 'Concerts',
]

const filterType          = ref('')
const filterLocationType  = ref('')
const filterMinCapacity   = ref(1)
const filterEventType     = ref('All Events')

async function fetchVenues() {
  apiLoading.value = true
  apiError.value   = ''
  try {
    const params = {}
    if (filterType.value)         params.type          = filterType.value
    if (filterLocationType.value) params.location_type = filterLocationType.value
    if (filterMinCapacity.value > 1) params.min_capacity = filterMinCapacity.value
    const { data } = await api.get('/guest/venues', { params })
    venues.value = data.data ?? data
  } catch (err) {
    apiError.value = err.response?.data?.error?.message || 'Unable to load venues. Please try again.'
  } finally {
    apiLoading.value = false
  }
}

watch([filterType, filterLocationType], () => fetchVenues())

onMounted(() => fetchVenues())

const filtered = computed(() => {
  let result = venues.value
  if (filterMinCapacity.value > 1) {
    result = result.filter(v => v.capacity >= filterMinCapacity.value)
  }
  if (filterEventType.value !== 'All Events') {
    result = result.filter(v =>
      v.suitable_events?.some(e => e.toLowerCase().includes(filterEventType.value.toLowerCase()))
    )
  }
  return result
})

const resultLabel = computed(() =>
  filtered.value.length === 1 ? '1 venue' : `${filtered.value.length} venues`
)

function resetFilters() {
  filterType.value         = ''
  filterLocationType.value = ''
  filterMinCapacity.value  = 1
  filterEventType.value    = 'All Events'
  fetchVenues()
}

function typeIcon(type) {
  if (type === 'conference_room')  return 'corporate_fare'
  if (type === 'boardroom')        return 'meeting_room'
  if (type === 'banquet_hall')     return 'celebration'
  if (type === 'wedding_venue')    return 'favorite'
  if (type === 'garden')           return 'local_florist'
  if (type === 'marquee')          return 'festival'
  if (type === 'training_room')    return 'school'
  if (type === 'exhibition')       return 'museum'
  if (type === 'amphitheatre')     return 'theater_comedy'
  return 'event'
}
</script>

<template>
  <!-- Page Hero -->
  <section class="relative h-52 md:h-64 overflow-hidden">
    <img
      src="https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&q=80"
      alt="Venue and event spaces"
      class="absolute inset-0 w-full h-full object-cover"
      loading="eager"
    />
    <div class="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent"></div>
    <div class="relative z-10 h-full flex flex-col justify-end px-5 md:px-16 pb-10 max-w-[1280px] mx-auto">
      <h1 class="font-serif text-3xl md:text-4xl font-semibold text-white">Venues &amp; Event Spaces</h1>
      <p class="font-sans text-sm text-white/80 mt-2 max-w-lg">
        Discover conference halls, boardrooms, wedding gardens, banquet halls, and more — tailored to your event.
      </p>
    </div>
  </section>

  <div class="max-w-[1280px] mx-auto px-5 md:px-16 pt-8 pb-16 flex flex-col md:flex-row gap-6">

    <!-- Sidebar Filters -->
    <aside class="w-full md:w-64 shrink-0">
      <div class="sticky top-28 flex flex-col gap-7">
        <h2 class="font-serif text-2xl text-(--color-on-surface)">Filters</h2>

        <!-- Venue Type -->
        <div class="flex flex-col gap-3">
          <span class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">Venue Type</span>
          <div class="flex flex-col gap-2">
            <label
              v-for="t in VENUE_TYPES"
              :key="t.value"
              class="flex items-center gap-3 cursor-pointer group"
            >
              <input
                v-model="filterType"
                :value="t.value"
                type="radio"
                class="w-4 h-4 rounded-full border-(--color-outline) text-(--color-primary) focus:ring-(--color-primary)"
              />
              <span class="font-sans text-sm text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors flex items-center gap-1.5">
                <span v-if="t.value" class="material-symbols-outlined text-base text-(--color-primary)">{{ typeIcon(t.value) }}</span>
                {{ t.label }}
              </span>
            </label>
          </div>
        </div>

        <div class="h-px bg-(--color-outline-variant)"></div>

        <!-- Location Type -->
        <div class="flex flex-col gap-3">
          <span class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">Location</span>
          <div class="flex flex-col gap-2">
            <label
              v-for="loc in [
                { value: '', label: 'All Locations' },
                { value: 'indoor', label: 'Indoor', icon: 'warehouse' },
                { value: 'semi_outdoor', label: 'Semi-Outdoor', icon: 'open_in_full' },
                { value: 'outdoor', label: 'Outdoor', icon: 'park' },
              ]"
              :key="loc.value"
              class="flex items-center gap-3 cursor-pointer group"
            >
              <input
                v-model="filterLocationType"
                :value="loc.value"
                type="radio"
                class="w-4 h-4 rounded-full border-(--color-outline) text-(--color-primary) focus:ring-(--color-primary)"
              />
              <span class="font-sans text-sm text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors flex items-center gap-1.5">
                <span v-if="loc.icon" class="material-symbols-outlined text-base text-(--color-primary)">{{ loc.icon }}</span>
                {{ loc.label }}
              </span>
            </label>
          </div>
        </div>

        <div class="h-px bg-(--color-outline-variant)"></div>

        <!-- Min Capacity -->
        <div class="flex flex-col gap-3">
          <span class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
            Min Capacity &mdash; <span class="text-(--color-on-surface)">{{ filterMinCapacity }}</span>
          </span>
          <input
            v-model.number="filterMinCapacity"
            type="range" min="1" max="1000" step="10"
            class="w-full h-1 bg-(--color-surface-container-highest) rounded-lg appearance-none cursor-pointer accent-(--color-primary)"
          />
          <div class="flex justify-between font-sans text-xs text-(--color-on-surface-variant)">
            <span>1</span><span>1 000</span>
          </div>
        </div>

        <div class="h-px bg-(--color-outline-variant)"></div>

        <!-- Event Type -->
        <div class="flex flex-col gap-3">
          <span class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">Event Type</span>
          <select
            v-model="filterEventType"
            class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all cursor-pointer"
          >
            <option v-for="e in EVENT_TYPES" :key="e" :value="e">{{ e }}</option>
          </select>
        </div>

        <button
          class="w-full mt-2 bg-(--color-surface-container-high) text-(--color-on-surface-variant) py-3 rounded-2xl font-sans text-sm font-semibold tracking-[0.05em] hover:bg-(--color-surface-container-highest) transition-colors"
          @click="resetFilters"
        >
          Clear All Filters
        </button>
      </div>
    </aside>

    <!-- Results -->
    <section class="flex-1 flex flex-col">
      <div class="flex flex-col md:flex-row justify-between items-baseline mb-8 gap-4">
        <div>
          <h2 class="font-serif text-[28px] font-semibold leading-9 text-(--color-on-surface)">Available Venues</h2>
          <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1">
            Showing {{ resultLabel }} across all properties
          </p>
        </div>
      </div>

      <div class="flex-1 min-h-[600px] flex flex-col">
        <!-- Loading skeleton -->
        <div v-if="apiLoading" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="n in 6"
            :key="n"
            class="rounded-xl bg-(--color-surface-container-lowest) border border-(--color-savannah-mist) overflow-hidden animate-pulse"
          >
            <div class="h-56 bg-(--color-surface-container-high)"></div>
            <div class="p-5 space-y-3">
              <div class="h-4 bg-(--color-surface-container-high) rounded max-w-48"></div>
              <div class="h-3 bg-(--color-surface-container-high) rounded max-w-32"></div>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-else-if="apiError" class="flex-1 flex flex-col items-center justify-center py-24 text-center">
          <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-4">error</span>
          <p class="font-serif text-xl text-(--color-on-surface) mb-2">Something went wrong</p>
          <p class="font-sans text-sm text-(--color-on-surface-variant)">{{ apiError }}</p>
        </div>

        <template v-else>
          <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" mode="out-in">
            <div v-if="filtered.length" class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <VenueCard
                v-for="(venue, i) in filtered"
                :key="venue.id"
                :venue="venue"
                :index="i"
              />
            </div>

            <div v-else class="flex-1 flex flex-col items-center justify-center py-24 text-center">
              <span class="material-symbols-outlined text-4xl text-(--color-on-surface-variant) block mb-4">search_off</span>
              <p class="font-serif text-xl text-(--color-on-surface) mb-2">No venues match your filters</p>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Try adjusting the venue type, location, or capacity.</p>
              <button class="font-sans text-sm text-(--color-primary) hover:underline" @click="resetFilters">
                Clear all filters
              </button>
            </div>
          </Transition>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useScrollReveal } from '@/composables/useScrollReveal'
import { useLodgesStore } from '@/stores/lodges'
import api from '@/lib/api'

useScrollReveal()
const route       = useRoute()
const lodgesStore = useLodgesStore()

const rooms      = ref([])
const total      = ref(0)
const page       = ref(1)
const PAGE_SIZE  = 9
const apiLoading = ref(false)
const apiError   = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
}

function amenityIcon(label) {
  const l = label.toLowerCase()
  if (l.includes('wifi') || l.includes('wi-fi'))       return 'wifi'
  if (l.includes('pool'))                              return 'pool'
  if (l.includes('jacuzzi') || l.includes('hot tub')) return 'hot_tub'
  if (l.includes('bar') || l.includes('mini bar'))    return 'local_bar'
  if (l.includes('tv'))                               return 'tv'
  if (l.includes('kitchen'))                          return 'kitchen'
  if (l.includes('fireplace'))                        return 'fireplace'
  if (l.includes('spa'))                              return 'spa'
  if (l.includes('air') || l.includes('ac'))          return 'ac_unit'
  if (l.includes('dining') || l.includes('restaurant')) return 'restaurant'
  if (l.includes('deck') || l.includes('terrace'))    return 'deck'
  return 'check_circle'
}

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

const filterLodge       = ref('')   // lodge id or ''
const filterBranch      = ref('')   // branch id or ''
const filterType        = ref('All')
const filterCapacity    = ref(1)
const filterMaxPrice    = ref(1000)
const showAvailableOnly = ref(false)
const searchQuery       = ref('')   // client-side name/description search

const availableBranches = computed(() =>
  filterLodge.value ? lodgesStore.branchesFor(filterLodge.value) : []
)

// "Other Products" — real nav links (no fabricated prices/ratings)
const otherProducts = [
  { label: 'Venues',  desc: 'Event & conference spaces', icon: 'meeting_room', to: '/venues' },
  { label: 'Explore', desc: 'Browse everything',          icon: 'explore',      to: '/explore' },
]

watch(filterLodge, () => {
  filterBranch.value = ''
  fetchRooms(1)
})
watch(filterBranch, () => fetchRooms(1))

async function fetchRooms(p = page.value) {
  apiLoading.value = true
  apiError.value   = ''
  page.value = p
  try {
    const params = { page: p, page_size: PAGE_SIZE }
    if (filterLodge.value)              params.org_id    = filterLodge.value
    if (filterBranch.value)             params.branch_id = filterBranch.value
    if (filterType.value !== 'All')     params.type      = filterType.value.toLowerCase()
    const { data } = await api.get('/guest/rooms', { params })
    const list = data.data ?? data
    rooms.value = list.map(normalise)
    total.value = data.total ?? rooms.value.length
    if (rooms.value.length && filterMaxPrice.value === 1000) {
      const maxPrice = Math.max(...rooms.value.map(r => parseFloat(r.price) || 0))
      filterMaxPrice.value = Math.ceil(maxPrice / 100) * 100
    }
  } catch (err) {
    apiError.value = err.response?.data?.error?.message || 'Unable to load rooms. Please try again.'
  } finally {
    apiLoading.value = false
  }
}

watch(filterType, () => fetchRooms(1))

onMounted(() => {
  lodgesStore.fetchLodges()
  fetchRooms(1)
})

const TYPES = computed(() => ['All', ...new Set(rooms.value.map(r => r.type))])

const priceSliderMax = computed(() => {
  if (!rooms.value.length) return 1000
  return Math.ceil(Math.max(...rooms.value.map(r => r.price)) / 100) * 100
})

watch(
  () => route.query,
  (q) => { if (q.guests) filterCapacity.value = Number(q.guests) },
  { immediate: true }
)

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return rooms.value.filter(r => {
    if (filterType.value !== 'All' && r.type !== filterType.value) return false
    if (r.capacity < filterCapacity.value) return false
    if (r.price > filterMaxPrice.value)    return false
    if (showAvailableOnly.value && !r.available) return false
    if (q && !(`${r.name} ${r.type} ${r.description}`.toLowerCase().includes(q))) return false
    return true
  })
})

const resultLabel = computed(() =>
  filtered.value.length === 1 ? '1 premium escape' : `${filtered.value.length} premium escapes`
)

function resetFilters() {
  filterLodge.value       = ''
  filterBranch.value      = ''
  filterType.value        = 'All'
  filterCapacity.value    = 1
  filterMaxPrice.value    = priceSliderMax.value
  showAvailableOnly.value = false
  searchQuery.value       = ''
  fetchRooms(1)
}
</script>

<template>
  <div class="max-w-[1280px] mx-auto px-5 md:px-16 pt-8 pb-16">

    <!-- Section header -->
    <div class="mb-12">
      <span class="font-sans text-xs font-bold tracking-[0.2em] uppercase text-(--color-primary) block mb-3">Exquisite Living</span>
      <h1 class="font-serif text-[40px] leading-none font-bold text-(--color-on-surface)">Featured Accommodations</h1>
      <p class="font-sans text-sm text-(--color-on-surface-variant) mt-3">Showing {{ resultLabel }} in Southern Africa</p>
    </div>

    <div class="flex flex-col md:flex-row gap-10 items-start">

      <!-- ── Left: Room grid (75%) ─────────────────────────────────────────── -->
      <section class="w-full md:w-3/4">

        <!-- Loading skeleton -->
        <div v-if="apiLoading" class="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div
            v-for="n in 6"
            :key="n"
            class="h-[500px] rounded-[2rem] bg-(--color-surface-container-high) overflow-hidden animate-pulse"
          ></div>
        </div>

        <!-- API error -->
        <div v-else-if="apiError" class="flex flex-col items-center justify-center py-24 text-center">
          <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-4">error</span>
          <p class="font-serif text-xl text-(--color-on-surface) mb-2">Something went wrong</p>
          <p class="font-sans text-sm text-(--color-on-surface-variant)">{{ apiError }}</p>
        </div>

        <template v-else>
          <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" mode="out-in">
            <!-- Room grid -->
            <div v-if="filtered.length" class="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <RouterLink
                v-for="room in filtered"
                :key="room.id"
                :to="`/rooms/${room.id}`"
                class="group relative h-[500px] rounded-[2rem] overflow-hidden shadow-xl block"
              >
                <!-- Image -->
                <img
                  v-if="room.image"
                  :src="room.image"
                  :alt="room.name"
                  class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div v-else class="absolute inset-0 bg-(--color-surface-container-high) flex items-center justify-center">
                  <span class="material-symbols-outlined text-6xl text-(--color-outline)">bed</span>
                </div>

                <!-- Type badge -->
                <div v-if="room.type" class="absolute top-5 left-5 z-20 bg-(--color-charcoal) text-white px-4 py-1.5 rounded-full font-sans text-xs font-semibold uppercase tracking-widest shadow-lg">
                  {{ room.type }}
                </div>

                <!-- Frosted info panel -->
                <div class="absolute inset-x-0 bottom-0 z-10 bg-(--color-surface-container-lowest)/90 backdrop-blur-sm p-6 border-t border-white/20">
                  <div class="flex justify-between items-start gap-3 mb-3">
                    <h3 class="font-serif text-xl font-semibold text-(--color-on-surface) leading-tight">{{ room.name }}</h3>
                    <span class="shrink-0 flex items-center gap-1 font-sans text-xs font-semibold text-(--color-on-surface-variant)">
                      <span class="material-symbols-outlined text-base text-(--color-primary)">group</span>
                      {{ room.capacity }}
                    </span>
                  </div>
                  <p v-if="room.description" class="font-sans text-sm text-(--color-on-surface-variant) mb-6 line-clamp-2">
                    {{ room.description }}
                  </p>
                  <div class="flex justify-between items-center">
                    <span class="font-sans text-xl font-bold text-(--color-on-surface)">
                      K{{ Number(room.price).toLocaleString() }}<span class="text-sm font-normal text-(--color-on-surface-variant)">/night</span>
                    </span>
                    <span class="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-(--color-primary) group-hover:text-(--color-charcoal) transition-colors">
                      Details <span class="material-symbols-outlined text-base">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </RouterLink>
            </div>

            <!-- Empty state -->
            <div v-else class="flex flex-col items-center justify-center py-24 text-center">
              <span class="material-symbols-outlined text-4xl text-(--color-on-surface-variant) block mb-4">search_off</span>
              <p class="font-serif text-xl text-(--color-on-surface) mb-2">No rooms match your filters</p>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Try adjusting the type, capacity, or price range.</p>
              <button class="font-sans text-sm text-(--color-primary) hover:underline" @click="resetFilters">Clear all filters</button>
            </div>
          </Transition>

          <!-- Pagination -->
          <div v-if="filtered.length" class="flex items-center justify-center gap-2 mt-14">
            <button
              :disabled="page <= 1 || apiLoading"
              class="w-12 h-12 rounded-2xl border border-(--color-outline-variant) flex items-center justify-center text-(--color-on-surface) hover:bg-(--color-primary) hover:text-white hover:border-(--color-primary) disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-(--color-on-surface) transition-all"
              @click="fetchRooms(page - 1)"
            >
              <span class="material-symbols-outlined">chevron_left</span>
            </button>

            <button
              v-for="p in totalPages" :key="p"
              :class="p === page
                ? 'bg-(--color-primary) text-white shadow-lg'
                : 'border border-transparent text-(--color-on-surface) hover:border-(--color-outline-variant) hover:text-(--color-primary)'"
              class="w-12 h-12 rounded-2xl flex items-center justify-center font-sans text-sm font-semibold transition-all"
              @click="fetchRooms(p)"
            >
              {{ p }}
            </button>

            <button
              :disabled="page >= totalPages || apiLoading"
              class="w-12 h-12 rounded-2xl border border-(--color-outline-variant) flex items-center justify-center text-(--color-on-surface) hover:bg-(--color-primary) hover:text-white hover:border-(--color-primary) disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-(--color-on-surface) transition-all"
              @click="fetchRooms(page + 1)"
            >
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </template>
      </section>

      <!-- ── Right: Sidebar filter (25%) ───────────────────────────────────── -->
      <aside class="w-full md:w-1/4 bg-(--color-surface-container-low) p-8 rounded-[2rem] space-y-8 md:sticky md:top-24">

        <!-- Search -->
        <div class="flex gap-2">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search rooms..."
            class="w-full bg-(--color-surface-container-lowest) border border-(--color-outline-variant) rounded-xl px-4 py-3 font-sans text-sm text-(--color-on-surface) focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-(--color-primary) transition-all"
          />
          <button
            class="bg-(--color-primary) text-white px-5 rounded-xl font-sans text-xs font-bold uppercase tracking-wider hover:bg-(--color-charcoal) transition-all shrink-0"
          >
            Search
          </button>
        </div>

        <!-- Lodge / Branch -->
        <div class="space-y-4">
          <div class="flex flex-col gap-2">
            <span class="font-sans text-xs font-bold tracking-widest uppercase text-(--color-on-surface-variant)">Lodge</span>
            <select
              v-model="filterLodge"
              class="w-full bg-(--color-surface-container-lowest) border border-(--color-outline-variant) rounded-xl px-4 py-3 font-sans text-sm text-(--color-on-surface) focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-(--color-primary) transition-all cursor-pointer"
            >
              <option value="">All Lodges</option>
              <option v-for="l in lodgesStore.lodges" :key="l.id" :value="l.id">{{ l.name }}</option>
            </select>
          </div>

          <div v-if="availableBranches.length" class="flex flex-col gap-2">
            <span class="font-sans text-xs font-bold tracking-widest uppercase text-(--color-on-surface-variant)">Branch</span>
            <select
              v-model="filterBranch"
              class="w-full bg-(--color-surface-container-lowest) border border-(--color-outline-variant) rounded-xl px-4 py-3 font-sans text-sm text-(--color-on-surface) focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-(--color-primary) transition-all cursor-pointer"
            >
              <option value="">All Branches</option>
              <option v-for="b in availableBranches" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>
        </div>

        <!-- Filter by price -->
        <div class="space-y-6">
          <div class="bg-(--color-surface-container-lowest) py-4 rounded-xl text-center shadow-sm">
            <h4 class="font-sans text-xs font-bold text-(--color-on-surface) uppercase tracking-widest">Filter by Price</h4>
          </div>
          <div class="px-1">
            <input
              v-model.number="filterMaxPrice"
              type="range" min="100" :max="priceSliderMax" step="10"
              class="w-full h-2 bg-(--color-surface-container-highest) rounded-full appearance-none cursor-pointer accent-(--color-primary)"
            />
            <div class="mt-4 text-center font-sans text-sm text-(--color-on-surface-variant)">
              Price: <span class="text-(--color-on-surface) font-bold">K100 — K{{ filterMaxPrice.toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <!-- Room type -->
        <div class="space-y-5">
          <div class="bg-(--color-surface-container-lowest) py-4 rounded-xl text-center shadow-sm">
            <h4 class="font-sans text-xs font-bold text-(--color-on-surface) uppercase tracking-widest">Room Type</h4>
          </div>
          <div class="flex flex-col gap-2.5 px-1">
            <label v-for="t in TYPES" :key="t" class="flex items-center gap-3 cursor-pointer group">
              <input v-model="filterType" :value="t" type="radio" class="w-4 h-4 accent-(--color-primary)" />
              <span class="font-sans text-sm text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">{{ t }}</span>
            </label>
          </div>
        </div>

        <!-- Min guests + available -->
        <div class="space-y-5 px-1">
          <div class="space-y-3">
            <span class="font-sans text-xs font-bold tracking-widest uppercase text-(--color-on-surface-variant)">
              Min Guests &mdash; <span class="text-(--color-on-surface)">{{ filterCapacity }}</span>
            </span>
            <input
              v-model.number="filterCapacity"
              type="range" min="1" max="6" step="1"
              class="w-full h-2 bg-(--color-surface-container-highest) rounded-full appearance-none cursor-pointer accent-(--color-primary)"
            />
          </div>
          <label class="flex items-center gap-3 cursor-pointer group">
            <input v-model="showAvailableOnly" type="checkbox" class="w-5 h-5 accent-(--color-primary)" />
            <span class="font-sans text-sm text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">Available only</span>
          </label>
        </div>

        <!-- Filter / Clear -->
        <button
          class="w-full bg-(--color-primary) text-white py-4 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest hover:bg-(--color-charcoal) transition-all shadow-lg"
          @click="resetFilters"
        >
          Clear Filters
        </button>

        <!-- Other Products -->
        <div class="space-y-6">
          <div class="bg-(--color-surface-container-lowest) py-4 rounded-xl text-center shadow-sm">
            <h4 class="font-sans text-xs font-bold text-(--color-on-surface) uppercase tracking-widest">Other Products</h4>
          </div>
          <div class="space-y-2">
            <RouterLink
              v-for="prod in otherProducts" :key="prod.label"
              :to="prod.to"
              class="flex gap-4 items-center p-2 hover:bg-(--color-surface-container-lowest) rounded-xl transition-colors group"
            >
              <div class="w-16 h-16 bg-(--color-surface-container-high) rounded-lg flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-2xl text-(--color-primary)">{{ prod.icon }}</span>
              </div>
              <div class="flex-grow">
                <h5 class="font-sans text-sm font-semibold text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">{{ prod.label }}</h5>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ prod.desc }}</p>
              </div>
              <span class="material-symbols-outlined text-base text-(--color-outline) group-hover:text-(--color-primary) transition-colors">arrow_forward</span>
            </RouterLink>
          </div>
        </div>
      </aside>

    </div>
  </div>
</template>

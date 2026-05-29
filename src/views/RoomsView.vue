<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useScrollReveal } from '@/composables/useScrollReveal'
import { useLodgesStore } from '@/stores/lodges'
import RoomCard from '@/components/rooms/RoomCard.vue'
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

const availableBranches = computed(() =>
  filterLodge.value ? lodgesStore.branchesFor(filterLodge.value) : []
)

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

const filtered = computed(() =>
  rooms.value.filter(r => {
    if (filterType.value !== 'All' && r.type !== filterType.value) return false
    if (r.capacity < filterCapacity.value) return false
    if (r.price > filterMaxPrice.value)    return false
    if (showAvailableOnly.value && !r.available) return false
    return true
  })
)

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
  fetchRooms(1)
}
</script>

<template>
  <div class="max-w-[1280px] mx-auto px-5 md:px-16 pt-8 pb-4 flex flex-col md:flex-row gap-6">

    <!-- Left Sidebar: Filters -->
    <aside class="w-full md:w-64 shrink-0">
      <div class="sticky top-28 flex flex-col gap-8">
        <h2 class="font-serif text-2xl text-(--color-on-surface)">Filters</h2>

        <!-- Lodge filter -->
        <div class="flex flex-col gap-2">
          <span class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">Lodge</span>
          <select
            v-model="filterLodge"
            class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all cursor-pointer"
          >
            <option value="">All Lodges</option>
            <option v-for="l in lodgesStore.lodges" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </div>

        <!-- Branch filter -->
        <div v-if="availableBranches.length" class="flex flex-col gap-2">
          <span class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">Branch</span>
          <select
            v-model="filterBranch"
            class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all cursor-pointer"
          >
            <option value="">All Branches</option>
            <option v-for="b in availableBranches" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>

        <div class="h-px bg-(--color-outline-variant)"></div>

        <!-- Price Range -->
        <div class="flex flex-col gap-3">
          <span class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">Price Range</span>
          <input
            v-model.number="filterMaxPrice"
            type="range" min="100" :max="priceSliderMax" step="10"
            class="w-full h-1 bg-(--color-surface-container-highest) rounded-lg appearance-none cursor-pointer accent-(--color-primary)"
          />
          <div class="flex justify-between font-sans text-xs text-(--color-on-surface-variant)">
            <span>K100</span>
            <span>K{{ filterMaxPrice.toLocaleString() }}/night</span>
          </div>
        </div>

        <div class="h-px bg-(--color-outline-variant)"></div>

        <!-- Lodge Type -->
        <div class="flex flex-col gap-3">
          <span class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">Lodge Type</span>
          <div class="flex flex-col gap-2">
            <label
              v-for="t in TYPES"
              :key="t"
              class="flex items-center gap-3 cursor-pointer group"
            >
              <input
                v-model="filterType"
                :value="t"
                type="radio"
                class="w-4 h-4 rounded-full border-(--color-outline) text-(--color-primary) focus:ring-(--color-primary)"
              />
              <span class="font-sans text-sm text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">
                {{ t }}
              </span>
            </label>
          </div>
        </div>

        <div class="h-px bg-(--color-outline-variant)"></div>

        <!-- Min Guests -->
        <div class="flex flex-col gap-3">
          <span class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
            Min Guests &mdash; <span class="text-(--color-on-surface)">{{ filterCapacity }}</span>
          </span>
          <input
            v-model.number="filterCapacity"
            type="range" min="1" max="6" step="1"
            class="w-full h-1 bg-(--color-surface-container-highest) rounded-lg appearance-none cursor-pointer accent-(--color-primary)"
          />
          <div class="flex justify-between font-sans text-xs text-(--color-on-surface-variant)">
            <span>1</span><span>6</span>
          </div>
        </div>

        <div class="h-px bg-(--color-outline-variant)"></div>

        <!-- Available only -->
        <label class="flex items-center gap-3 cursor-pointer group">
          <input
            v-model="showAvailableOnly"
            type="checkbox"
            class="w-5 h-5 rounded border-(--color-outline) text-(--color-primary) focus:ring-(--color-primary)"
          />
          <span class="font-sans text-sm text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">
            Available only
          </span>
        </label>

        <button
          class="w-full mt-2 bg-(--color-surface-container-high) text-(--color-on-surface-variant) py-3 rounded-lg font-sans text-sm font-semibold tracking-[0.05em] hover:bg-(--color-surface-container-highest) transition-colors"
          @click="resetFilters"
        >
          Clear All Filters
        </button>
      </div>
    </aside>

    <!-- Right: Results -->
    <section class="flex-1 flex flex-col">
      <!-- Header row -->
      <div class="flex flex-col md:flex-row justify-between items-baseline mb-8 gap-4">
        <div>
          <h1 class="font-serif text-[32px] font-semibold leading-10 text-(--color-on-surface)">Available Lodges</h1>
          <p class="font-sans text-sm text-(--color-on-surface-variant)">
            Showing {{ resultLabel }} in Southern Africa
          </p>
        </div>
      </div>

      <!-- Content area with fixed min height -->
      <div class="flex-1 min-h-[600px] flex flex-col">
        <!-- Loading skeleton -->
        <div v-if="apiLoading" class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div
            v-for="n in 4"
            :key="n"
            class="rounded-xl bg-(--color-surface-container-lowest) border border-(--color-savannah-mist) overflow-hidden animate-pulse"
          >
            <div class="h-64 bg-(--color-surface-container-high)"></div>
            <div class="p-6 space-y-3">
              <div class="h-4 bg-(--color-surface-container-high) rounded max-w-48"></div>
              <div class="h-3 bg-(--color-surface-container-high) rounded max-w-32"></div>
            </div>
          </div>
        </div>

        <!-- API error -->
        <div v-else-if="apiError" class="flex-1 flex flex-col items-center justify-center py-24 text-center">
          <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-4">error</span>
          <p class="font-serif text-xl text-(--color-on-surface) mb-2">Something went wrong</p>
          <p class="font-sans text-sm text-(--color-on-surface-variant)">{{ apiError }}</p>
        </div>

        <template v-else>
          <!-- Room grid -->
          <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" mode="out-in">
            <div v-if="filtered.length" class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <RoomCard
                v-for="(room, i) in filtered"
                :key="room.id"
                :room="room"
                :index="i"
              />
            </div>

            <!-- Empty state -->
            <div v-else class="flex-1 flex flex-col items-center justify-center py-24 text-center">
              <span class="material-symbols-outlined text-4xl text-(--color-on-surface-variant) block mb-4">search_off</span>
              <p class="font-serif text-xl text-(--color-on-surface) mb-2">No lodges match your filters</p>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Try adjusting the type, capacity, or price range.</p>
              <button
                class="font-sans text-sm text-(--color-primary) hover:underline"
                @click="resetFilters"
              >
                Clear all filters
              </button>
            </div>
          </Transition>

          <!-- Pagination -->
          <div class="flex items-center justify-center gap-2 mt-10 mb-2">
            <button
              :disabled="page <= 1 || apiLoading"
              class="w-9 h-9 flex items-center justify-center rounded-full border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              @click="fetchRooms(page - 1)"
            >
              <span class="material-symbols-outlined text-base">chevron_left</span>
            </button>

            <button
              v-for="p in totalPages" :key="p"
              :class="p === page
                ? 'bg-(--color-primary) text-white border-transparent'
                : 'border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container)'"
              class="w-9 h-9 flex items-center justify-center rounded-full border font-sans text-sm font-medium transition-colors"
              @click="fetchRooms(p)"
            >
              {{ p }}
            </button>

            <button
              :disabled="page >= totalPages || apiLoading"
              class="w-9 h-9 flex items-center justify-center rounded-full border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              @click="fetchRooms(page + 1)"
            >
              <span class="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </template>
      </div>
    </section>

  </div>
</template>

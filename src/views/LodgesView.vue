<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useLodges } from '@/composables/useRooms'

const { lodges, total, loading, error, fetchLodges } = useLodges()

const PAGE_SIZE    = 9
const page         = ref(1)
const totalPages   = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const search       = ref('')
const initialLoad  = ref(true)
const searching    = ref(false)

async function load(p = 1, isSearch = false) {
  page.value = p
  if (isSearch) searching.value = true
  const params = { page: p, page_size: PAGE_SIZE }
  if (search.value.trim()) params.search = search.value.trim()
  await fetchLodges(params)
  searching.value = false
  initialLoad.value = false
}

let searchDebounce = null
watch(search, () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => load(1, true), 400)
})

onMounted(() => load(1))

const filtered = computed(() => lodges.value)

// "Other Products" — real nav links
const otherProducts = [
  { label: 'Rooms',  desc: 'Accommodation & suites',    icon: 'bed',          to: '/rooms' },
  { label: 'Venues', desc: 'Event & conference spaces', icon: 'meeting_room', to: '/venues' },
]
</script>

<template>
  <div class="max-w-[1280px] mx-auto px-5 md:px-16 pt-10 pb-6">

    <!-- Header -->
    <div class="mb-12">
      <span class="font-sans text-xs font-bold tracking-[0.2em] uppercase text-(--color-primary) block mb-3">Curated Destinations</span>
      <h1 class="font-serif text-[40px] leading-none font-bold text-(--color-on-surface)">Our Lodges</h1>
      <p class="font-sans text-sm text-(--color-on-surface-variant) mt-3">
        <template v-if="!loading">
          {{ filtered.length }} {{ filtered.length === 1 ? 'lodge' : 'lodges' }} available
        </template>
        <template v-else>Loading lodges…</template>
      </p>
    </div>

    <div class="flex flex-col md:flex-row gap-10 items-start">

      <!-- ── Left: Lodge grid (75%) ────────────────────────────────────────── -->
      <div class="w-full md:w-3/4 min-h-[600px] flex flex-col">

      <!-- Error -->
      <div v-if="error" class="py-16 text-center bg-(--color-error-container) rounded-2xl mb-6">
        <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-3">wifi_off</span>
        <p class="font-sans text-sm text-(--color-on-error-container) mb-4">{{ error }}</p>
        <button class="font-sans text-sm font-semibold text-(--color-error) hover:underline" @click="load(page)">
          Retry
        </button>
      </div>

      <!-- Skeleton loader (initial load only) -->
      <div v-else-if="loading && initialLoad" class="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div
          v-for="i in 6"
          :key="i"
          class="h-[500px] rounded-[2rem] bg-(--color-surface-container-high) overflow-hidden animate-pulse"
        ></div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="filtered.length === 0"
        class="flex-1 flex flex-col items-center justify-center py-24 text-center bg-(--color-surface-container-lowest) rounded-2xl"
      >
        <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">search_off</span>
        <p class="font-serif text-xl text-(--color-on-surface) mb-2">No lodges found</p>
        <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Try a different search term.</p>
        <button class="font-sans text-sm font-semibold text-(--color-primary) hover:underline" @click="search = ''">
          Clear search
        </button>
      </div>

      <!-- Lodge cards -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <RouterLink
          v-for="lodge in filtered"
          :key="lodge.id"
          :to="`/lodges/${lodge.id}`"
          class="group relative h-[500px] rounded-[2rem] overflow-hidden shadow-xl block"
        >
          <!-- Cover image -->
          <img
            v-if="lodge.logo_url"
            :src="lodge.logo_url"
            :alt="lodge.name"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div
            v-else
            class="absolute inset-0 bg-(--color-surface-container-high) flex flex-col items-center justify-center gap-3"
          >
            <span class="material-symbols-outlined text-6xl text-(--color-outline)">holiday_village</span>
          </div>

          <!-- Locations badge -->
          <div
            v-if="lodge.branches?.length > 1"
            class="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 bg-(--color-charcoal) text-white px-4 py-1.5 rounded-full font-sans text-xs font-semibold uppercase tracking-widest shadow-lg"
          >
            <span class="material-symbols-outlined text-sm">location_city</span>
            {{ lodge.branches.length }} Locations
          </div>

          <!-- Frosted info panel -->
          <div class="absolute inset-x-0 bottom-0 z-10 bg-(--color-surface-container-lowest)/90 backdrop-blur-sm p-6 border-t border-white/20">
            <h3 class="font-serif text-xl font-semibold text-(--color-on-surface) leading-tight mb-3">{{ lodge.name }}</h3>

            <p v-if="lodge.address" class="flex items-center gap-1.5 font-sans text-sm text-(--color-on-surface-variant) mb-1.5">
              <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0">location_on</span>
              <span class="truncate">{{ lodge.address }}</span>
            </p>
            <p v-if="lodge.email" class="flex items-center gap-1.5 font-sans text-sm text-(--color-on-surface-variant) mb-5">
              <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0">mail</span>
              <span class="truncate">{{ lodge.email }}</span>
            </p>

            <div class="flex items-center justify-end">
              <span class="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-(--color-primary) group-hover:text-(--color-charcoal) transition-colors">
                View Services <span class="material-symbols-outlined text-base">arrow_forward</span>
              </span>
            </div>
          </div>
        </RouterLink>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-14">
        <button
          :disabled="page <= 1 || loading"
          class="w-12 h-12 rounded-2xl border border-(--color-outline-variant) flex items-center justify-center text-(--color-on-surface) hover:bg-(--color-primary) hover:text-white hover:border-(--color-primary) disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-(--color-on-surface) transition-all"
          @click="load(page - 1)"
        >
          <span class="material-symbols-outlined">chevron_left</span>
        </button>

        <button
          v-for="p in totalPages" :key="p"
          :class="p === page
            ? 'bg-(--color-primary) text-white shadow-lg'
            : 'border border-transparent text-(--color-on-surface) hover:border-(--color-outline-variant) hover:text-(--color-primary)'"
          class="w-12 h-12 rounded-2xl flex items-center justify-center font-sans text-sm font-semibold transition-all"
          @click="load(p)"
        >
          {{ p }}
        </button>

        <button
          :disabled="page >= totalPages || loading"
          class="w-12 h-12 rounded-2xl border border-(--color-outline-variant) flex items-center justify-center text-(--color-on-surface) hover:bg-(--color-primary) hover:text-white hover:border-(--color-primary) disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-(--color-on-surface) transition-all"
          @click="load(page + 1)"
        >
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      </div><!-- /left column -->

      <!-- ── Right: Sidebar filter (25%) ───────────────────────────────────── -->
      <aside class="w-full md:w-1/4 bg-(--color-surface-container-low) p-8 rounded-[2rem] space-y-8 md:sticky md:top-24">

        <!-- Search -->
        <div class="flex gap-2">
          <div class="relative flex-1">
            <span v-if="searching"
              class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-(--color-primary) text-base animate-spin">progress_activity</span>
            <input
              v-model="search"
              type="text"
              placeholder="Search lodges..."
              class="w-full bg-(--color-surface-container-lowest) border border-(--color-outline-variant) rounded-2xl px-4 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-outline) focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-(--color-primary) transition-all"
            />
          </div>
          <button v-if="search"
            type="button"
            class="bg-(--color-primary) text-white px-4 rounded-2xl font-sans text-xs font-bold uppercase tracking-wider hover:bg-(--color-charcoal) transition-all shrink-0"
            @click="search = ''">
            Clear
          </button>
        </div>

        <!-- Filter by location (static — wiring added later) -->
        <div class="space-y-6">
          <div class="bg-(--color-surface-container-lowest) py-4 rounded-2xl text-center shadow-sm">
            <h4 class="font-sans text-xs font-bold text-(--color-on-surface) uppercase tracking-widest">Filter by Location</h4>
          </div>
          <select
            class="w-full bg-(--color-surface-container-lowest) border border-(--color-outline-variant) rounded-2xl px-4 py-3 font-sans text-sm text-(--color-on-surface) focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-(--color-primary) transition-all cursor-pointer">
            <option value="">All Regions</option>
            <option value="southern">Southern Africa</option>
          </select>
          <button
            class="w-full bg-(--color-primary) text-white py-4 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest hover:bg-(--color-charcoal) transition-all shadow-lg">
            Filter
          </button>
        </div>

        <!-- Other Products -->
        <div class="space-y-6">
          <div class="bg-(--color-surface-container-lowest) py-4 rounded-2xl text-center shadow-sm">
            <h4 class="font-sans text-xs font-bold text-(--color-on-surface) uppercase tracking-widest">Other Products</h4>
          </div>
          <div class="space-y-2">
            <RouterLink
              v-for="prod in otherProducts" :key="prod.label"
              :to="prod.to"
              class="flex gap-4 items-center p-2 hover:bg-(--color-surface-container-lowest) rounded-2xl transition-colors group">
              <div class="w-16 h-16 bg-(--color-surface-container-high) rounded-2xl flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-2xl text-(--color-primary)">{{ prod.icon }}</span>
              </div>
              <div class="grow">
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

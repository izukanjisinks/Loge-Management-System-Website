<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { lodges } from '@/data/lodges'

const search   = ref('')
const region   = ref('All')
const type     = ref('All')
const maxPrice = ref(5000)

const regions = ['All', 'East Africa', 'Southern Africa']
const types   = ['All', 'Safari Lodge', 'Mountain Retreat', 'Beach Lodge', 'Tented Camp', 'Rift Valley Lodge', 'Delta Camp']

const filtered = computed(() => lodges.filter(l => {
  if (search.value && !l.name.toLowerCase().includes(search.value.toLowerCase()) &&
      !l.location.toLowerCase().includes(search.value.toLowerCase())) return false
  if (region.value !== 'All' && l.region !== region.value) return false
  if (type.value !== 'All' && l.type !== type.value) return false
  if (l.priceFrom > maxPrice.value) return false
  return true
}))

function clearFilters() {
  search.value   = ''
  region.value   = 'All'
  type.value     = 'All'
  maxPrice.value = 5000
}
</script>

<template>
  <div class="max-w-[1280px] mx-auto px-5 md:px-16 py-10">
    <div class="flex gap-10 items-start">

      <!-- ── Sidebar Filters ───────────────────────────────────────── -->
      <aside class="hidden lg:flex flex-col w-64 shrink-0 gap-6 sticky top-24">
        <div>
          <h2 class="font-serif text-xl text-(--color-on-surface) mb-4">Filters</h2>

          <!-- Search -->
          <div class="relative mb-5">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-(--color-outline) text-base">search</span>
            <input
              v-model="search"
              type="text"
              placeholder="Search lodges…"
              class="w-full bg-(--color-savannah-mist) border-none rounded-lg pl-9 pr-3 py-2.5 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-outline) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20"
            />
          </div>

          <!-- Price range -->
          <div class="mb-5">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-3">Price Range</p>
            <input
              v-model="maxPrice"
              type="range"
              min="500"
              max="5000"
              step="50"
              class="w-full accent-(--color-primary)"
            />
            <div class="flex justify-between font-sans text-xs text-(--color-on-surface-variant) mt-1">
              <span>K500</span>
              <span class="font-semibold text-(--color-primary)">K{{ maxPrice.toLocaleString() }}</span>
            </div>
          </div>

          <!-- Region -->
          <div class="mb-5">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-3">Region</p>
            <div class="flex flex-col gap-2">
              <label v-for="r in regions" :key="r" class="flex items-center gap-2 font-sans text-sm text-(--color-on-surface) cursor-pointer">
                <input v-model="region" type="radio" :value="r" class="accent-(--color-primary)" />
                {{ r }}
              </label>
            </div>
          </div>

          <!-- Lodge type -->
          <div class="mb-5">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-3">Lodge Type</p>
            <div class="flex flex-col gap-2">
              <label v-for="t in types" :key="t" class="flex items-center gap-2 font-sans text-sm text-(--color-on-surface) cursor-pointer">
                <input v-model="type" type="radio" :value="t" class="accent-(--color-primary)" />
                {{ t }}
              </label>
            </div>
          </div>

          <button
            class="w-full font-sans text-sm font-semibold text-(--color-primary) border-2 border-(--color-primary) py-2 rounded-full hover:bg-(--color-primary) hover:text-white transition-all"
            @click="clearFilters"
          >
            Clear All Filters
          </button>
        </div>
      </aside>

      <!-- ── Results ───────────────────────────────────────────────── -->
      <div class="flex-1 min-w-0">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 mb-8">
          <div>
            <span class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-primary) block mb-1">Explore</span>
            <h1 class="font-serif text-[32px] font-semibold leading-10 text-(--color-on-surface)">Available Lodges</h1>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1">
              Showing {{ filtered.length }} {{ filtered.length === 1 ? 'property' : 'properties' }} across Southern &amp; East Africa
            </p>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="filtered.length === 0"
          class="py-24 text-center bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant)"
        >
          <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">search_off</span>
          <p class="font-serif text-xl text-(--color-on-surface) mb-2">No lodges found</p>
          <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Try adjusting your filters.</p>
          <button
            class="font-sans text-sm font-semibold text-(--color-primary) hover:underline"
            @click="clearFilters"
          >
            Clear filters
          </button>
        </div>

        <!-- Lodge cards grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RouterLink
            v-for="lodge in filtered"
            :key="lodge.id"
            :to="`/lodges/${lodge.id}`"
            class="group block bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <!-- Image -->
            <div class="relative h-56 overflow-hidden">
              <img
                :src="lodge.images[0]"
                :alt="lodge.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div class="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
              <!-- Rating badge -->
              <div class="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                <span class="material-symbols-outlined text-sm text-amber-500" style="font-variation-settings:'FILL' 1">star</span>
                <span class="font-sans text-xs font-bold text-(--color-on-surface)">{{ lodge.rating }}.0</span>
                <span class="font-sans text-xs text-(--color-on-surface-variant)">({{ lodge.reviews }})</span>
              </div>
              <!-- Type chip -->
              <div class="absolute bottom-3 left-3">
                <span class="font-sans text-xs font-semibold bg-(--color-primary) text-white px-2.5 py-1 rounded-full">
                  {{ lodge.type }}
                </span>
              </div>
            </div>

            <!-- Content -->
            <div class="p-5">
              <div class="flex items-start justify-between gap-2 mb-2">
                <h3 class="font-serif text-xl text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">{{ lodge.name }}</h3>
              </div>
              <p class="flex items-center gap-1.5 font-sans text-sm text-(--color-on-surface-variant) mb-3">
                <span class="material-symbols-outlined text-base text-(--color-primary)">location_on</span>
                {{ lodge.location }}
              </p>
              <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed line-clamp-2 mb-4">
                {{ lodge.tagline }}
              </p>

              <!-- Amenity chips -->
              <div class="flex flex-wrap gap-1.5 mb-4">
                <span
                  v-for="a in lodge.amenities.slice(0, 4)"
                  :key="a.label"
                  class="flex items-center gap-1 bg-(--color-savannah-mist) text-(--color-on-surface-variant) px-2 py-0.5 rounded font-sans text-xs"
                >
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">{{ a.icon }}</span>
                  {{ a.label }}
                </span>
              </div>

              <div class="flex items-center justify-between pt-4 border-t border-(--color-outline-variant)">
                <div>
                  <span class="font-sans text-xs text-(--color-on-surface-variant)">From</span>
                  <p class="font-serif text-2xl text-(--color-primary)">K{{ lodge.priceFrom.toLocaleString() }}</p>
                  <span class="font-sans text-xs text-(--color-on-surface-variant)">per night</span>
                </div>
                <span class="inline-flex items-center gap-1 bg-(--color-primary) text-white px-5 py-2 rounded-full font-sans text-sm font-semibold group-hover:bg-(--color-primary-container) transition-colors">
                  View Details
                  <span class="material-symbols-outlined text-base">arrow_forward</span>
                </span>
              </div>
            </div>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

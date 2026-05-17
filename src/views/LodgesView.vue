<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useLodges } from '@/composables/useRooms'

const { lodges, total, loading, error, fetchLodges } = useLodges()

const PAGE_SIZE  = 9
const page       = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const search     = ref('')

async function load(p = 1) {
  page.value = p
  const params = { page: p, page_size: PAGE_SIZE }
  if (search.value.trim()) params.search = search.value.trim()
  await fetchLodges(params)
}

let searchDebounce = null
watch(search, () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => load(1), 400)
})

onMounted(() => load(1))

const filtered = computed(() => lodges.value)


</script>

<template>
  <div class="max-w-[1280px] mx-auto px-5 md:px-16 pt-10 pb-6">

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
      <div>
        <span class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-primary) block mb-1">Explore</span>
        <h1 class="font-serif text-[32px] font-semibold leading-10 text-(--color-on-surface)">Our Lodges</h1>
        <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1">
          <template v-if="!loading">
            {{ filtered.length }} {{ filtered.length === 1 ? 'lodge' : 'lodges' }} available
          </template>
          <template v-else>Loading lodges…</template>
        </p>
      </div>

      <!-- Search -->
      <div class="relative w-full md:w-72">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-(--color-outline) text-base">search</span>
        <input
          v-model="search"
          type="text"
          placeholder="Search by name or location…"
          class="w-full bg-(--color-savannah-mist) border-none rounded-full pl-9 pr-4 py-2.5 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-outline) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20"
        />
      </div>
    </div>

    <!-- Content area with fixed min height -->
    <div class="min-h-[600px] flex flex-col">

      <!-- Error -->
      <div v-if="error" class="py-16 text-center bg-(--color-error-container) rounded-2xl mb-6">
        <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-3">wifi_off</span>
        <p class="font-sans text-sm text-(--color-on-error-container) mb-4">{{ error }}</p>
        <button class="font-sans text-sm font-semibold text-(--color-error) hover:underline" @click="load(page)">
          Retry
        </button>
      </div>

      <!-- Skeleton loader -->
      <div v-else-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="i in 9"
          :key="i"
          class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden animate-pulse"
        >
          <div class="h-52 bg-(--color-surface-container-highest)" />
          <div class="p-5 space-y-3">
            <div class="h-4 bg-(--color-surface-container-highest) rounded w-3/4" />
            <div class="h-3 bg-(--color-surface-container-highest) rounded w-1/2" />
            <div class="h-3 bg-(--color-surface-container-highest) rounded w-full" />
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="filtered.length === 0"
        class="flex-1 flex flex-col items-center justify-center py-24 text-center bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant)"
      >
        <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">search_off</span>
        <p class="font-serif text-xl text-(--color-on-surface) mb-2">No lodges found</p>
        <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Try a different search term.</p>
        <button class="font-sans text-sm font-semibold text-(--color-primary) hover:underline" @click="search = ''">
          Clear search
        </button>
      </div>

      <!-- Lodge cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RouterLink
          v-for="(lodge, idx) in filtered"
          :key="lodge.id"
          :to="`/lodges/${lodge.id}`"
          class="group block bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <!-- Cover image -->
          <div class="relative h-52 overflow-hidden">
            <img
              v-if="lodge.logo_url"
              :src="lodge.logo_url"
              :alt="lodge.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div
              v-else
              class="w-full h-full bg-(--color-surface-container-high) flex flex-col items-center justify-center gap-3 group-hover:bg-(--color-surface-container-highest) transition-colors"
            >
              <span class="material-symbols-outlined text-5xl text-(--color-outline)">holiday_village</span>
              <span class="font-serif text-sm text-(--color-on-surface-variant)">{{ lodge.name }}</span>
            </div>
            <template v-if="lodge.logo_url">
              <div class="absolute inset-0 bg-linear-to-t from-black/55 to-transparent" />
              <!-- Active badge -->
              <div class="absolute top-3 right-3">
                <span class="bg-emerald-500/90 text-white font-sans text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                  Active
                </span>
              </div>
              <!-- Lodge name overlay -->
              <div class="absolute bottom-3 left-4 right-4">
                <h3 class="font-serif text-xl font-semibold text-white leading-tight group-hover:text-(--color-inverse-primary) transition-colors">
                  {{ lodge.name }}
                </h3>
              </div>
            </template>
            <template v-else>
              <!-- Active badge over placeholder -->
              <div class="absolute top-3 right-3">
                <span class="bg-emerald-500/90 text-white font-sans text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                  Active
                </span>
              </div>
            </template>
          </div>

          <!-- Content -->
          <div class="p-5">
            <p v-if="lodge.address" class="flex items-center gap-1.5 font-sans text-sm text-(--color-on-surface-variant) mb-3">
              <span class="material-symbols-outlined text-base text-(--color-primary)">location_on</span>
              {{ lodge.address }}
            </p>

            <p v-if="lodge.email" class="flex items-center gap-1.5 font-sans text-sm text-(--color-on-surface-variant) mb-4">
              <span class="material-symbols-outlined text-base text-(--color-primary)">mail</span>
              {{ lodge.email }}
            </p>

            <div class="flex items-center justify-end pt-4 border-t border-(--color-outline-variant)">
              <span class="inline-flex items-center gap-1 bg-(--color-primary) text-white px-5 py-2 rounded-full font-sans text-sm font-semibold group-hover:bg-(--color-primary-container) transition-colors">
                View Rooms
                <span class="material-symbols-outlined text-base">arrow_forward</span>
              </span>
            </div>
          </div>
        </RouterLink>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-center gap-2 mt-10 mb-2">
        <button
          :disabled="page <= 1 || loading"
          class="w-9 h-9 flex items-center justify-center rounded-full border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          @click="load(page - 1)"
        >
          <span class="material-symbols-outlined text-base">chevron_left</span>
        </button>

        <button
          v-for="p in totalPages" :key="p"
          :class="p === page
            ? 'bg-(--color-primary) text-white border-transparent'
            : 'border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container)'"
          class="w-9 h-9 flex items-center justify-center rounded-full border font-sans text-sm font-medium transition-colors"
          @click="load(p)"
        >
          {{ p }}
        </button>

        <button
          :disabled="page >= totalPages || loading"
          class="w-9 h-9 flex items-center justify-center rounded-full border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          @click="load(page + 1)"
        >
          <span class="material-symbols-outlined text-base">chevron_right</span>
        </button>
      </div>

    </div>
  </div>
</template>

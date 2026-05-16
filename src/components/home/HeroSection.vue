<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function search() {
  router.push({ name: 'lodges' })
}
</script>

<template>
  <section class="relative min-h-150 h-[calc(100vh-64px)] max-h-217.5 w-full overflow-hidden">
    <!-- Background Image -->
    <div class="absolute inset-0 z-0">
      <img
        src="https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1600&q=80"
        alt="Luxury African safari lodge at dusk"
        class="w-full h-full object-cover"
        loading="eager"
        fetchpriority="high"
      />
      <div class="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent"></div>
    </div>

    <!-- Hero Content -->
    <div class="relative z-10 flex flex-col items-center justify-center h-full px-5 text-center text-white">
      <h1 class="font-serif text-5xl md:text-[48px] font-bold leading-[1.17] tracking-[-0.02em] mb-4 max-w-3xl">
        An Unrivaled Arrival into the Soul of the Continent.
      </h1>
      <p class="font-sans text-lg leading-7 mb-8 max-w-xl opacity-90">
        Experience modern African hospitality where luxury meets the grounded warmth of the landscape.
      </p>

      <!-- Search Bar -->
      <div class="w-full max-w-4xl bg-(--color-surface) p-2 rounded-2xl shadow-lg flex flex-col md:flex-row items-center gap-2">
        <div class="flex-1 w-full flex items-center px-4 py-3 gap-3 border-b md:border-b-0 md:border-r border-(--color-outline-variant)">
          <span class="material-symbols-outlined text-(--color-primary)">location_on</span>
          <input
            class="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-(--color-on-surface) font-sans text-base placeholder:text-(--color-on-surface-variant)"
            placeholder="Where would you like to explore?"
            type="text"
          />
        </div>
        <div class="flex-1 w-full flex items-center px-4 py-3 gap-3 border-b md:border-b-0 md:border-r border-(--color-outline-variant)">
          <span class="material-symbols-outlined text-(--color-primary)">calendar_today</span>
          <input
            class="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-(--color-on-surface) font-sans text-base placeholder:text-(--color-on-surface-variant)"
            placeholder="Check-in  Check-out"
            type="text"
          />
        </div>
        <button
          class="w-full md:w-auto bg-(--color-clay-earth) text-white px-8 py-4 rounded-xl text-sm font-sans font-semibold tracking-[0.05em] hover:bg-(--color-primary) transition-colors flex items-center justify-center gap-2"
          @click="search"
        >
          <span class="material-symbols-outlined">search</span>
          Search Lodges
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps({
  rooms: {
    type: Array,
    required: true,
    // [{ id, name, type, price, rating, reviews, image, location }]
  },
})
</script>

<template>
  <!-- Bento-style grid matching design spec -->
  <div class="grid grid-cols-1 md:grid-cols-12 gap-6">

    <!-- Large Card -->
    <RouterLink
      v-if="rooms[0]"
      :to="`/rooms/${rooms[0].id}`"
      class="md:col-span-8 group cursor-pointer reveal"
    >
      <div class="relative h-125 rounded-2xl overflow-hidden mb-4 shadow-sm transition-shadow hover:shadow-lg">
        <img
          :src="rooms[0].image"
          :alt="rooms[0].name"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div class="absolute top-4 left-4 bg-(--color-surface)/90 backdrop-blur-md px-3 py-1 rounded-full text-(--color-primary) text-xs font-sans font-semibold">
          Limited Availability
        </div>
      </div>
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-serif text-2xl text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">{{ rooms[0].name }}</h3>
          <div class="flex items-center gap-1 text-(--color-on-surface-variant) font-sans text-base mt-1">
            <span class="material-symbols-outlined text-[18px]">location_on</span>
            {{ rooms[0].location }}
          </div>
        </div>
        <div class="text-right">
          <span class="font-sans text-xs text-(--color-on-surface-variant) block uppercase tracking-tight">Starting from</span>
          <span class="font-serif text-2xl text-(--color-primary)">
            K{{ rooms[0].price.toLocaleString() }}
            <small class="font-sans text-base font-normal text-(--color-on-surface-variant)">/ night</small>
          </span>
        </div>
      </div>
    </RouterLink>

    <!-- Small Card 1 -->
    <RouterLink
      v-if="rooms[1]"
      :to="`/rooms/${rooms[1].id}`"
      class="md:col-span-4 group cursor-pointer reveal"
      style="transition-delay: 100ms"
    >
      <div class="relative h-80 md:h-125 rounded-2xl overflow-hidden mb-4 shadow-sm transition-shadow hover:shadow-lg">
        <img
          :src="rooms[1].image"
          :alt="rooms[1].name"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <h3 class="font-serif text-2xl text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">{{ rooms[1].name }}</h3>
      <div class="flex items-center gap-1 text-(--color-on-surface-variant) font-sans text-base mt-1">
        <span class="material-symbols-outlined text-[18px]">location_on</span>
        {{ rooms[1].location }}
      </div>
      <div class="mt-2 font-serif text-2xl text-(--color-primary)">
        K{{ rooms[1].price.toLocaleString() }}
        <small class="font-sans text-base font-normal text-(--color-on-surface-variant)">/ night</small>
      </div>
    </RouterLink>

    <!-- Small Card 2 -->
    <RouterLink
      v-if="rooms[2]"
      :to="`/rooms/${rooms[2].id}`"
      class="md:col-span-4 group cursor-pointer reveal"
      style="transition-delay: 150ms"
    >
      <div class="relative h-100 rounded-2xl overflow-hidden mb-4 shadow-sm transition-shadow hover:shadow-lg">
        <img
          :src="rooms[2].image"
          :alt="rooms[2].name"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <h3 class="font-serif text-2xl text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">{{ rooms[2].name }}</h3>
      <div class="flex items-center gap-1 text-(--color-on-surface-variant) font-sans text-base mt-1">
        <span class="material-symbols-outlined text-[18px]">location_on</span>
        {{ rooms[2].location }}
      </div>
      <div class="mt-2 font-serif text-2xl text-(--color-primary)">
        K{{ rooms[2].price.toLocaleString() }}
        <small class="font-sans text-base font-normal text-(--color-on-surface-variant)">/ night</small>
      </div>
    </RouterLink>

    <!-- Wide horizontal card if 4+ rooms -->
    <RouterLink
      v-if="rooms[3]"
      :to="`/rooms/${rooms[3].id}`"
      class="md:col-span-8 group cursor-pointer bg-(--color-savannah-mist) rounded-2xl overflow-hidden flex flex-col md:flex-row reveal"
      style="transition-delay: 200ms"
    >
      <div class="md:w-[50%] h-64 md:h-full">
        <img
          :src="rooms[3].image"
          :alt="rooms[3].name"
          class="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div class="md:w-[50%] p-10 flex flex-col justify-center">
        <span class="text-(--color-clay-earth) font-sans text-sm font-semibold tracking-[0.05em] mb-2">New Opening</span>
        <h3 class="font-serif text-2xl text-(--color-on-surface) mb-4">{{ rooms[3].name }}</h3>
        <p class="font-sans text-base text-(--color-on-surface-variant) mb-6 leading-relaxed">
          {{ rooms[3].location }} â€” a dramatic perspective of the landscape.
        </p>
        <div class="flex items-center justify-between mt-auto">
          <div class="font-serif text-2xl text-(--color-primary)">
            K{{ rooms[3].price.toLocaleString() }}
            <small class="font-sans text-base font-normal text-(--color-on-surface-variant)">/ night</small>
          </div>
          <span class="material-symbols-outlined text-(--color-primary) group-hover:translate-x-2 transition-transform">arrow_forward</span>
        </div>
      </div>
    </RouterLink>
  </div>
</template>

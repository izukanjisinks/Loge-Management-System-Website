<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  room: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    default: 0,
  },
})
</script>

<template>
  <RouterLink
    :to="`/rooms/${room.id}`"
    class="reveal block"
    :style="`transition-delay: ${index * 80}ms`"
  >
    <article
      class="bg-(--color-surface-container-lowest) rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 border border-(--color-savannah-mist) group"
    >
      <!-- Image -->
      <div class="relative h-64 overflow-hidden">
        <img
          v-if="room.image"
          :src="room.image"
          :alt="room.name"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />
        <div
          v-else
          class="w-full h-full bg-(--color-surface-container-high) flex flex-col items-center justify-center gap-3"
        >
          <span class="material-symbols-outlined text-5xl text-(--color-outline)">bed</span>
          <span class="font-serif text-sm text-(--color-on-surface-variant)">{{ room.name }}</span>
        </div>

        <!-- Unavailable overlay -->
        <div
          v-if="!room.available"
          class="absolute inset-0 bg-black/30 flex items-center justify-center"
        >
          <span class="font-sans font-bold text-sm tracking-widest uppercase text-white">
            Fully Booked
          </span>
        </div>

        <!-- Lodge badge -->
        <div
          v-if="room.orgName"
          class="absolute bottom-4 left-4 bg-(--color-clay-earth) text-white px-3 py-1 rounded-full font-sans text-xs font-semibold uppercase tracking-wider"
        >
          {{ room.orgName }}
        </div>
      </div>

      <!-- Info -->
      <div class="p-6 flex flex-col gap-3">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-serif text-2xl text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">
              {{ room.name }}
            </h3>
            <div class="flex items-center gap-1 text-(--color-on-surface-variant) mt-1">
              <span class="material-symbols-outlined text-[16px]">group</span>
              <span class="font-sans text-xs">Up to {{ room.capacity }} guests</span>
            </div>
          </div>
          <span
            class="font-sans text-xs font-semibold px-2 py-1 rounded"
            :class="room.available
              ? 'bg-(--color-tertiary-fixed) text-(--color-tertiary)'
              : 'bg-(--color-error-container) text-(--color-on-error-container)'"
          >
            {{ room.available ? 'Available' : 'Booked' }}
          </span>
        </div>

        <!-- Amenity chips -->
        <div v-if="room.amenities?.length" class="flex flex-wrap gap-2">
          <span
            v-for="a in room.amenities.slice(0, 3)"
            :key="a.icon"
            class="bg-(--color-savannah-mist) text-(--color-on-surface-variant) px-2 py-1 rounded font-sans text-xs"
          >
            {{ a.label }}
          </span>
          <span
            v-if="room.amenities.length > 3"
            class="font-sans text-xs text-(--color-on-surface-variant) self-center"
          >
            +{{ room.amenities.length - 3 }} more
          </span>
        </div>

        <!-- Price + CTA -->
        <div class="mt-2 flex items-center justify-between">
          <div>
            <span class="font-serif text-2xl text-(--color-primary)">K{{ room.price.toLocaleString() }}</span>
            <span class="font-sans text-sm text-(--color-on-surface-variant)"> / night</span>
          </div>
          <span
            class="bg-(--color-primary) text-white px-6 py-2 rounded-2xl font-sans text-sm font-semibold tracking-[0.05em] hover:bg-(--color-primary-container) transition-colors shadow-sm active:scale-95"
          >
            View Details
          </span>
        </div>
      </div>
    </article>
  </RouterLink>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'

defineProps({
  room: {
    type: Object,
    required: true,
    // { id, name, type, capacity, price, image, available, amenities[] }
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
    class="reveal group block"
    :style="`transition-delay: ${index * 80}ms`"
  >
    <div
      class="bg-[--color-surface-card] rounded-lg overflow-hidden transition-transform duration-700 ease-out hover:scale-[1.01]"
      style="box-shadow: var(--shadow-card);"
    >
      <!-- Image -->
      <div class="relative overflow-hidden aspect-[4/3]">
        <img
          :src="room.image"
          :alt="room.name"
          class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          loading="lazy"
        />

        <!-- Unavailable overlay -->
        <div
          v-if="!room.available"
          class="absolute inset-0 bg-[--color-on-surface]/40 flex items-center justify-center"
        >
          <span
            class="font-sans text-xs font-semibold px-3 py-1.5 rounded-lg
                   bg-[--color-on-surface]/80 text-white tracking-wide"
          >Fully Booked</span>
        </div>

        <!-- Capacity badge -->
        <span
          class="absolute bottom-3 left-3 flex items-center gap-1 font-sans text-xs font-medium
                 px-3 py-1 rounded-lg bg-[oklch(1_0_0/0.88)] backdrop-blur-sm text-[--color-on-surface]"
        >
          <span class="material-symbols-outlined text-sm">group</span>
          Up to {{ room.capacity }}
        </span>
      </div>

      <!-- Info -->
      <div class="p-5">
        <p class="font-sans text-xs font-semibold tracking-widest uppercase text-[--color-on-muted] mb-1">
          {{ room.type }}
        </p>
        <h2
          class="font-serif text-xl text-[--color-on-surface] group-hover:text-[--color-primary]
                 transition-colors duration-300 mb-4"
        >
          {{ room.name }}
        </h2>

        <!-- Quick amenity icons -->
        <div v-if="room.amenities?.length" class="flex gap-2 mb-4">
          <span
            v-for="a in room.amenities.slice(0, 4)"
            :key="a.icon"
            class="material-symbols-outlined text-[--color-on-muted] text-base"
            :title="a.label"
          >{{ a.icon }}</span>
          <span
            v-if="room.amenities.length > 4"
            class="font-sans text-xs text-[--color-on-muted] self-center"
          >+{{ room.amenities.length - 4 }}</span>
        </div>

        <div class="flex items-center justify-between">
          <p class="font-sans text-sm text-[--color-on-muted]">
            from
            <span class="font-semibold text-[--color-on-surface] text-base ml-1">${{ room.price }}</span>
            <span class="text-xs">/night</span>
          </p>
          <BaseButton
            v-if="room.available"
            variant="secondary"
            class="text-xs px-4 py-2 pointer-events-none"
          >
            View Room
          </BaseButton>
          <span v-else class="font-sans text-xs text-[--color-on-muted]">Unavailable</span>
        </div>
      </div>
    </div>
  </RouterLink>
</template>

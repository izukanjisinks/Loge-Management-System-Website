<script setup>
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
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
    <RouterLink
      v-for="(room, i) in rooms"
      :key="room.id"
      :to="`/rooms/${room.id}`"
      class="reveal group block"
      :style="`transition-delay: ${i * 120}ms`"
    >
      <!-- Image — 4:5 aspect with glassmorphic location badge -->
      <div class="relative aspect-[4/5] overflow-hidden rounded-xl mb-6">
        <img
          :src="room.image"
          :alt="room.name"
          class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          loading="lazy"
        />
        <div
          class="absolute top-4 left-4 bg-[--color-surface-card]/90 backdrop-blur-sm
                 px-3 py-1 rounded-lg font-sans text-[10px] font-bold tracking-widest uppercase
                 text-[--color-on-surface]"
        >
          {{ room.location }}
        </div>
      </div>

      <!-- Info row — name left, price right -->
      <div class="flex justify-between items-start gap-4">
        <div>
          <h3
            class="font-serif text-2xl text-[--color-on-surface] leading-tight mb-2
                   group-hover:text-[--color-primary] transition-colors duration-300"
          >
            {{ room.name }}
          </h3>

          <!-- Stars + review count -->
          <div class="flex items-center gap-2 text-[--color-on-muted] text-sm">
            <div class="flex">
              <span
                v-for="n in 5"
                :key="n"
                class="material-symbols-outlined text-[--color-primary] text-xs"
                :style="n <= room.rating
                  ? 'font-variation-settings: \'FILL\' 1'
                  : 'font-variation-settings: \'FILL\' 0'"
              >star</span>
            </div>
            <span v-if="room.reviews">({{ room.reviews }} Reviews)</span>
          </div>
        </div>

        <!-- Price -->
        <div class="text-right shrink-0">
          <span class="block font-serif text-xl text-[--color-on-surface]">K{{ room.price.toLocaleString() }}</span>
          <span class="font-sans text-[10px] uppercase tracking-tight text-[--color-on-muted] font-bold">
            Per Night
          </span>
        </div>
      </div>
    </RouterLink>
  </div>
</template>

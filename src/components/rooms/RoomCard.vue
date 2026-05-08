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
      class="bg-[#FAF9F6] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <!-- Image -->
      <div class="relative h-64">
        <img
          v-if="room.image"
          :src="room.image"
          :alt="room.name"
          class="w-full h-full object-cover"
          style="filter: grayscale(20%)"
          loading="lazy"
        />
        <div
          v-else
          class="w-full h-full bg-[--color-secondary] flex flex-col items-center justify-center gap-2"
        >
          <span class="material-symbols-outlined text-4xl text-[--color-outline]">image_not_supported</span>
          <span class="font-sans text-xs text-[--color-on-muted]">No image</span>
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

        <!-- Capacity badge -->
        <div
          class="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-md
                 flex items-center gap-2 shadow-sm"
        >
          <span class="material-symbols-outlined text-base text-[--color-on-muted]">group</span>
          <span class="font-sans text-xs font-bold text-[--color-on-surface]">Up to {{ room.capacity }}</span>
        </div>
      </div>

      <!-- Info -->
      <div class="p-6">
        <!-- Type row + lodge name -->
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="font-sans text-[10px] font-extrabold tracking-widest uppercase text-[--color-on-muted]">
              {{ room.type }}
            </p>
            <h3 class="font-serif text-xl text-[--color-on-surface] mt-1">{{ room.name }}</h3>
          </div>
          <div v-if="room.orgName" class="flex items-center gap-1.5 text-[--color-on-muted] shrink-0 ml-3">
            <span class="material-symbols-outlined text-base">apartment</span>
            <span class="font-sans text-[10px] font-bold uppercase tracking-tight">{{ room.orgName }}</span>
          </div>
        </div>

        <!-- Amenity icons -->
        <div v-if="room.amenities?.length" class="flex gap-4 my-4 opacity-70">
          <span
            v-for="a in room.amenities.slice(0, 4)"
            :key="a.icon"
            class="material-symbols-outlined text-xl text-[--color-on-surface]"
            :title="a.label"
          >{{ a.icon }}</span>
          <span
            v-if="room.amenities.length > 4"
            class="font-sans text-xs font-bold text-[--color-on-muted] self-center"
          >+{{ room.amenities.length - 4 }}</span>
        </div>

        <!-- Price + availability -->
        <div class="flex justify-between items-center mt-6 pt-4 border-t border-[--color-on-surface]/5">
          <p class="font-sans text-xs text-[--color-on-muted] font-medium">
            from
            <span class="text-lg font-bold text-[--color-on-surface] ml-1">K{{ room.price.toLocaleString() }}</span>
            /night
          </p>
          <span
            v-if="room.available"
            class="font-sans text-[10px] font-bold uppercase tracking-wide text-[--color-accent]"
          >
            Available
          </span>
          <span
            v-else
            class="font-sans text-[10px] font-bold uppercase tracking-wide text-[--color-on-muted]"
          >
            Unavailable
          </span>
        </div>
      </div>
    </article>
  </RouterLink>
</template>
<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  venue: { type: Object, required: true },
  index: { type: Number, default: 0 },
})

const router = useRouter()

function goToDetail() {
  router.push({ name: 'venue-detail', params: { id: props.venue.id }, query: { org_id: props.venue.org_id } })
}

const locationIcon = computed(() => {
  if (props.venue.location_type === 'outdoor')      return 'park'
  if (props.venue.location_type === 'semi_outdoor') return 'open_in_full'
  return 'warehouse'
})

const locationLabel = computed(() => {
  if (props.venue.location_type === 'outdoor')      return 'Outdoor'
  if (props.venue.location_type === 'semi_outdoor') return 'Semi-Outdoor'
  return 'Indoor'
})

const typeIcon = computed(() => {
  const icons = {
    conference_room: 'corporate_fare', boardroom: 'meeting_room',
    banquet_hall: 'celebration',       wedding_venue: 'favorite',
    garden: 'local_florist',           marquee: 'festival',
    training_room: 'school',           exhibition: 'museum',
    amphitheatre: 'theater_comedy',
  }
  return icons[props.venue.type] ?? 'event'
})

function amenityIcon(label) {
  const l = (label ?? '').toLowerCase()
  if (l.includes('wifi') || l.includes('wi-fi'))         return 'wifi'
  if (l.includes('projector') || l.includes('screen'))   return 'connected_tv'
  if (l.includes('pa') || l.includes('sound'))           return 'volume_up'
  if (l.includes('air') || l.includes('climate'))        return 'ac_unit'
  if (l.includes('stage') || l.includes('podium'))       return 'mic'
  if (l.includes('parking'))                             return 'local_parking'
  if (l.includes('catering') || l.includes('dining'))    return 'restaurant'
  if (l.includes('bar'))                                 return 'local_bar'
  if (l.includes('video') || l.includes('conferencing')) return 'videocam'
  if (l.includes('whiteboard') || l.includes('flip'))    return 'draw'
  if (l.includes('display') || l.includes('4k'))         return 'monitor'
  if (l.includes('light'))                               return 'light'
  if (l.includes('generator'))                           return 'bolt'
  return 'check_circle'
}
</script>

<template>
  <div
    class="reveal bg-(--color-surface-container-lowest) rounded-2xl overflow-hidden shadow-sm flex flex-col cursor-pointer group hover:shadow-lg transition-shadow duration-300"
    :style="`transition-delay: ${index * 80}ms`"
    @click="goToDetail"
  >
    <!-- Image -->
    <div class="relative h-44 overflow-hidden">
      <img
        v-if="venue.images?.[0]"
        :src="venue.images[0]"
        :alt="venue.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        loading="lazy"
      />
      <div v-else class="w-full h-full bg-(--color-surface-container) flex items-center justify-center">
        <span class="material-symbols-outlined text-5xl text-(--color-outline)">event</span>
      </div>
      <div class="absolute inset-0 bg-linear-to-t from-black/40 to-transparent"></div>

      <!-- Indoor / Outdoor badge — top left -->
      <span class="absolute top-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-full font-sans text-xs font-semibold">
        <span class="material-symbols-outlined text-sm">{{ locationIcon }}</span>
        {{ locationLabel }}
      </span>

      <!-- Capacity — top right -->
      <span class="absolute top-3 right-3 flex items-center gap-1 bg-white/90 text-(--color-on-surface) px-2.5 py-1 rounded-full font-sans text-xs font-semibold">
        <span class="material-symbols-outlined text-sm text-(--color-primary)">group</span>
        up to {{ venue.capacity }}
      </span>

      <!-- Venue type — bottom left -->
      <span class="absolute bottom-3 left-3 flex items-center gap-1 bg-(--color-primary) text-white px-2.5 py-1 rounded-full font-sans text-xs font-semibold">
        <span class="material-symbols-outlined text-sm">{{ typeIcon }}</span>
        {{ venue.type_label }}
      </span>
    </div>

    <!-- Info -->
    <div class="p-5 flex flex-col flex-1">
      <!-- Name -->
      <h3 class="font-serif text-lg text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors leading-snug mb-2">
        {{ venue.name }}
      </h3>

      <!-- Capacity line — mirrors "Sleeps X" on room cards -->
      <p class="flex items-center gap-1.5 font-sans text-xs text-(--color-on-surface-variant) mb-3">
        <span class="material-symbols-outlined text-sm text-(--color-primary)">groups</span>
        Up to {{ venue.capacity }} guests
      </p>

      <!-- Description -->
      <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed line-clamp-2 mb-4 flex-1">
        {{ venue.description }}
      </p>

      <!-- Amenity chips — mirrors room amenity chips -->
      <div v-if="venue.amenities?.length" class="flex flex-wrap gap-1 mb-4">
        <span
          v-for="a in venue.amenities.slice(0, 3)"
          :key="a"
          class="flex items-center gap-1 bg-(--color-savannah-mist) text-(--color-on-surface-variant) px-2 py-0.5 rounded font-sans text-xs"
        >
          <span class="material-symbols-outlined text-sm text-(--color-primary)">{{ amenityIcon(a) }}</span>
          {{ a }}
        </span>
      </div>

      <!-- CTA -->
      <button
        type="button"
        class="w-full py-2.5 rounded-full font-sans text-sm font-semibold bg-(--color-primary) text-white hover:bg-(--color-clay-earth) transition-colors"
        @click.stop="goToDetail"
      >
        View Details
      </button>
    </div>
  </div>
</template>

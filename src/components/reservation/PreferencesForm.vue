<script setup lang="ts">
import { useBookingStore } from '@/stores/booking'

const booking = useBookingStore()
</script>

<template>
  <section class="bg-(--color-surface-container-lowest) p-8 rounded-xl border border-(--color-savannah-mist) shadow-sm">
    <h2 class="font-serif text-2xl mb-6 flex items-center gap-3">
      <span class="material-symbols-outlined text-(--color-primary)">notes</span>
      Additional Requests
    </h2>

    <textarea
      v-model="booking.specialRequests"
      rows="4"
      placeholder="Dietary requirements, preferred arrival time, accessibility needs, or special occasions"
      class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3
             font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant)
             focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20
             transition-all resize-none"
    />
    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-2">
      We do our best to honour every request, though they cannot be guaranteed.
    </p>
  </section>
</template>

<script setup>
import { useBookingStore } from '@/stores/booking'

const booking = useBookingStore()
</script>

<template>
  <section>
    <div class="flex items-center gap-4 mb-8">
      <span class="font-serif text-2xl text-[--color-primary]/40 select-none">03</span>
      <h2 class="font-serif text-2xl text-[--color-on-surface]">Preferences</h2>
    </div>

    <div
      class="bg-[--color-surface-card] p-8 rounded-lg space-y-8"
      style="box-shadow: var(--shadow-card);"
    >
      <!-- Special requests -->
      <div class="flex flex-col gap-1.5">
        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-[--color-on-muted]">
          Special Requests
        </label>
        <textarea
          v-model="booking.specialRequests"
          rows="4"
          placeholder="Dietary requirements, accessibility needs, celebration arrangements, late check-in…"
          class="w-full bg-transparent border-b border-[--color-outline] py-2.5 font-sans text-sm
                 text-[--color-on-surface] placeholder:text-[--color-on-muted]
                 focus:outline-none focus:border-[--color-primary] transition-colors resize-none"
        />
        <p class="font-sans text-xs text-[--color-on-muted]">
          We do our best to honour every request, though they cannot be guaranteed.
        </p>
      </div>
    </div>
  </section>
</template>

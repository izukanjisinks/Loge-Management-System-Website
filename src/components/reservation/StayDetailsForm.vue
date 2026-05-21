<script setup lang="ts">
import { useBookingStore } from '@/stores/booking'

const booking = useBookingStore()

defineProps({
  errors: { type: Object, default: () => ({}) },
})

function formatDisplay(iso: string | null | undefined): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <section class="bg-(--color-surface-container-lowest) p-8 rounded-xl border border-(--color-savannah-mist) shadow-sm">
    <h2 class="font-serif text-2xl mb-6 flex items-center gap-3">
      <span class="material-symbols-outlined text-(--color-primary)">calendar_month</span>
      Stay Details
    </h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

      <!-- Room name -->
      <div class="flex flex-col gap-2">
        <label class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
          Room
        </label>
        <div class="bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) flex items-center justify-between">
          <span>{{ booking.roomName || 'Not selected' }}</span>
          <span class="material-symbols-outlined text-(--color-on-surface-variant) text-base">lock</span>
        </div>
      </div>

      <!-- Room type -->
      <div class="flex flex-col gap-2">
        <label class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
          Room Type
        </label>
        <div class="bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) flex items-center justify-between">
          <span>{{ booking.roomType || 'Not selected' }}</span>
          <span class="material-symbols-outlined text-(--color-on-surface-variant) text-base">lock</span>
        </div>
      </div>

      <!-- Lodge name -->
      <div class="flex flex-col gap-2 md:col-span-2">
        <label class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
          Lodge
        </label>
        <div class="bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) flex items-center justify-between">
          <span>{{ booking.lodgeName || 'Not selected' }}</span>
          <span class="material-symbols-outlined text-(--color-on-surface-variant) text-base">lock</span>
        </div>
      </div>

      <!-- Check-in (read-only) -->
      <div class="flex flex-col gap-2">
        <label class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
          Check In <span class="text-(--color-error)">*</span>
        </label>
        <div
          class="bg-(--color-savannah-mist) rounded-lg px-3 py-3 flex items-center gap-2 border-2 transition-colors"
          :class="errors.checkIn ? 'border-(--color-error)' : 'border-transparent'"
        >
          <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
          <span class="font-sans text-sm flex-1" :class="booking.checkIn ? 'text-(--color-on-surface)' : 'text-(--color-outline)'">
            {{ formatDisplay(booking.checkIn) || 'Not set' }}
          </span>
          <span class="material-symbols-outlined text-(--color-on-surface-variant) text-base">lock</span>
        </div>
        <span v-if="errors.checkIn" class="font-sans text-xs text-(--color-error)">{{ errors.checkIn }}</span>
      </div>

      <!-- Check-out (read-only) -->
      <div class="flex flex-col gap-2">
        <label class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
          Check Out <span class="text-(--color-error)">*</span>
        </label>
        <div
          class="bg-(--color-savannah-mist) rounded-lg px-3 py-3 flex items-center gap-2 border-2 transition-colors"
          :class="errors.checkOut ? 'border-(--color-error)' : 'border-transparent'"
        >
          <span class="material-symbols-outlined text-base text-(--color-primary)">event</span>
          <span class="font-sans text-sm flex-1" :class="booking.checkOut ? 'text-(--color-on-surface)' : 'text-(--color-outline)'">
            {{ formatDisplay(booking.checkOut) || 'Not set' }}
          </span>
          <span class="material-symbols-outlined text-(--color-on-surface-variant) text-base">lock</span>
        </div>
        <span v-if="errors.checkOut" class="font-sans text-xs text-(--color-error)">{{ errors.checkOut }}</span>
      </div>

      <!-- Guests -->
      <div class="flex flex-col gap-2 md:col-span-2">
        <label class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
          Guests
          <span v-if="booking.roomCapacity > 0" class="normal-case font-normal text-(--color-on-surface-variant)">(max {{ booking.roomCapacity }})</span>
        </label>
        <div class="bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 flex justify-between items-center">
          <span class="font-sans text-sm text-(--color-on-surface)">
            {{ booking.guestCount }} {{ booking.guestCount === 1 ? 'guest' : 'guests' }}
          </span>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="w-7 h-7 rounded-full border border-(--color-outline-variant) flex items-center justify-center font-bold text-(--color-on-surface) hover:border-(--color-primary) hover:text-(--color-primary) transition-colors disabled:opacity-30"
              :disabled="booking.guestCount <= 1"
              @click="booking.guestCount = Math.max(1, booking.guestCount - 1)"
            >−</button>
            <span class="font-sans text-sm font-semibold w-4 text-center">{{ booking.guestCount }}</span>
            <button
              type="button"
              class="w-7 h-7 rounded-full border border-(--color-outline-variant) flex items-center justify-center font-bold text-(--color-on-surface) hover:border-(--color-primary) hover:text-(--color-primary) transition-colors disabled:opacity-30"
              :disabled="booking.roomCapacity > 0 && booking.guestCount >= booking.roomCapacity"
              @click="booking.guestCount++"
            >+</button>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useBookingStore } from '@/stores/booking'

const booking = useBookingStore()

defineProps({
  errors: { type: Object, default: () => ({}) },
})

const dateError = computed(() => {
  if (!booking.checkIn || !booking.checkOut) return ''
  return new Date(booking.checkOut) <= new Date(booking.checkIn)
    ? 'Check-out must be after check-in'
    : ''
})

const inputClass = 'w-full bg-transparent border-0 border-b border-[--color-outline] focus:border-[--color-primary] focus:outline-none py-2.5 font-sans text-sm text-[--color-on-surface] transition-colors'
const labelClass = 'font-sans text-xs font-semibold tracking-widest uppercase text-[--color-on-muted]'
</script>

<template>
  <section>
    <div class="flex items-center gap-4 mb-8">
      <span class="font-serif text-2xl text-[--color-primary]/40 select-none">02</span>
      <h2 class="font-serif text-2xl text-[--color-on-surface]">Stay Details</h2>
    </div>

    <div
      class="bg-[--color-surface] p-8 rounded-lg"
      style="box-shadow: var(--shadow-card);"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">

        <!-- Room type (display only — set from room detail page) -->
        <div class="flex flex-col gap-1.5">
          <label :class="labelClass">Room Type</label>
          <div class="relative">
            <div :class="[inputClass, 'flex items-center justify-between cursor-default']">
              <span>{{ booking.roomType || 'Not selected' }}</span>
              <span class="material-symbols-outlined text-[--color-on-muted] text-base">lock</span>
            </div>
          </div>
        </div>

        <!-- Guest stepper -->
        <div class="flex flex-col gap-1.5">
          <label :class="labelClass">Guests</label>
          <div class="flex items-center gap-4 border-b border-[--color-outline] py-2">
            <button
              type="button"
              class="w-7 h-7 rounded-lg bg-[--color-secondary] flex items-center justify-center font-bold text-[--color-on-surface] hover:bg-[--color-outline]/20 transition-colors disabled:opacity-30"
              :disabled="booking.guestCount <= 1"
              @click="booking.guestCount = Math.max(1, booking.guestCount - 1)"
            >−</button>
            <span class="font-sans text-sm text-[--color-on-surface] flex-1 text-center">
              {{ booking.guestCount }} {{ booking.guestCount === 1 ? 'guest' : 'guests' }}
            </span>
            <button
              type="button"
              class="w-7 h-7 rounded-lg bg-[--color-secondary] flex items-center justify-center font-bold text-[--color-on-surface] hover:bg-[--color-outline]/20 transition-colors"
              @click="booking.guestCount++"
            >+</button>
          </div>
        </div>

        <!-- Check-in -->
        <div class="flex flex-col gap-1.5">
          <label :class="labelClass">
            Check-in Date <span class="text-[--color-error]">*</span>
          </label>
          <input
            v-model="booking.checkIn"
            type="date"
            :class="[inputClass, errors.checkIn ? 'border-[--color-error]' : '']"
          />
          <span v-if="errors.checkIn" class="font-sans text-xs text-[--color-error]">{{ errors.checkIn }}</span>
        </div>

        <!-- Check-out -->
        <div class="flex flex-col gap-1.5">
          <label :class="labelClass">
            Check-out Date <span class="text-[--color-error]">*</span>
          </label>
          <input
            v-model="booking.checkOut"
            type="date"
            :class="[inputClass, (errors.checkOut || dateError) ? 'border-[--color-error]' : '']"
          />
          <span v-if="errors.checkOut" class="font-sans text-xs text-[--color-error]">{{ errors.checkOut }}</span>
          <span v-else-if="dateError" class="font-sans text-xs text-[--color-error]">{{ dateError }}</span>
        </div>

      </div>
    </div>
  </section>
</template>

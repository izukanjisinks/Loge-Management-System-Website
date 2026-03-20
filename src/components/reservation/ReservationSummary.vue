<script setup>
import { useBookingStore } from '@/stores/booking'

const booking = useBookingStore()

// Room images keyed by roomId — matches the catalogue in RoomDetailView
const ROOM_IMAGES = {
  1: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
  2: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80',
  3: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80',
  4: 'https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=600&q=80',
  5: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80',
  6: 'https://images.unsplash.com/photo-1440778303588-435521a205bc?w=600&q=80',
}

const MEAL_LABELS = {
  full_board: 'Full Board',
  half_board: 'Half Board',
  breakfast:  'Breakfast Only',
  none:       'Room Only',
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div
    class="sticky top-24 bg-[--color-surface-card] rounded-xl overflow-hidden"
    style="box-shadow: var(--shadow-float);"
  >
    <!-- Room image with inner-glow and title overlay -->
    <div class="relative h-44 overflow-hidden">
      <img
        :src="ROOM_IMAGES[booking.roomId] || ROOM_IMAGES[1]"
        :alt="booking.roomType || 'Your room'"
        class="w-full h-full object-cover"
      />
      <!-- Inner glow from design spec -->
      <div class="absolute inset-0" style="box-shadow: inset 0 0 40px rgba(0,0,0,0.15);"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-[oklch(0.12_0.02_45/0.70)] to-transparent" />
      <p class="absolute bottom-4 left-5 font-serif text-white text-xl">
        {{ booking.roomType || 'Your Room' }}
      </p>
    </div>

    <div class="p-6 space-y-4">

      <!-- Stay overview -->
      <div class="space-y-2.5 text-sm font-sans">
        <div class="flex justify-between text-[--color-on-muted]">
          <span class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-base">calendar_today</span> Check In
          </span>
          <span class="text-[--color-on-surface] font-medium">{{ formatDate(booking.checkIn) }}</span>
        </div>
        <div class="flex justify-between text-[--color-on-muted]">
          <span class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-base">calendar_month</span> Check Out
          </span>
          <span class="text-[--color-on-surface] font-medium">{{ formatDate(booking.checkOut) }}</span>
        </div>
        <div class="flex justify-between text-[--color-on-muted]">
          <span class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-base">group</span> Guests
          </span>
          <span class="text-[--color-on-surface] font-medium">{{ booking.guestCount }}</span>
        </div>
        <div class="flex justify-between text-[--color-on-muted]">
          <span class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-base">nights_stay</span> Nights
          </span>
          <span class="text-[--color-on-surface] font-medium">{{ booking.nightCount || '—' }}</span>
        </div>
        <div class="flex justify-between text-[--color-on-muted]">
          <span class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-base">restaurant</span> Meal Plan
          </span>
          <span class="text-[--color-on-surface] font-medium">{{ MEAL_LABELS[booking.mealPlan] }}</span>
        </div>
      </div>

      <!-- Price breakdown -->
      <div class="pt-4 space-y-2 text-sm font-sans">
        <div class="flex justify-between text-[--color-on-muted]">
          <span>Base Rate</span>
          <span>${{ booking.baseTotal.toFixed(0) }}</span>
        </div>
        <div v-if="booking.mealCost > 0" class="flex justify-between text-[--color-on-muted]">
          <span>Meal Plan</span>
          <span>${{ booking.mealCost.toFixed(0) }}</span>
        </div>
        <div class="flex justify-between text-[--color-on-muted]">
          <span>Taxes & Fees (12%)</span>
          <span>${{ booking.taxes.toFixed(0) }}</span>
        </div>

        <!-- Total -->
        <div class="flex justify-between items-baseline pt-3">
          <span class="font-sans text-xs font-semibold tracking-widest uppercase text-[--color-on-muted]">
            Total Estimate
          </span>
          <span class="font-serif text-2xl text-[--color-primary]">
            ${{ booking.grandTotal.toFixed(0) }}
          </span>
        </div>
      </div>

      <!-- Platinum Guarantee badge -->
      <div class="flex items-start gap-3 pt-3 p-4 bg-[--color-secondary] rounded-lg">
        <span
          class="material-symbols-outlined text-[--color-accent] text-xl shrink-0 mt-0.5"
          style="font-variation-settings: 'FILL' 1"
        >verified</span>
        <div>
          <p class="font-sans text-xs font-semibold text-[--color-on-surface] mb-0.5">Platinum Guarantee</p>
          <p class="font-sans text-xs text-[--color-on-muted] leading-relaxed">
            Free cancellation up to 48 hours before check-in. No charge today.
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

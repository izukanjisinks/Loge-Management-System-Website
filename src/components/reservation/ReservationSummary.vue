<script setup>
import { useBookingStore } from '@/stores/booking'

const booking = useBookingStore()

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80',
  'https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=600&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80',
]

function roomImage(id) {
  if (!id) return FALLBACK_IMAGES[0]
  const hash = String(id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length]
}

function formatDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="sticky top-28 bg-(--color-surface-container) p-6 rounded-xl border border-(--color-outline-variant)/30">
    <h3 class="font-serif text-2xl mb-6">Booking Summary</h3>

    <!-- Room image -->
    <div class="relative rounded-lg overflow-hidden mb-6 h-48">
      <img
        :src="roomImage(booking.roomId)"
        :alt="booking.roomType || 'Your room'"
        class="w-full h-full object-cover"
      />
      <div class="absolute bottom-0 left-0 w-full p-4 bg-linear-to-t from-(--color-deep-obsidian)/80 to-transparent">
        <p class="text-white font-sans font-semibold text-sm">{{ booking.roomType || 'Selected Room' }}</p>
        <p class="text-white/80 font-sans text-xs">Mwakwanda Lodge</p>
      </div>
    </div>

    <!-- Stay details -->
    <div class="space-y-4 border-b border-(--color-outline-variant) pb-6">
      <div class="flex justify-between items-start">
        <div class="flex gap-2">
          <span class="material-symbols-outlined text-(--color-on-surface-variant)">calendar_month</span>
          <div>
            <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Dates</p>
            <p class="font-sans text-xs text-(--color-on-surface-variant)">
              <template v-if="booking.checkIn && booking.checkOut">
                {{ formatDate(booking.checkIn) }} &rarr; {{ formatDate(booking.checkOut) }}
                ({{ booking.nightCount }} nights)
              </template>
              <template v-else>Not selected</template>
            </p>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <span class="material-symbols-outlined text-(--color-on-surface-variant)">group</span>
        <div>
          <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Guests</p>
          <p class="font-sans text-xs text-(--color-on-surface-variant)">
            {{ booking.guestCount }} {{ booking.guestCount === 1 ? 'Adult' : 'Adults' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Price breakdown -->
    <template v-if="booking.nightCount > 0">
      <div class="py-6 space-y-3">
        <div class="flex justify-between font-sans text-sm text-(--color-on-surface-variant)">
          <span>{{ booking.nightCount }} nights × K{{ Number((booking.baseRatePerNight ?? 0).toFixed(0)).toLocaleString() }}</span>
          <span>K{{ Number((booking.baseTotal ?? 0).toFixed(0)).toLocaleString() }}</span>
        </div>
        <div v-if="booking.mealCost > 0" class="flex justify-between font-sans text-sm text-(--color-on-surface-variant)">
          <span>{{ booking.mealPlanName }}</span>
          <span>K{{ Number((booking.mealCost ?? 0).toFixed(0)).toLocaleString() }}</span>
        </div>
        <div class="flex justify-between font-sans text-sm text-(--color-on-surface-variant)">
          <span>Conservation Levy (12%)</span>
          <span>K{{ Number((booking.taxes ?? 0).toFixed(0)).toLocaleString() }}</span>
        </div>
      </div>

      <!-- Total -->
      <div class="pt-4 border-t border-primary/20 flex justify-between items-end">
        <div>
          <p class="font-sans text-xs font-semibold tracking-wider uppercase text-(--color-on-surface-variant)">Total Payable</p>
          <p class="font-serif text-[32px] font-semibold leading-10 text-(--color-primary)">
            K{{ Number((booking.grandTotal ?? 0).toFixed(0)).toLocaleString() }}
          </p>
        </div>
        <span class="font-sans text-xs text-(--color-on-surface-variant) italic mb-1">Inclusive of all taxes</span>
      </div>
    </template>
    <template v-else>
      <p class="py-6 font-sans text-sm text-(--color-on-surface-variant) italic">Select dates to see pricing.</p>
    </template>

    <!-- Guarantee -->
    <div class="mt-8 p-4 bg-(--color-tertiary-fixed) rounded-lg flex gap-3">
      <span class="material-symbols-outlined text-(--color-tertiary)">shield</span>
      <p class="font-sans text-xs text-(--color-on-tertiary-fixed-variant) leading-tight">
        Best rate guaranteed. Your booking is protected by our flexible 48h cancellation policy.
      </p>
    </div>
  </div>
</template>

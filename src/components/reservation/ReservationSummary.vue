<script setup>
import { useBookingStore } from '@/stores/booking'
import { PDFDownloadLink } from '@ceereals/vue-pdf'
import BookingInvoiceDocument from '@/components/reservation/BookingInvoiceDocument.vue'

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
  <div class="sticky top-24 bg-(--color-surface-container-lowest) rounded-xl overflow-hidden">

    <!-- Room image -->
    <div class="relative h-48">
      <img
        :src="roomImage(booking.roomId)"
        :alt="booking.roomType || 'Your room'"
        class="w-full h-full object-cover"
      />
      <div class="absolute inset-0 bg-linear-to-t from-black/60 to-transparent"></div>
      <div class="absolute bottom-4 left-4 text-white">
        <h3 class="font-serif text-lg font-semibold leading-tight">{{ booking.roomType || 'Selected Room' }}</h3>
        <p class="font-sans text-xs opacity-80">Mwakwanda Lodge</p>
      </div>
    </div>

    <div class="p-6 space-y-6">

      <!-- Dates & guests -->
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-(--color-primary) text-xl">calendar_today</span>
          <div>
            <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-outline)">Dates</p>
            <template v-if="booking.checkIn && booking.checkOut">
              <p class="font-sans text-sm font-semibold text-(--color-on-surface)">
                {{ formatDate(booking.checkIn) }} — {{ formatDate(booking.checkOut) }}
              </p>
              <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ booking.nightCount }} {{ booking.nightCount === 1 ? 'night' : 'nights' }}</p>
            </template>
            <p v-else class="font-sans text-sm text-(--color-outline)">Not selected</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-(--color-primary) text-xl">person_search</span>
          <div>
            <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-outline)">Guests</p>
            <p class="font-sans text-sm font-semibold text-(--color-on-surface)">
              <template v-if="booking.bookingType === 'corporate'">
                {{ booking.corporateGuests.length }} {{ booking.corporateGuests.length === 1 ? 'Employee' : 'Employees' }}
              </template>
              <template v-else>
                {{ booking.guestCount }} {{ booking.guestCount === 1 ? 'Adult' : 'Adults' }}
              </template>
            </p>
          </div>
        </div>
      </div>

      <!-- Cost breakdown -->
      <template v-if="booking.nightCount > 0">
        <div class="border-t border-(--color-outline-variant) pt-6 space-y-3">
          <h4 class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">Cost Breakdown</h4>

          <div class="flex justify-between font-sans text-sm text-(--color-on-surface)">
            <span>{{ booking.nightCount }} nights × K{{ Number((booking.baseRatePerNight ?? 0).toFixed(0)).toLocaleString() }}</span>
            <span class="font-semibold">K{{ Number((booking.baseTotal ?? 0).toFixed(0)).toLocaleString() }}</span>
          </div>

          <div v-if="booking.mealCost > 0" class="flex justify-between font-sans text-sm text-(--color-on-surface)">
            <span>{{ booking.mealPlanName }}</span>
            <span class="font-semibold">K{{ Number((booking.mealCost ?? 0).toFixed(0)).toLocaleString() }}</span>
          </div>

          <div class="flex justify-between font-sans text-sm text-(--color-on-surface-variant)">
            <span>VAT (16%)</span>
            <span class="font-semibold">K{{ Number((booking.taxes ?? 0).toFixed(0)).toLocaleString() }}</span>
          </div>

          <div class="pt-4 border-t-2 border-(--color-primary) flex justify-between items-end">
            <span class="font-sans text-xs font-bold uppercase tracking-widest text-(--color-primary)">Total Payable</span>
            <span class="font-serif text-3xl font-semibold text-(--color-primary)">
              K{{ Number((booking.grandTotal ?? 0).toFixed(0)).toLocaleString() }}
            </span>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="border-t border-(--color-outline-variant) pt-6">
          <p class="font-sans text-sm text-(--color-on-surface-variant) italic">Select dates to see pricing.</p>
        </div>
      </template>

      <!-- Download Invoice -->
      <PDFDownloadLink
        v-if="booking.nightCount > 0"
        :file-name="`Mwakwanda-Booking-${booking.roomType || 'Invoice'}.pdf`"
      >
        <template #default>
          <BookingInvoiceDocument :booking="{
            bookingType:      booking.bookingType,
            lodgeName:        booking.lodgeName,
            roomType:         booking.roomType,
            checkIn:          booking.checkIn,
            checkOut:         booking.checkOut,
            nightCount:       booking.nightCount,
            guestCount:       booking.guestCount,
            baseRatePerNight: booking.baseRatePerNight,
            baseTotal:        booking.baseTotal,
            mealPlanName:     booking.mealPlanName,
            mealCost:         booking.mealCost,
            taxes:            booking.taxes,
            grandTotal:       booking.grandTotal,
            specialRequests:  booking.specialRequests,
            guestInfo:        { ...booking.guestInfo },
            corporateClient:  { ...booking.corporateClient },
            corporateGuests:  booking.corporateGuests.map(g => ({ ...g })),
          }" />
        </template>
        <template #label="{ blob }">
          <button
            type="button"
            class="w-full h-12 flex items-center justify-center gap-2 border border-(--color-primary) text-(--color-primary) rounded-lg font-sans text-sm font-semibold hover:bg-(--color-surface-container-low) transition-all"
          >
            <span class="material-symbols-outlined text-base" :class="!blob ? 'animate-spin' : ''">
              {{ !blob ? 'progress_activity' : 'download' }}
            </span>
            {{ !blob ? 'Generating…' : 'Download Invoice' }}
          </button>
        </template>
      </PDFDownloadLink>

      <!-- Guarantee -->
      <!--     -->

    </div>
  </div>
</template>

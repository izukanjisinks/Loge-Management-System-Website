<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReservationsStore } from '@/stores/reservations'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import api from '@/lib/api'

const route        = useRoute()
const router       = useRouter()
const reservations = useReservationsStore()

const booking    = ref(null)
const roomImages = ref([])
const activeImg  = ref(0)
const loading    = ref(false)
const error      = ref('')
const cancelling = ref(false)

function formatDate(d) {
  if (!d) return 'â€”'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(async () => {
  loading.value = true
  error.value   = ''
  try {
    const { data } = await api.get(`/web/bookings/${route.params.id}`)
    booking.value = {
      id:              data.id,
      roomId:          data.room_id,
      roomName:        data.room_name,
      clientName:      data.client_name,
      mealPlanName:    data.meal_plan_name,
      checkIn:         data.check_in,
      checkOut:        data.check_out,
      guests:          data.guests,
      nights:          data.nights,
      roomCost:        data.room_cost,
      mealCost:        data.meal_cost,
      totalAmount:     data.total_amount,
      status:          data.status,
      specialRequests: data.special_requests,
      createdAt:       data.created_at,
    }
    try {
      const { data: room } = await api.get(`/guest/rooms/${data.room_id}`)
      roomImages.value = room.images ?? []
    } catch {
      roomImages.value = []
    }
  } catch {
    error.value = 'Unable to load booking details. Please try again.'
  } finally {
    loading.value = false
  }
})

async function cancel() {
  if (!confirm('Are you sure you want to cancel this reservation?')) return
  cancelling.value = true
  try {
    await reservations.cancel(booking.value.id)
    router.push({ name: 'bookings' })
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <div class="max-w-[1280px] mx-auto px-5 md:px-16 py-8">

    <!-- Back -->
    <RouterLink
      to="/bookings"
      class="inline-flex items-center gap-2 font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) transition-colors mb-8"
    >
      <span class="material-symbols-outlined text-base">arrow_back</span>
      My Bookings
    </RouterLink>

    <!-- Loading -->
    <div v-if="loading" class="py-32 text-center">
      <span class="material-symbols-outlined text-4xl text-(--color-on-surface-variant) animate-spin">progress_activity</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="py-32 text-center">
      <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-4">error</span>
      <p class="font-sans text-sm text-(--color-on-surface-variant)">{{ error }}</p>
    </div>

    <template v-else-if="booking">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <span class="text-(--color-primary) font-sans text-sm font-semibold tracking-widest uppercase mb-2 block">Reservation</span>
          <h1 class="font-serif text-[32px] font-semibold leading-10 text-(--color-on-surface)">{{ booking.roomName }}</h1>
        </div>
        <StatusBadge :status="booking.status" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

        <!-- Left: Image + Details -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Gallery -->
          <div v-if="roomImages.length" class="rounded-xl overflow-hidden aspect-video relative border border-(--color-savannah-mist)">
            <Transition enter-active-class="transition duration-400 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" mode="out-in">
              <img :key="activeImg" :src="roomImages[activeImg]" :alt="booking.roomName" class="w-full h-full object-cover" />
            </Transition>
            <button
              v-if="roomImages.length > 1"
              class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
              @click="activeImg = (activeImg - 1 + roomImages.length) % roomImages.length"
            >
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              v-if="roomImages.length > 1"
              class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
              @click="activeImg = (activeImg + 1) % roomImages.length"
            >
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          <div
            v-else
            class="rounded-xl aspect-video bg-(--color-surface-container) flex flex-col items-center justify-center gap-2 border border-(--color-savannah-mist)"
          >
            <span class="material-symbols-outlined text-5xl text-(--color-outline)">image_not_supported</span>
            <p class="font-sans text-sm text-(--color-on-surface-variant)">No images available</p>
          </div>

          <!-- Stay Details card -->
          <div class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-savannah-mist) shadow-sm space-y-4">
            <h2 class="font-serif text-2xl text-(--color-on-surface) mb-2">Stay Details</h2>
            <div class="grid grid-cols-2 gap-4 font-sans text-sm">
              <div>
                <p class="font-sans text-xs font-semibold uppercase tracking-[0.05em] text-(--color-on-surface-variant) mb-1">Check In</p>
                <p class="font-semibold text-(--color-on-surface)">{{ formatDate(booking.checkIn) }}</p>
              </div>
              <div>
                <p class="font-sans text-xs font-semibold uppercase tracking-[0.05em] text-(--color-on-surface-variant) mb-1">Check Out</p>
                <p class="font-semibold text-(--color-on-surface)">{{ formatDate(booking.checkOut) }}</p>
              </div>
              <div>
                <p class="font-sans text-xs font-semibold uppercase tracking-[0.05em] text-(--color-on-surface-variant) mb-1">Nights</p>
                <p class="font-semibold text-(--color-on-surface)">{{ booking.nights }}</p>
              </div>
              <div>
                <p class="font-sans text-xs font-semibold uppercase tracking-[0.05em] text-(--color-on-surface-variant) mb-1">Guests</p>
                <p class="font-semibold text-(--color-on-surface)">{{ booking.guests }} {{ booking.guests === 1 ? 'guest' : 'guests' }}</p>
              </div>
              <div v-if="booking.mealPlanName">
                <p class="font-sans text-xs font-semibold uppercase tracking-[0.05em] text-(--color-on-surface-variant) mb-1">Meal Plan</p>
                <p class="font-semibold text-(--color-on-surface)">{{ booking.mealPlanName }}</p>
              </div>
              <div>
                <p class="font-sans text-xs font-semibold uppercase tracking-[0.05em] text-(--color-on-surface-variant) mb-1">Guest Name</p>
                <p class="font-semibold text-(--color-on-surface)">{{ booking.clientName }}</p>
              </div>
            </div>
            <div v-if="booking.specialRequests" class="pt-4 border-t border-(--color-outline-variant)">
              <p class="font-sans text-xs font-semibold uppercase tracking-[0.05em] text-(--color-on-surface-variant) mb-1">Special Requests</p>
              <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed">{{ booking.specialRequests }}</p>
            </div>
          </div>
        </div>

        <!-- Right: Price Summary + Actions -->
        <aside class="lg:sticky lg:top-28 space-y-4">

          <!-- Price breakdown -->
          <div class="bg-(--color-surface-container-high) p-6 rounded-xl border border-(--color-outline-variant) shadow-lg space-y-3">
            <h2 class="font-serif text-2xl text-(--color-on-surface) mb-4">Price Summary</h2>
            <div class="space-y-2 font-sans text-sm">
              <div class="flex justify-between text-(--color-on-surface-variant)">
                <span>Room cost</span>
                <span>K{{ booking.roomCost.toLocaleString() }}</span>
              </div>
              <div v-if="booking.mealCost" class="flex justify-between text-(--color-on-surface-variant)">
                <span>Meal plan</span>
                <span>K{{ booking.mealCost.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between font-bold text-lg pt-3 border-t border-(--color-outline-variant)">
                <span>Total</span>
                <span class="text-(--color-primary)">K{{ booking.totalAmount.toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <!-- Guarantee note -->
          <div class="p-4 bg-(--color-tertiary-fixed) rounded-lg flex items-start gap-3">
            <span class="material-symbols-outlined text-(--color-tertiary)">shield</span>
            <p class="font-sans text-xs text-(--color-on-tertiary-fixed-variant) leading-tight">
              Free cancellation up to 48 hours before check-in. No charge today.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-3 pt-1">
            <button
              v-if="['pending', 'confirmed'].includes(booking.status)"
              class="w-full border-2 border-(--color-primary) text-(--color-primary) py-3 rounded-lg font-sans text-sm font-semibold hover:bg-(--color-primary) hover:text-white transition-all disabled:opacity-60"
              :disabled="cancelling"
              @click="cancel"
            >
              <span v-if="cancelling" class="material-symbols-outlined text-base align-middle animate-spin">progress_activity</span>
              <span v-else>Cancel Reservation</span>
            </button>
            <RouterLink
              to="/lodges"
              class="w-full text-center bg-(--color-primary) text-white py-3 rounded-lg font-sans text-sm font-semibold hover:bg-(--color-primary-container) transition-all"
            >
              Browse Lodges
            </RouterLink>
          </div>

        </aside>
      </div>
    </template>
  </div>
</template>

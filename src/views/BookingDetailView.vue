<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReservationsStore } from '@/stores/reservations'
import BaseButton from '@/components/ui/BaseButton.vue'
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
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(async () => {
  loading.value = true
  error.value   = ''
  try {
    const { data } = await api.get(`/guest/bookings/${route.params.id}`)
    booking.value = {
      id:             data.id,
      roomId:         data.room_id,
      roomName:       data.room_name,
      clientName:     data.client_name,
      mealPlanName:   data.meal_plan_name,
      checkIn:        data.check_in,
      checkOut:       data.check_out,
      guests:         data.guests,
      nights:         data.nights,
      roomCost:       data.room_cost,
      mealCost:       data.meal_cost,
      totalAmount:    data.total_amount,
      status:         data.status,
      specialRequests: data.special_requests,
      createdAt:      data.created_at,
    }
    // Fetch room images separately
    try {
      const { data: room } = await api.get(`/rooms/${data.room_id}`)
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
  <div class="max-w-5xl mx-auto px-6 md:px-16 py-16">

    <!-- Back -->
    <RouterLink
      to="/bookings"
      class="inline-flex items-center gap-1.5 font-sans text-sm text-[--color-on-muted]
             hover:text-[--color-on-surface] transition-colors mb-10"
    >
      <span class="material-symbols-outlined text-base">arrow_back</span>
      My Bookings
    </RouterLink>

    <!-- Loading -->
    <div v-if="loading" class="py-32 text-center">
      <span class="material-symbols-outlined text-4xl text-[--color-on-muted] animate-spin">progress_activity</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="py-32 text-center">
      <p class="font-sans text-sm text-[--color-error]">{{ error }}</p>
    </div>

    <template v-else-if="booking">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <p class="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-[--color-primary] mb-1">
            Reservation
          </p>
          <h1 class="font-serif text-4xl text-[--color-on-surface]">{{ booking.roomName }}</h1>
        </div>
        <StatusBadge :status="booking.status" class="self-start sm:self-center text-sm px-4 py-1.5" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">

        <!-- Left: images + details -->
        <div class="lg:col-span-7 space-y-8">

          <!-- Gallery -->
          <div v-if="roomImages.length" class="rounded-xl overflow-hidden aspect-video relative" style="box-shadow: var(--shadow-card);">
            <Transition
              enter-active-class="transition duration-400 ease-out"
              enter-from-class="opacity-0"
              enter-to-class="opacity-100"
              mode="out-in"
            >
              <img
                :key="activeImg"
                :src="roomImages[activeImg]"
                :alt="booking.roomName"
                class="w-full h-full object-cover"
              />
            </Transition>
            <button
              v-if="roomImages.length > 1"
              class="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg
                     bg-[oklch(1_0_0/0.85)] backdrop-blur-sm flex items-center justify-center
                     text-[--color-on-surface] hover:bg-white transition-colors"
              @click="activeImg = (activeImg - 1 + roomImages.length) % roomImages.length"
            >
              <span class="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button
              v-if="roomImages.length > 1"
              class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg
                     bg-[oklch(1_0_0/0.85)] backdrop-blur-sm flex items-center justify-center
                     text-[--color-on-surface] hover:bg-white transition-colors"
              @click="activeImg = (activeImg + 1) % roomImages.length"
            >
              <span class="material-symbols-outlined text-lg">chevron_right</span>
            </button>
            <div v-if="roomImages.length > 1" class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              <button
                v-for="(_, i) in roomImages"
                :key="i"
                class="w-1.5 h-1.5 rounded-full transition-all duration-300"
                :class="i === activeImg ? 'bg-white scale-125' : 'bg-white/50'"
                @click="activeImg = i"
              />
            </div>
          </div>

          <!-- No image placeholder -->
          <div
            v-else
            class="rounded-xl aspect-video bg-[--color-secondary] flex flex-col items-center justify-center gap-2"
          >
            <span class="material-symbols-outlined text-5xl text-[--color-outline]">image_not_supported</span>
            <p class="font-sans text-sm text-[--color-on-muted]">No images available</p>
          </div>

          <!-- Stay details -->
          <div class="bg-[--color-surface-card] rounded-lg p-6 space-y-4" style="box-shadow: var(--shadow-card);">
            <h2 class="font-serif text-xl text-[--color-on-surface] mb-2">Stay Details</h2>
            <div class="grid grid-cols-2 gap-4 text-sm font-sans">
              <div>
                <p class="text-[10px] font-bold tracking-[0.18em] uppercase text-[--color-on-muted] mb-1">Check In</p>
                <p class="text-[--color-on-surface] font-medium">{{ formatDate(booking.checkIn) }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold tracking-[0.18em] uppercase text-[--color-on-muted] mb-1">Check Out</p>
                <p class="text-[--color-on-surface] font-medium">{{ formatDate(booking.checkOut) }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold tracking-[0.18em] uppercase text-[--color-on-muted] mb-1">Nights</p>
                <p class="text-[--color-on-surface] font-medium">{{ booking.nights }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold tracking-[0.18em] uppercase text-[--color-on-muted] mb-1">Guests</p>
                <p class="text-[--color-on-surface] font-medium">{{ booking.guests }} {{ booking.guests === 1 ? 'guest' : 'guests' }}</p>
              </div>
              <div v-if="booking.mealPlanName">
                <p class="text-[10px] font-bold tracking-[0.18em] uppercase text-[--color-on-muted] mb-1">Meal Plan</p>
                <p class="text-[--color-on-surface] font-medium">{{ booking.mealPlanName }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold tracking-[0.18em] uppercase text-[--color-on-muted] mb-1">Guest</p>
                <p class="text-[--color-on-surface] font-medium">{{ booking.clientName }}</p>
              </div>
            </div>

            <div v-if="booking.specialRequests" class="pt-2 border-t border-[--color-outline]/20">
              <p class="text-[10px] font-bold tracking-[0.18em] uppercase text-[--color-on-muted] mb-1">Special Requests</p>
              <p class="font-sans text-sm text-[--color-on-muted] leading-relaxed">{{ booking.specialRequests }}</p>
            </div>
          </div>
        </div>

        <!-- Right: price summary + actions -->
        <div class="lg:col-span-5">
          <div class="sticky top-24 space-y-4">

            <!-- Price breakdown -->
            <div class="bg-[--color-surface-card] rounded-lg p-6 space-y-3" style="box-shadow: var(--shadow-float);">
              <h2 class="font-serif text-xl text-[--color-on-surface] mb-4">Price Summary</h2>
              <div class="space-y-2 text-sm font-sans">
                <div class="flex justify-between text-[--color-on-muted]">
                  <span>Room cost</span>
                  <span>K{{ booking.roomCost.toLocaleString() }}</span>
                </div>
                <div v-if="booking.mealCost" class="flex justify-between text-[--color-on-muted]">
                  <span>Meal plan</span>
                  <span>K{{ booking.mealCost.toLocaleString() }}</span>
                </div>
                <div class="flex justify-between font-semibold text-[--color-on-surface] text-base pt-3 border-t border-[--color-outline]/20">
                  <span>Total</span>
                  <span class="text-[--color-primary]">K{{ booking.totalAmount.toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <!-- Platinum guarantee -->
            <div class="flex items-start gap-3 p-4 bg-[--color-secondary] rounded-lg">
              <span
                class="material-symbols-outlined text-[--color-accent] text-xl shrink-0 mt-0.5"
                style="font-variation-settings: 'FILL' 1"
              >verified</span>
              <div>
                <p class="font-sans text-xs font-semibold text-[--color-on-surface] mb-0.5">Platinum Guarantee</p>
                <p class="font-sans text-xs text-[--color-on-muted] leading-relaxed">
                  Free cancellation up to 48 hours before check-in.
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col gap-2 pt-1">
              <BaseButton
                v-if="['pending', 'confirmed'].includes(booking.status)"
                variant="secondary"
                class="w-full justify-center py-3"
                :class="cancelling && 'opacity-70 pointer-events-none'"
                @click="cancel"
              >
                <span v-if="cancelling" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
                <span v-else>Cancel Reservation</span>
              </BaseButton>
              <BaseButton to="/rooms" variant="primary" class="w-full justify-center py-3">
                Browse Rooms
              </BaseButton>
            </div>

          </div>
        </div>

      </div>
    </template>

  </div>
</template>
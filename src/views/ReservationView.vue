<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore }      from '@/stores/booking'
import { useAuthStore }         from '@/stores/auth'
import { useReservationsStore } from '@/stores/reservations'
import GuestInfoForm       from '@/components/reservation/GuestInfoForm.vue'
import StayDetailsForm     from '@/components/reservation/StayDetailsForm.vue'
import PreferencesForm     from '@/components/reservation/PreferencesForm.vue'
import ReservationSummary  from '@/components/reservation/ReservationSummary.vue'

const router       = useRouter()
const booking      = useBookingStore()
const auth         = useAuthStore()
const reservations = useReservationsStore()

const errors  = ref({})
const loading = ref(false)
const success  = ref(false)

onMounted(() => {
  if (auth.user && !booking.guestInfo.email) {
    booking.guestInfo.email     = auth.user.email     ?? ''
    booking.guestInfo.firstName = auth.user.firstName ?? booking.guestInfo.firstName
    booking.guestInfo.lastName  = auth.user.lastName  ?? booking.guestInfo.lastName
  }
})

const dateError = computed(() => {
  if (!booking.checkIn || !booking.checkOut) return ''
  return new Date(booking.checkOut) <= new Date(booking.checkIn)
    ? 'Check-out must be after check-in'
    : ''
})

function validate() {
  const e = {}
  const g = booking.guestInfo
  if (!g.firstName)       e.firstName = 'Required'
  if (!g.lastName)        e.lastName  = 'Required'
  if (!g.email)           e.email     = 'Required'
  else if (!/\S+@\S+\.\S+/.test(g.email)) e.email = 'Enter a valid email'
  if (!g.phone)           e.phone     = 'Required'
  if (!booking.checkIn)   e.checkIn   = 'Required'
  if (!booking.checkOut)  e.checkOut  = 'Required'
  if (dateError.value)    e.checkOut  = dateError.value
  errors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  if (!validate()) {
    document.querySelector('[data-section="guest"]')?.scrollIntoView({ behavior: 'smooth' })
    return
  }
  loading.value = true
  try {
    await reservations.create({
      roomId:          booking.roomId,
      checkIn:         booking.checkIn,
      checkOut:        booking.checkOut,
      guestCount:      booking.guestCount,
      mealPlanId:      booking.mealPlanId,
      specialRequests: booking.specialRequests,
    })
    success.value = true
    booking.reset()
    setTimeout(() => router.push({ name: 'bookings' }), 2200)
  } catch (e) {
    errors.value.submit = e.response?.data?.error?.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

// Step tracker
const steps = [
  { label: 'Selection',     done: true  },
  { label: 'Guest Details', done: false, active: true },
  { label: 'Payment',       done: false },
  { label: 'Confirmation',  done: false },
]
</script>

<template>
  <!-- Success overlay -->
  <Transition enter-active-class="transition duration-500" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
    <div
      v-if="success"
      class="fixed inset-0 z-50 bg-(--color-background)/90 backdrop-blur-md flex items-center justify-center px-5"
    >
      <div class="text-center max-w-sm">
        <span
          class="material-symbols-outlined text-6xl text-(--color-primary) mb-6 block"
          style="font-variation-settings: 'FILL' 1"
        >check_circle</span>
        <h2 class="font-serif text-3xl text-(--color-on-surface) mb-3">Reservation Confirmed</h2>
        <p class="font-sans text-base text-(--color-on-surface-variant) leading-relaxed">
          Your sanctuary awaits. Redirecting you to your bookingsâ€¦
        </p>
      </div>
    </div>
  </Transition>

  <div class="w-full max-w-[1280px] mx-auto px-5 md:px-16 py-8">

    <!-- Progress Tracker -->
    <div class="mb-12">
      <div class="flex items-center justify-between max-w-2xl mx-auto relative">
        <div class="absolute top-5 left-0 w-full h-0.5 bg-(--color-surface-container-highest) z-0"></div>
        <div class="absolute top-5 left-0 w-1/3 h-0.5 bg-(--color-primary) z-0"></div>

        <div
          v-for="(step, i) in steps"
          :key="step.label"
          class="relative z-10 flex flex-col items-center gap-2"
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center font-sans text-sm font-semibold"
            :class="step.done
              ? 'bg-(--color-primary) text-white'
              : step.active
                ? 'bg-(--color-primary) text-white border-4 border-(--color-surface)'
                : 'bg-(--color-surface-container-highest) text-(--color-on-surface-variant)'"
          >
            <span v-if="step.done && !step.active" class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1">check</span>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span
            class="font-sans text-xs font-semibold"
            :class="step.active ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'"
          >{{ step.label }}</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      <!-- â”€â”€ Left: Forms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <div class="lg:col-span-8 space-y-6">

        <!-- Booking type toggle -->
        <div class="bg-(--color-surface-container-low) p-2 rounded-xl flex gap-1 w-full max-w-md">
          <button class="flex-1 py-2 rounded-lg bg-(--color-surface) text-(--color-primary) font-sans text-sm font-bold shadow-sm transition-all">
            Individual Booking
          </button>
          <button class="flex-1 py-2 rounded-lg text-(--color-on-surface-variant) font-sans text-sm hover:bg-(--color-surface-container) transition-all">
            Corporate Booking
          </button>
        </div>

        <!-- Section 1: Guest info -->
        <div data-section="guest">
          <GuestInfoForm :errors="errors" />
        </div>

        <!-- Section 2: Stay details -->
        <StayDetailsForm :errors="errors" />

        <!-- Section 3: Preferences -->
        <PreferencesForm />

        <!-- Submit error -->
        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
          <div
            v-if="errors.submit"
            class="flex items-start gap-2 p-4 rounded-lg bg-(--color-error-container) text-(--color-on-error-container)"
          >
            <span class="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
            <p class="font-sans text-sm">{{ errors.submit }}</p>
          </div>
        </Transition>

        <!-- CTAs -->
        <div class="flex justify-between items-center pt-4">
          <RouterLink
            to="/rooms"
            class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-bold px-6 py-3 hover:bg-(--color-primary)/5 rounded-full transition-all"
          >
            <span class="material-symbols-outlined">arrow_back</span>
            Back to Rooms
          </RouterLink>

          <button
            class="bg-(--color-primary) text-white font-sans text-sm font-bold px-10 py-3 rounded-full hover:bg-(--color-primary-container) transition-all shadow-sm disabled:opacity-60"
            :disabled="loading"
            @click="submit"
          >
            <span v-if="loading" class="material-symbols-outlined text-base align-middle" style="animation: spin 1s linear infinite">progress_activity</span>
            <span v-else>Proceed to Payment</span>
          </button>
        </div>

        <p class="font-sans text-xs text-(--color-on-surface-variant)">
          By confirming you agree to our
          <a href="#" class="text-(--color-primary) hover:underline">cancellation policy</a>
          and
          <a href="#" class="text-(--color-primary) hover:underline">terms of service</a>.
        </p>
      </div>

      <!-- â”€â”€ Right: Summary Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <aside class="lg:col-span-4">
        <ReservationSummary />
      </aside>

    </div>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }
</style>

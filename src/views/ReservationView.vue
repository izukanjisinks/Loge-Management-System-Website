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
import BaseButton          from '@/components/ui/BaseButton.vue'

const router       = useRouter()
const booking      = useBookingStore()
const auth         = useAuthStore()
const reservations = useReservationsStore()

const errors  = ref({})
const loading = ref(false)
const success  = ref(false)

// Pre-fill guest email from authenticated user
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
  const e   = {}
  const g   = booking.guestInfo
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
    // Scroll to first error
    document.querySelector('[data-section="01"]')?.scrollIntoView({ behavior: 'smooth' })
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
</script>

<template>
  <!-- ── Success overlay ── -->
  <Transition
    enter-active-class="transition duration-500"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
  >
    <div
      v-if="success"
      class="fixed inset-0 z-50 bg-[--color-secondary]/90 backdrop-blur-md
             flex items-center justify-center px-6"
    >
      <div class="text-center max-w-sm">
        <span
          class="material-symbols-outlined text-6xl text-[--color-accent] mb-6 block"
          style="font-variation-settings: 'FILL' 1"
        >check_circle</span>
        <h2 class="font-serif text-3xl text-[--color-on-surface] mb-3">Reservation Confirmed</h2>
        <p class="font-sans text-sm text-[--color-on-muted] leading-relaxed">
          Your sanctuary awaits. Redirecting you to your bookings…
        </p>
      </div>
    </div>
  </Transition>

  <div class="max-w-7xl mx-auto px-6 md:px-16 py-16">

    <!-- Page header -->
    <header class="mb-14">
      <p class="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-[--color-primary] mb-3">
        Reservation
      </p>
      <h1 class="font-serif text-5xl md:text-6xl text-[--color-on-surface] tracking-tight mb-4">
        Secure Your <em class="text-[--color-primary]">Sanctuary</em>
      </h1>
      <p class="font-sans text-base text-[--color-on-muted] max-w-xl leading-relaxed">
        Finalise your details below to confirm your stay. We've prepared everything for your arrival.
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

      <!-- ── Left: 3-section form ── -->
      <div class="lg:col-span-8 space-y-14">

        <!-- Section 01 -->
        <div data-section="01" class="section-fade" style="animation-delay: 0.3s">
          <GuestInfoForm :errors="errors" />
        </div>

        <!-- Section 02 -->
        <div class="section-fade" style="animation-delay: 0.45s">
          <StayDetailsForm :errors="errors" />
        </div>

        <!-- Section 03 -->
        <div class="section-fade" style="animation-delay: 0.6s">
          <PreferencesForm />
        </div>

        <!-- Submit error -->
        <Transition
          enter-active-class="transition duration-200"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
        >
          <div
            v-if="errors.submit"
            class="flex items-start gap-2 p-4 rounded-lg bg-[oklch(0.95_0.02_25)] text-[--color-error]"
          >
            <span class="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
            <p class="font-sans text-sm">{{ errors.submit }}</p>
          </div>
        </Transition>

        <!-- CTAs -->
        <div class="flex flex-col sm:flex-row gap-3 pt-2">
          <BaseButton
            variant="primary"
            class="px-10 py-4 text-base justify-center"
            :class="loading && 'opacity-70 pointer-events-none'"
            @click="submit"
          >
            <span
              v-if="loading"
              class="material-symbols-outlined text-base"
              style="animation: spin 1s linear infinite"
            >progress_activity</span>
            <span v-else>Confirm Reservation</span>
          </BaseButton>

          <BaseButton to="/rooms" variant="secondary" class="justify-center">
            Back to Rooms
          </BaseButton>
        </div>

        <p class="font-sans text-xs text-[--color-on-muted]">
          By confirming you agree to our
          <a href="#" class="text-[--color-primary] hover:underline">cancellation policy</a>
          and
          <a href="#" class="text-[--color-primary] hover:underline">terms of service</a>.
        </p>
      </div>

      <!-- ── Right: sticky summary ── -->
      <div class="lg:col-span-4">
        <ReservationSummary />
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes spin { to { transform: rotate(360deg); } }

.section-fade {
  opacity: 0;
  animation: fadeIn 0.6s ease-out forwards;
}
</style>

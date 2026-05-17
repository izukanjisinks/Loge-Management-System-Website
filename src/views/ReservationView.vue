<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBookingStore }      from '@/stores/booking'
import { useAuthStore }         from '@/stores/auth'
import { useReservationsStore } from '@/stores/reservations'
import GuestInfoForm       from '@/components/reservation/GuestInfoForm.vue'
import StayDetailsForm     from '@/components/reservation/StayDetailsForm.vue'
import PreferencesForm     from '@/components/reservation/PreferencesForm.vue'
import ReservationSummary  from '@/components/reservation/ReservationSummary.vue'
import api from '@/lib/api'

const router       = useRouter()
const route        = useRoute()
const booking      = useBookingStore()
const auth         = useAuthStore()
const reservations = useReservationsStore()

const errors  = ref({})
const loading = ref(false)
const success  = ref(false)
const step     = ref(1)

let mounted = false
onMounted(async () => {
  mounted = true
  if (auth.user && !booking.guestInfo.email) {
    booking.guestInfo.email     = auth.user.email     ?? ''
    booking.guestInfo.firstName = auth.user.firstName ?? booking.guestInfo.firstName
    booking.guestInfo.lastName  = auth.user.lastName  ?? booking.guestInfo.lastName
  }

  if (!booking.baseRatePerNight) {
    try {
      const { data } = await api.get(`/guest/rooms/${route.params.roomId}`)
      if (!mounted) return
      const price = parseFloat(data.price_per_night) || 0
      const type  = data.type ? data.type.charAt(0).toUpperCase() + data.type.slice(1) : ''
      booking.setRoom(data.id, type, price)
    } catch { /* leave as-is */ }
  }
})

onUnmounted(() => { mounted = false })

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

function goBack() {
  router.push({ name: 'rooms' })
}

function goToConfirmation() {
  if (!validate()) {
    document.querySelector('[data-section="guest"]')?.scrollIntoView({ behavior: 'smooth' })
    return
  }
  step.value = 2
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function submit() {
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

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const stepDefs = computed(() => [
  { label: 'Selection',     done: true,          active: false },
  { label: 'Guest Details', done: step.value > 1, active: step.value === 1 },
  { label: 'Confirmation',  done: false,          active: step.value === 2 },
])

const progressWidth = computed(() => step.value === 1 ? 'w-1/2' : 'w-full')
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
          Your sanctuary awaits. Redirecting you to your bookings…
        </p>
      </div>
    </div>
  </Transition>

  <div class="w-full max-w-[1280px] mx-auto px-5 md:px-16 py-8">

    <!-- Progress Tracker -->
    <div class="mb-12">
      <div class="flex items-center justify-between max-w-2xl mx-auto relative">
        <div class="absolute top-5 left-0 w-full h-0.5 bg-(--color-surface-container-highest) z-0"></div>
        <div class="absolute top-5 left-0 h-0.5 bg-(--color-primary) z-0 transition-all duration-500" :class="progressWidth"></div>

        <div
          v-for="(s, i) in stepDefs"
          :key="s.label"
          class="relative z-10 flex flex-col items-center gap-2"
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center font-sans text-sm font-semibold transition-colors duration-300"
            :class="s.done
              ? 'bg-(--color-primary) text-white'
              : s.active
                ? 'bg-(--color-primary) text-white border-4 border-(--color-surface)'
                : 'bg-(--color-surface-container-highest) text-(--color-on-surface-variant)'"
          >
            <span v-if="s.done && !s.active" class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1">check</span>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span
            class="font-sans text-xs font-semibold transition-colors duration-300"
            :class="s.active ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'"
          >{{ s.label }}</span>
        </div>
      </div>
    </div>

    <!-- ── Step 1: Forms ─────────────────────────────────────────────── -->
    <template v-if="step === 1">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

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

          <div data-section="guest">
            <GuestInfoForm :errors="errors" />
          </div>

          <StayDetailsForm :errors="errors" />

          <PreferencesForm />

          <!-- CTAs -->
          <div class="flex justify-between items-center pt-4">
            <button
              type="button"
              class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-bold px-6 py-3 hover:bg-primary/5 rounded-full transition-all"
              @click="goBack"
            >
              <span class="material-symbols-outlined">arrow_back</span>
              Back to Rooms
            </button>

            <button
              class="bg-(--color-primary) text-white font-sans text-sm font-bold px-10 py-3 rounded-full hover:bg-(--color-primary-container) transition-all shadow-sm"
              @click="goToConfirmation"
            >
              Review & Confirm
            </button>
          </div>

          <p class="font-sans text-xs text-(--color-on-surface-variant)">
            By confirming you agree to our
            <a href="#" class="text-(--color-primary) hover:underline">cancellation policy</a>
            and
            <a href="#" class="text-(--color-primary) hover:underline">terms of service</a>.
          </p>
        </div>

        <aside class="lg:col-span-4">
          <ReservationSummary />
        </aside>
      </div>
    </template>

    <!-- ── Step 2: Confirmation ──────────────────────────────────────── -->
    <template v-else>
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <div class="lg:col-span-8 space-y-6">

          <!-- Guest details -->
          <section class="bg-(--color-surface-container-lowest) p-8 rounded-xl border border-(--color-outline-variant) shadow-sm">
            <div class="flex items-center justify-between mb-6">
              <h2 class="font-serif text-2xl flex items-center gap-3">
                <span class="material-symbols-outlined text-(--color-primary)">person_outline</span>
                Guest Details
              </h2>
              <button
                class="font-sans text-sm text-(--color-primary) font-semibold hover:underline"
                @click="step = 1"
              >Edit</button>
            </div>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
              <div>
                <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Full Name</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.guestInfo.firstName }} {{ booking.guestInfo.lastName }}</dd>
              </div>
              <div>
                <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Email</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.guestInfo.email }}</dd>
              </div>
              <div>
                <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Phone</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.guestInfo.phone }}</dd>
              </div>
              <div v-if="booking.guestInfo.nationality">
                <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Nationality</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.guestInfo.nationality }}</dd>
              </div>
              <div v-if="booking.guestInfo.passportId">
                <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">ID / Passport</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.guestInfo.passportId }}</dd>
              </div>
            </dl>
          </section>

          <!-- Stay details -->
          <section class="bg-(--color-surface-container-lowest) p-8 rounded-xl border border-(--color-outline-variant) shadow-sm">
            <div class="flex items-center justify-between mb-6">
              <h2 class="font-serif text-2xl flex items-center gap-3">
                <span class="material-symbols-outlined text-(--color-primary)">calendar_month</span>
                Stay Details
              </h2>
              <button
                class="font-sans text-sm text-(--color-primary) font-semibold hover:underline"
                @click="step = 1"
              >Edit</button>
            </div>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
              <div>
                <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Check-in</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ formatDate(booking.checkIn) }}</dd>
              </div>
              <div>
                <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Check-out</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ formatDate(booking.checkOut) }}</dd>
              </div>
              <div>
                <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Duration</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.nightCount }} {{ booking.nightCount === 1 ? 'night' : 'nights' }}</dd>
              </div>
              <div>
                <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Guests</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.guestCount }} {{ booking.guestCount === 1 ? 'Adult' : 'Adults' }}</dd>
              </div>
              <div>
                <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Meal Plan</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.mealPlanName }}</dd>
              </div>
            </dl>
          </section>

          <!-- Preferences -->
          <section v-if="booking.specialRequests" class="bg-(--color-surface-container-lowest) p-8 rounded-xl border border-(--color-outline-variant) shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-serif text-2xl flex items-center gap-3">
                <span class="material-symbols-outlined text-(--color-primary)">tune</span>
                Special Requests
              </h2>
              <button
                class="font-sans text-sm text-(--color-primary) font-semibold hover:underline"
                @click="step = 1"
              >Edit</button>
            </div>
            <p class="font-sans text-sm text-(--color-on-surface) leading-relaxed">{{ booking.specialRequests }}</p>
          </section>

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
            <button
              class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-bold px-6 py-3 hover:bg-primary/5 rounded-full transition-all"
              @click="step = 1"
            >
              <span class="material-symbols-outlined">arrow_back</span>
              Back to Details
            </button>

            <button
              class="bg-(--color-primary) text-white font-sans text-sm font-bold px-10 py-3 rounded-full hover:bg-(--color-primary-container) transition-all shadow-sm disabled:opacity-60"
              :disabled="loading"
              @click="submit"
            >
              <span v-if="loading" class="material-symbols-outlined text-base align-middle" style="animation: spin 1s linear infinite">progress_activity</span>
              <span v-else>Confirm Reservation</span>
            </button>
          </div>

          <p class="font-sans text-xs text-(--color-on-surface-variant)">
            By confirming you agree to our
            <a href="#" class="text-(--color-primary) hover:underline">cancellation policy</a>
            and
            <a href="#" class="text-(--color-primary) hover:underline">terms of service</a>.
          </p>
        </div>

        <aside class="lg:col-span-4">
          <ReservationSummary />
        </aside>
      </div>
    </template>

  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }
</style>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBookingStore }      from '@/stores/booking'
import { useAuthStore }         from '@/stores/auth'
import { useReservationsStore } from '@/stores/reservations'
import StayDetailsForm          from '@/components/reservation/StayDetailsForm.vue'
import PreferencesForm          from '@/components/reservation/PreferencesForm.vue'
import ReservationSummary       from '@/components/reservation/ReservationSummary.vue'
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
      booking.setRoom(data.id, type, price, data.organization?.id ?? null, data.organization?.name ?? '')
    } catch { /* leave as-is */ }
  }
})

onUnmounted(() => { mounted = false })

// ── Validation ────────────────────────────────────────────────────────
function validate() {
  const e = {}
  const g = booking.guestInfo
  if (!g.firstName)      e.firstName = 'Required'
  if (!g.lastName)       e.lastName  = 'Required'
  if (!g.email)          e.email     = 'Required'
  else if (!/\S+@\S+\.\S+/.test(g.email)) e.email = 'Enter a valid email'
  if (!g.phone)          e.phone     = 'Required'
  if (!booking.checkIn)  e.checkIn   = 'Required'
  if (!booking.checkOut) e.checkOut  = 'Required'
  errors.value = e
  return Object.keys(e).length === 0
}

function goToConfirmation() {
  if (!validate()) return
  step.value = 2
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function submit() {
  loading.value = true
  try {
    await reservations.create({
      bookingType:     'individual',
      roomId:          booking.roomId,
      checkIn:         booking.checkIn,
      checkOut:        booking.checkOut,
      guestCount:      booking.guestCount,
      mealPlanId:      booking.mealPlanId,
      specialRequests: booking.specialRequests,
      client:          booking.guestInfo,
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

function goBack() {
  if (step.value === 2) { step.value = 1; return }
  if (booking.lodgeId) {
    router.push({ name: 'lodge-detail', params: { id: booking.lodgeId } })
  } else {
    router.push({ name: 'lodges' })
  }
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const stepDefs = computed(() => [
  { label: 'Selection',     done: true,           active: false },
  { label: 'Guest Details', done: step.value > 1, active: step.value === 1 },
  { label: 'Confirmation',  done: false,           active: step.value === 2 },
])
</script>

<template>
  <!-- Success overlay -->
  <Transition enter-active-class="transition duration-500" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
    <div v-if="success" class="fixed inset-0 z-50 bg-(--color-background) backdrop-blur-md flex items-center justify-center px-5">
      <div class="text-center max-w-sm">
        <span class="material-symbols-outlined text-6xl text-(--color-primary) mb-6 block" style="font-variation-settings: 'FILL' 1">check_circle</span>
        <h2 class="font-serif text-3xl text-(--color-on-surface) mb-3">Reservation Confirmed</h2>
        <p class="font-sans text-base text-(--color-on-surface-variant) leading-relaxed">Your sanctuary awaits. Redirecting you to your bookings…</p>
      </div>
    </div>
  </Transition>

  <div class="w-full max-w-[1280px] mx-auto px-5 md:px-16 py-8">

    <!-- ── Stepper ──────────────────────────────────────────────────── -->
    <nav class="flex justify-center items-center py-6 gap-6 w-full max-w-2xl mx-auto mb-6">
      <div v-for="(s, i) in stepDefs" :key="s.label" class="flex items-center gap-6">
        <div class="flex items-center gap-2" :class="s.active ? 'text-(--color-primary) font-bold' : 'text-(--color-outline)'">
          <span v-if="s.done && !s.active" class="material-symbols-outlined text-(--color-primary)" style="font-variation-settings: 'FILL' 1">check_circle</span>
          <span v-else class="material-symbols-outlined" :class="s.active ? 'text-(--color-primary)' : 'text-(--color-outline)'">
            {{ `counter_${i + 1}` }}
          </span>
          <span class="font-sans text-sm font-semibold hidden sm:inline">{{ s.label }}</span>
        </div>
        <div v-if="i < stepDefs.length - 1" class="h-px w-8 bg-(--color-outline-variant)"></div>
      </div>
    </nav>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      <!-- ── Left ──────────────────────────────────────────────────── -->
      <div class="lg:col-span-8 space-y-6">

        <!-- ════ STEP 1: FORM ════ -->
        <template v-if="step === 1">

          <!-- Primary Guest Details -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center gap-2 mb-6">
              <span class="material-symbols-outlined text-(--color-primary)">person</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Primary Guest Details</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">First Name <span class="text-(--color-error)">*</span></label>
                <input v-model="booking.guestInfo.firstName" type="text" placeholder="Tendai"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.firstName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.firstName" class="font-sans text-xs text-(--color-error)">{{ errors.firstName }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Last Name <span class="text-(--color-error)">*</span></label>
                <input v-model="booking.guestInfo.lastName" type="text" placeholder="Mokoena"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.lastName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.lastName" class="font-sans text-xs text-(--color-error)">{{ errors.lastName }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email Address <span class="text-(--color-error)">*</span></label>
                <input v-model="booking.guestInfo.email" type="email" placeholder="you@example.com"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.email ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.email" class="font-sans text-xs text-(--color-error)">{{ errors.email }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Phone Number <span class="text-(--color-error)">*</span></label>
                <input v-model="booking.guestInfo.phone" type="tel" placeholder="+260 97 000 0000"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.phone ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.phone" class="font-sans text-xs text-(--color-error)">{{ errors.phone }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">ID / Passport Number</label>
                <input v-model="booking.guestInfo.passportId" type="text" placeholder="Optional"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
            </div>
          </section>

          <!-- Stay Details -->
          <StayDetailsForm :errors="errors" />

          <!-- Additional Requests -->
          <PreferencesForm />

          <!-- Submit error -->
          <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
            <div v-if="errors.submit" class="flex items-start gap-2 p-4 rounded-lg bg-(--color-error-container) text-(--color-on-error-container)">
              <span class="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
              <p class="font-sans text-sm">{{ errors.submit }}</p>
            </div>
          </Transition>

          <!-- CTAs -->
          <div class="flex justify-between items-center pt-2">
            <button type="button"
              class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold px-6 py-3 border border-(--color-primary) rounded-lg hover:bg-(--color-surface-container-low) transition-all"
              @click="goBack">
              <span class="material-symbols-outlined text-base">arrow_back</span>
              Back to Rooms
            </button>
            <button type="button"
              class="h-14 px-10 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-lg hover:bg-(--color-primary-container) transition-all"
              @click="goToConfirmation">
              Review &amp; Confirm
            </button>
          </div>

          <p class="font-sans text-xs text-(--color-on-surface-variant)">
            By confirming you agree to our
            <a href="#" class="text-(--color-primary) hover:underline">cancellation policy</a>
            and
            <a href="#" class="text-(--color-primary) hover:underline">terms of service</a>.
          </p>

        </template>

        <!-- ════ STEP 2: CONFIRMATION ════ -->
        <template v-else>

          <!-- Guest summary -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-8 border border-(--color-outline-variant)">
            <div class="flex items-center justify-between mb-6">
              <h2 class="font-serif text-xl flex items-center gap-2">
                <span class="material-symbols-outlined text-(--color-primary)">person</span>
                Guest Details
              </h2>
              <button class="font-sans text-sm text-(--color-primary) font-semibold hover:underline" @click="step = 1">Edit</button>
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
              <div v-if="booking.guestInfo.passportId">
                <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">ID / Passport</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.guestInfo.passportId }}</dd>
              </div>
            </dl>
          </section>

          <!-- Stay details -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-8 border border-(--color-outline-variant)">
            <div class="flex items-center justify-between mb-6">
              <h2 class="font-serif text-xl flex items-center gap-2">
                <span class="material-symbols-outlined text-(--color-primary)">calendar_month</span>
                Stay Details
              </h2>
              <button class="font-sans text-sm text-(--color-primary) font-semibold hover:underline" @click="step = 1">Edit</button>
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

          <section v-if="booking.specialRequests" class="bg-(--color-surface-container-lowest) rounded-xl p-8 border border-(--color-outline-variant)">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-serif text-xl flex items-center gap-2">
                <span class="material-symbols-outlined text-(--color-primary)">notes</span>
                Special Requests
              </h2>
              <button class="font-sans text-sm text-(--color-primary) font-semibold hover:underline" @click="step = 1">Edit</button>
            </div>
            <p class="font-sans text-sm text-(--color-on-surface) leading-relaxed">{{ booking.specialRequests }}</p>
          </section>

          <!-- Submit error -->
          <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
            <div v-if="errors.submit" class="flex items-start gap-2 p-4 rounded-lg bg-(--color-error-container) text-(--color-on-error-container)">
              <span class="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
              <p class="font-sans text-sm">{{ errors.submit }}</p>
            </div>
          </Transition>

          <!-- CTAs -->
          <div class="flex justify-between items-center pt-2">
            <button type="button"
              class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold px-6 py-3 border border-(--color-primary) rounded-lg hover:bg-(--color-surface-container-low) transition-all"
              @click="goBack">
              <span class="material-symbols-outlined text-base">arrow_back</span>
              Back to Details
            </button>
            <button type="button"
              class="h-14 px-10 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-lg hover:bg-(--color-primary-container) transition-all shadow-md disabled:opacity-60"
              :disabled="loading"
              @click="submit">
              <span v-if="loading" class="material-symbols-outlined text-base align-middle animate-spin">progress_activity</span>
              <span v-else>Confirm Reservation</span>
            </button>
          </div>

          <p class="font-sans text-xs text-(--color-on-surface-variant)">
            By confirming you agree to our
            <a href="#" class="text-(--color-primary) hover:underline">cancellation policy</a>
            and
            <a href="#" class="text-(--color-primary) hover:underline">terms of service</a>.
          </p>

        </template>
      </div>

      <!-- ── Right: Summary ─────────────────────────────────────────── -->
      <aside class="lg:col-span-4">
        <ReservationSummary />
      </aside>

    </div>
  </div>
</template>

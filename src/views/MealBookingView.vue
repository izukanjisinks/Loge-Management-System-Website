<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLodgesStore } from '@/stores/lodges'
import { useAuthStore } from '@/stores/auth'
import { useMealBookingStore } from '@/stores/mealBooking'
import { MEAL_PERIODS, SERVICE_TYPES } from '@/data/bookingConstants'

const route       = useRoute()
const router      = useRouter()
const lodgesStore = useLodgesStore()
const auth        = useAuthStore()
const mb          = useMealBookingStore()

const lodgeId        = route.params.id
const lodge          = computed(() => lodgesStore.lodges.find(l => String(l.id) === String(lodgeId)))
const branches       = computed(() => lodgesStore.branchesFor(lodgeId))
const selectedBranch = computed(() => branches.value?.find(b => String(b.id) === String(mb.branchId)) ?? null)

// ── Multi-step ─────────────────────────────────────────────────────────────
const step        = ref(1)
const loading     = ref(false)
const success     = ref(false)
const errors      = ref({})
const submitError = ref('')

// ── UI state ───────────────────────────────────────────────────────────────
const attendantsExpanded  = ref(false)
const expandedMealOverride = ref(null)

// ── Day-range helpers ───────────────────────────────────────────────────────
const dayRange = computed(() => {
  if (!mb.startDate || !mb.endDate || mb.endDate < mb.startDate) return []
  const [sy, sm, sd] = mb.startDate.split('-').map(Number)
  const [ey, em, ed] = mb.endDate.split('-').map(Number)
  const start = new Date(Date.UTC(sy, sm - 1, sd))
  const end   = new Date(Date.UTC(ey, em - 1, ed))
  const dates = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1))
    dates.push(d.toISOString().slice(0, 10))
  return dates
})

watch(dayRange, range => { if (range.length <= 1) mb.scheduleMode = 'uniform' })

const mealDaySummary = computed(() => {
  const total      = dayRange.value.length
  const skipped    = Object.values(mb.mealOverrides).filter(o =>  o.excluded).length
  const customised = Object.values(mb.mealOverrides).filter(o => !o.excluded).length
  return { total, skipped, customised, defaultCount: total - skipped - customised }
})

function fmtDayLabel(iso) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function mealDayStatus(date) {
  const ov = mb.mealOverrides[date]
  if (!ov) return 'default'
  return ov.excluded ? 'skipped' : 'overridden'
}

function startMealOverride(date) {
  mb.setMealOverride(date)
  expandedMealOverride.value = expandedMealOverride.value === date ? null : date
}

function collapseMealOverride(date) {
  mb.clearMealOverride(date)
  if (expandedMealOverride.value === date) expandedMealOverride.value = null
}

function mealLabel(m, i) {
  return m.sessionName || MEAL_PERIODS.find(p => p.value === m.mealPeriod)?.label || `Meal ${i + 1}`
}

// ── Validation ──────────────────────────────────────────────────────────────
function validate() {
  const e = {}

  if (!mb.bookedBy.name)  e.bookedByName  = 'Required'
  if (!mb.bookedBy.email) e.bookedByEmail = 'Required'
  else if (!/\S+@\S+\.\S+/.test(mb.bookedBy.email)) e.bookedByEmail = 'Enter a valid email'

  if (!mb.startDate) e.startDate = 'Required'
  if (!mb.endDate)   e.endDate   = 'Required'

  if (mb.isCorporate && !mb.companyName) e.companyName = 'Required'

  errors.value = e
  return Object.keys(e).length === 0
}

function goToReview() {
  if (!validate()) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  step.value = 2
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function handleSubmit() {
  loading.value     = true
  submitError.value = ''
  try {
    await mb.submit()
    success.value = true
    mb.reset()
    setTimeout(() => router.push({ name: 'bookings' }), 2500)
  } catch (err) {
    submitError.value = err.response?.data?.error?.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

function goBack() {
  if (step.value === 2) { step.value = 1; return }
  router.push({ name: 'lodge-detail', params: { id: lodgeId } })
}

// ── Init ────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await lodgesStore.fetchLodges()
  lodgesStore.fetchLodgeDetail(lodgeId)
  mb.setLodge(lodgeId, lodge.value?.name ?? '')

  const q = route.query
  if (q.branchId && !mb.branchId) mb.branchId = q.branchId
  if (q.context === 'corporate')  mb.bookingContext = 'corporate'

  mb.fillFromAuth(auth.user)
})
</script>

<template>
  <!-- Success overlay -->
  <Transition enter-active-class="transition duration-500" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
    <div v-if="success" class="fixed inset-0 z-50 bg-(--color-background) flex items-center justify-center px-5">
      <div class="text-center max-w-sm">
        <span class="material-symbols-outlined text-6xl text-(--color-primary) mb-6 block" style="font-variation-settings: 'FILL' 1">check_circle</span>
        <h2 class="font-serif text-3xl text-(--color-on-surface) mb-3">Meal Booking Submitted</h2>
        <p class="font-sans text-base text-(--color-on-surface-variant) leading-relaxed">Your catering request has been received. The property team will confirm your meal plan and dietary arrangements. Redirecting…</p>
      </div>
    </div>
  </Transition>

  <div class="w-full max-w-[1280px] mx-auto px-5 md:px-16 py-8 pb-24">

    <!-- Back -->
    <button type="button"
      class="flex items-center gap-1.5 font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) mb-6 transition-colors"
      @click="goBack">
      <span class="material-symbols-outlined text-base">arrow_back</span>
      {{ step === 2 ? 'Back to Details' : (lodge?.name ?? 'Lodge') }}
    </button>

    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-1">
        <span class="material-symbols-outlined text-(--color-primary)" style="font-variation-settings: 'FILL' 1">restaurant</span>
        <h1 class="font-serif text-3xl font-semibold text-(--color-on-surface)">Meal Booking</h1>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <p v-if="lodge" class="font-sans text-sm text-(--color-on-surface-variant)">{{ lodge.name }}</p>
        <span v-if="selectedBranch" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
          <span class="material-symbols-outlined text-sm">location_on</span>{{ selectedBranch.name }}
        </span>
      </div>
    </div>

    <!-- Stepper -->
    <nav class="flex items-center gap-4 mb-8">
      <div v-for="(s, i) in [{ label: 'Details' }, { label: 'Confirm' }]" :key="s.label" class="flex items-center gap-4">
        <div class="flex items-center gap-2"
          :class="step > i ? 'text-(--color-primary)' : 'text-(--color-outline)'">
          <span v-if="step > i + 1" class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1">check_circle</span>
          <span v-else class="material-symbols-outlined">{{ step === i + 1 ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
          <span class="font-sans text-sm font-semibold">{{ s.label }}</span>
        </div>
        <div v-if="i === 0" class="h-px w-10 bg-(--color-outline-variant)"></div>
      </div>
    </nav>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      <!-- ── Main column ─────────────────────────────────────────────────── -->
      <div class="lg:col-span-8 space-y-5">

        <!-- ══ STEP 1 ══ -->
        <template v-if="step === 1">

          <!-- ─── Booking context ─── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) p-5">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-3">Booking Type</p>
            <div class="grid grid-cols-2 gap-3">
              <button type="button" @click="mb.bookingContext = 'individual'"
                class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                :class="!mb.isCorporate
                  ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                  : 'border-(--color-outline-variant) hover:border-(--color-primary)'">
                <span class="material-symbols-outlined text-xl mt-0.5 shrink-0"
                  :class="!mb.isCorporate ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">person</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Individual / Guest</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5 leading-snug">Personal dining, room service, small group catering</p>
                </div>
              </button>
              <button type="button" @click="mb.bookingContext = 'corporate'"
                class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                :class="mb.isCorporate
                  ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                  : 'border-(--color-outline-variant) hover:border-(--color-primary)'">
                <span class="material-symbols-outlined text-xl mt-0.5 shrink-0"
                  :class="mb.isCorporate ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">corporate_fare</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Corporate / Group</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5 leading-snug">Conference catering, banquets, delegate meal plans</p>
                </div>
              </button>
            </div>
          </section>

          <!-- ─── Corporate: Company ─── -->
          <section v-if="mb.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
            <div class="flex items-center gap-3 px-6 py-5 border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-(--color-primary)">business</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Company Information</h2>
            </div>
            <div class="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1 sm:col-span-2">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Company Name <span class="text-(--color-error)">*</span></label>
                <input v-model="mb.companyName" type="text"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.companyName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.companyName" class="font-sans text-xs text-(--color-error)">{{ errors.companyName }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">TPIN / Reg No.</label>
                <input v-model="mb.tpin" type="text" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Department</label>
                <input v-model="mb.departmentName" type="text" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Billing Email</label>
                <input v-model="mb.companyEmail" type="email" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Cost Centre</label>
                <input v-model="mb.costCenter" type="text" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">GL Code</label>
                <input v-model="mb.glCode" type="text" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
            </div>
          </section>

          <!-- ─── Corporate: Approver ─── -->
          <section v-if="mb.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
            <div class="flex items-center gap-3 px-6 py-5 border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-(--color-primary)">verified_user</span>
              <div>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Approver</h2>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">Person authorising this catering request</p>
              </div>
            </div>
            <div class="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full Name</label>
                <input v-model="mb.approverName" type="text" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Job Title</label>
                <input v-model="mb.approverTitle" type="text" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email</label>
                <input v-model="mb.approverEmail" type="email" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Phone</label>
                <input v-model="mb.approverPhone" type="tel" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
            </div>
          </section>

          <!-- ─── Booked By ─── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
            <div class="flex items-center gap-4 px-6 py-5 border-b border-(--color-outline-variant)">
              <div class="w-10 h-10 rounded-full bg-(--color-savannah-mist) flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-(--color-primary)" style="font-variation-settings: 'FILL' 1">account_circle</span>
              </div>
              <div>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Booked By</h2>
                <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Primary contact for this catering request</p>
              </div>
            </div>
            <div class="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full Name <span class="text-(--color-error)">*</span></label>
                <input v-model="mb.bookedBy.name" type="text"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.bookedByName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.bookedByName" class="font-sans text-xs text-(--color-error)">{{ errors.bookedByName }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email <span class="text-(--color-error)">*</span></label>
                <input v-model="mb.bookedBy.email" type="email"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.bookedByEmail ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.bookedByEmail" class="font-sans text-xs text-(--color-error)">{{ errors.bookedByEmail }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Phone</label>
                <input v-model="mb.bookedBy.phone" type="tel" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
              <div v-if="mb.isCorporate" class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Job Title</label>
                <input v-model="mb.bookedBy.jobTitle" type="text" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
            </div>
          </section>

          <!-- ─── Individual: Guests ─── -->
          <section v-if="!mb.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
            <button type="button"
              class="flex items-center gap-2 w-full px-6 py-5 text-left hover:bg-(--color-surface-container-low) transition-colors"
              @click="attendantsExpanded = !attendantsExpanded">
              <span class="material-symbols-outlined text-(--color-primary) shrink-0">group</span>
              <div class="flex-1 min-w-0">
                <h2 class="font-serif text-xl text-(--color-on-surface)">Guests / Diners</h2>
                <p v-if="!attendantsExpanded" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">
                  {{ mb.participantMode === 'headcount'
                    ? 'Party of ' + mb.participantCount
                    : mb.attendants.filter(a => a.fullName).length + ' registered' }}
                </p>
              </div>
              <span class="material-symbols-outlined text-(--color-on-surface-variant) transition-transform duration-200 shrink-0"
                :style="{ transform: attendantsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }">expand_more</span>
            </button>
            <div v-if="attendantsExpanded" class="px-6 pb-6 border-t border-(--color-outline-variant)">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 mb-5">
                <button type="button" @click="mb.participantMode = 'headcount'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="mb.participantMode === 'headcount'
                    ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                    : 'border-(--color-outline-variant) hover:border-(--color-primary)'">
                  <span class="material-symbols-outlined text-xl mt-0.5 shrink-0"
                    :class="mb.participantMode === 'headcount' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">group</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Headcount Only</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Total diner count — no individual details</p>
                  </div>
                </button>
                <button type="button" @click="mb.participantMode = 'detailed'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="mb.participantMode === 'detailed'
                    ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                    : 'border-(--color-outline-variant) hover:border-(--color-primary)'">
                  <span class="material-symbols-outlined text-xl mt-0.5 shrink-0"
                    :class="mb.participantMode === 'detailed' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">format_list_bulleted</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Individual Records</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Register guests with dietary preferences per person</p>
                  </div>
                </button>
              </div>
              <div v-if="mb.participantMode === 'headcount'">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Total Diners</label>
                <div class="flex items-center gap-3 mt-2">
                  <input type="number" min="1" v-model.number="mb.participantCount"
                    class="w-28 bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) text-center transition-colors" />
                </div>
              </div>
              <div v-else class="space-y-3">
                <div v-for="(att, i) in mb.attendants" :key="i" class="p-4 bg-(--color-surface-container-low) rounded-xl">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <span class="inline-flex items-center justify-center w-7 h-7 rounded-full font-sans text-xs font-bold shrink-0"
                        :class="att.isLead ? 'bg-(--color-primary) text-white' : 'bg-(--color-surface-container-high) text-(--color-on-surface-variant)'">{{ i + 1 }}</span>
                      <span v-if="att.isLead" class="font-sans text-xs font-semibold text-(--color-primary)">Lead Contact</span>
                    </div>
                    <button type="button" :disabled="mb.attendants.length === 1"
                      class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                      @click="mb.removeAttendant(i)">
                      <span class="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full Name</label>
                      <input v-model="att.fullName" type="text" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Dietary Notes</label>
                      <input v-model="att.dietaryNotes" type="text" placeholder="e.g. Vegetarian, halal, nut allergy"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                    </div>
                  </div>
                </div>
                <button type="button" @click="mb.addAttendant()"
                  class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline">
                  <span class="material-symbols-outlined text-base">person_add</span> Add Guest
                </button>
              </div>
            </div>
          </section>

          <!-- ─── Corporate: Delegates ─── -->
          <section v-if="mb.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) p-6">
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-(--color-primary)">groups</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Number of Covers</h2>
            </div>
            <div class="flex items-center gap-4">
              <input type="number" min="1" v-model.number="mb.participantCount"
                class="w-28 bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) text-center transition-colors" />
              <p class="font-sans text-sm text-(--color-on-surface-variant)">Total covers across all catering sessions</p>
            </div>
          </section>

          <!-- ─── Meal Plan ─── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
            <div class="flex items-center gap-3 px-6 py-5 border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-(--color-primary)">restaurant_menu</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Meal Plan</h2>
            </div>
            <div class="px-6 py-5 space-y-6">

              <!-- Reason -->
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Reason / Occasion</label>
                <textarea v-model="mb.reasonForBooking" rows="2"
                  placeholder="e.g. Conference catering, gala dinner, working lunch, team breakfast…"
                  class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
              </div>

              <!-- Date range -->
              <div class="p-4 bg-(--color-surface-container) rounded-xl border border-(--color-outline-variant)">
                <div class="flex items-start gap-2 mb-4">
                  <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0 mt-0.5">date_range</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Catering Dates</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">One meal plan per day. All days remain fully editable.</p>
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Start Date <span class="text-(--color-error)">*</span></label>
                    <input v-model="mb.startDate" type="date"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.startDate ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors.startDate" class="font-sans text-xs text-(--color-error)">{{ errors.startDate }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">End Date <span class="text-(--color-error)">*</span></label>
                    <input v-model="mb.endDate" type="date" :min="mb.startDate || undefined"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.endDate ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors.endDate" class="font-sans text-xs text-(--color-error)">{{ errors.endDate }}</span>
                  </div>
                </div>
                <div v-if="dayRange.length > 0" class="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--color-savannah-mist) border border-(--color-primary)">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">restaurant</span>
                  <span class="font-sans text-xs font-semibold text-(--color-primary)">
                    {{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }} · {{ fmt(mb.startDate) }}
                    <template v-if="mb.endDate && mb.endDate !== mb.startDate"> – {{ fmt(mb.endDate) }}</template>
                  </span>
                </div>
              </div>

              <!-- Schedule mode -->
              <div v-if="dayRange.length > 1" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" @click="mb.scheduleMode = 'uniform'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="mb.scheduleMode === 'uniform' ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                  <span class="material-symbols-outlined text-xl mt-0.5"
                    :class="mb.scheduleMode === 'uniform' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">calendar_view_week</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Uniform Plan</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Same meals served every day</p>
                  </div>
                </button>
                <button type="button" @click="mb.scheduleMode = 'per_day'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="mb.scheduleMode === 'per_day' ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                  <span class="material-symbols-outlined text-xl mt-0.5"
                    :class="mb.scheduleMode === 'per_day' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">event_note</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Per-Day Plan</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Customise or skip individual days</p>
                  </div>
                </button>
              </div>

              <!-- Scope banner -->
              <div class="p-4 rounded-xl border"
                :class="dayRange.length > 0 ? 'bg-(--color-savannah-mist) border-(--color-primary)' : 'bg-(--color-surface-container) border-(--color-outline-variant)'">
                <div class="flex items-start gap-2">
                  <span class="material-symbols-outlined text-base shrink-0 mt-0.5"
                    :class="dayRange.length > 0 ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">copy_all</span>
                  <p class="font-sans text-sm text-(--color-on-surface)">
                    <template v-if="dayRange.length > 0 && mb.scheduleMode === 'uniform'">
                      Applies to all <strong>{{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }}</strong>.
                    </template>
                    <template v-else-if="dayRange.length > 0">
                      Default for <strong>{{ mealDaySummary.defaultCount }}</strong> of {{ mealDaySummary.total }} day{{ mealDaySummary.total !== 1 ? 's' : '' }}.
                      <span v-if="mealDaySummary.customised"> {{ mealDaySummary.customised }} customised.</span>
                      <span v-if="mealDaySummary.skipped"> {{ mealDaySummary.skipped }} skipped.</span>
                    </template>
                    <template v-else>
                      <span class="text-(--color-on-surface-variant)">Set catering dates above to see how this plan is applied.</span>
                    </template>
                  </p>
                </div>
              </div>

              <!-- ── Master meals ── -->
              <div class="space-y-3">
                <div v-for="(meal, i) in mb.masterMeals" :key="i"
                  class="border border-(--color-outline-variant) rounded-xl overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-3 bg-(--color-surface-container)">
                    <div class="flex items-center gap-2">
                      <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ mealLabel(meal, i) }}</span>
                      <span class="px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary) capitalize">
                        {{ MEAL_PERIODS.find(p => p.value === meal.mealPeriod)?.label ?? meal.mealPeriod }}
                      </span>
                    </div>
                    <button type="button" :disabled="mb.masterMeals.length === 1"
                      class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                      @click="mb.removeMasterMeal(i)">
                      <span class="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                  <div class="p-4 bg-(--color-surface-container-low) space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div class="flex flex-col gap-1 sm:col-span-2">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Session Name</label>
                        <input v-model="meal.sessionName" type="text" placeholder="e.g. Morning Tea, Working Lunch, Networking Dinner"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Meal Period</label>
                        <select v-model="meal.mealPeriod"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                          <option v-for="p in MEAL_PERIODS" :key="p.value" :value="p.value">{{ p.label }}</option>
                        </select>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Service Style</label>
                        <select v-model="meal.serviceType"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                          <option v-for="t in SERVICE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                        </select>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Covers / Pax</label>
                        <input v-model.number="meal.paxCount" type="number" min="1"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Dietary Requirements</label>
                        <input v-model="meal.dietaryNotes" type="text" placeholder="Halal, vegetarian, nut-free, diabetic…"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                      </div>
                      <div v-if="mb.isCorporate" class="flex flex-col gap-1 sm:col-span-2">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Arrangements Notes</label>
                        <textarea v-model="meal.arrangementsNotes" rows="2"
                          placeholder="Table layout, decor, branded napkins, presentation style…"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors resize-none"></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button type="button"
                class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline"
                @click="mb.addMasterMeal()">
                <span class="material-symbols-outlined text-base">add</span>
                {{ mb.scheduleMode === 'per_day' ? 'Add Meal to Default Plan' : 'Add Another Meal' }}
              </button>

              <!-- ── Per-day overrides ── -->
              <div v-if="mb.scheduleMode === 'per_day' && dayRange.length > 0" class="mt-6 pt-6 border-t border-(--color-outline-variant)">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-1">
                  Day-by-Day Plan
                  <span class="text-(--color-outline) font-normal normal-case tracking-normal">({{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }})</span>
                </p>
                <p class="font-sans text-xs text-(--color-on-surface-variant) mb-3">Skip days with no catering, or adjust the menu for individual days.</p>
                <!-- Status strip -->
                <div class="flex items-center gap-2 flex-wrap mb-4">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-(--color-surface-container) font-sans text-xs font-semibold text-(--color-on-surface-variant)">
                    <span class="w-1.5 h-1.5 rounded-full bg-(--color-outline) inline-block"></span>
                    {{ mealDaySummary.defaultCount }} using default
                  </span>
                  <span v-if="mealDaySummary.customised > 0"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                    <span class="w-1.5 h-1.5 rounded-full bg-(--color-primary) inline-block"></span>
                    {{ mealDaySummary.customised }} customised
                  </span>
                  <span v-if="mealDaySummary.skipped > 0"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-(--color-outline-variant) font-sans text-xs font-semibold text-(--color-on-surface-variant)">
                    {{ mealDaySummary.skipped }} no meals
                  </span>
                </div>
                <div class="space-y-2">
                  <div v-for="date in dayRange" :key="date" class="border rounded-xl overflow-hidden"
                    :class="mealDayStatus(date) === 'skipped' ? 'border-(--color-outline-variant) opacity-60' : 'border-(--color-outline-variant)'">
                    <!-- Day row -->
                    <div class="flex items-center justify-between px-4 py-3 bg-(--color-surface-container)">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="font-sans text-sm font-semibold text-(--color-on-surface) shrink-0">{{ fmtDayLabel(date) }}</span>
                        <span v-if="mealDayStatus(date) === 'overridden'"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary) shrink-0">
                          {{ mb.mealOverrides[date].sessions.length }} override{{ mb.mealOverrides[date].sessions.length !== 1 ? 's' : '' }}
                        </span>
                        <span v-else-if="mealDayStatus(date) === 'skipped'"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-outline-variant) font-sans text-xs font-semibold text-(--color-on-surface-variant) shrink-0">
                          No meals
                        </span>
                        <span v-else class="font-sans text-xs text-(--color-on-surface-variant) hidden sm:inline">Using default plan</span>
                      </div>
                      <div class="flex items-center gap-1 shrink-0 ml-2">
                        <button v-if="mealDayStatus(date) !== 'skipped'" type="button"
                          class="font-sans text-xs font-semibold text-(--color-primary) hover:underline px-2 py-1"
                          @click="startMealOverride(date)">
                          {{ mealDayStatus(date) === 'overridden' ? (expandedMealOverride === date ? 'Collapse' : 'Edit') : 'Customise' }}
                        </button>
                        <button v-if="mealDayStatus(date) === 'overridden'" type="button"
                          class="font-sans text-xs text-(--color-on-surface-variant) hover:text-(--color-error) hover:underline px-2 py-1"
                          @click="collapseMealOverride(date)">
                          Reset
                        </button>
                        <button type="button"
                          class="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
                          :class="mealDayStatus(date) === 'skipped'
                            ? 'text-(--color-primary) bg-(--color-savannah-mist)'
                            : 'text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container)'"
                          :title="mealDayStatus(date) === 'skipped' ? 'Restore meals' : 'No meals this day'"
                          @click="mb.toggleMealDayExcluded(date)">
                          <span class="material-symbols-outlined text-base">{{ mealDayStatus(date) === 'skipped' ? 'undo' : 'no_meals' }}</span>
                        </button>
                      </div>
                    </div>
                    <!-- Override editor -->
                    <div v-if="expandedMealOverride === date && mealDayStatus(date) === 'overridden'"
                      class="p-4 bg-(--color-surface-container-low) space-y-3">
                      <div v-for="(m, mi) in mb.mealOverrides[date].sessions" :key="mi"
                        class="border border-(--color-outline-variant) rounded-xl overflow-hidden">
                        <div class="flex items-center justify-between px-4 py-2.5 bg-(--color-surface-container)">
                          <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ mealLabel(m, mi) }}</span>
                          <button type="button" :disabled="mb.mealOverrides[date].sessions.length === 1"
                            class="h-7 w-7 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                            @click="mb.removeOverrideMeal(date, mi)">
                            <span class="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                        <div class="p-4 bg-(--color-savannah-mist) space-y-3">
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Meal Period</label>
                              <select v-model="m.mealPeriod"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                                <option v-for="p in MEAL_PERIODS" :key="p.value" :value="p.value">{{ p.label }}</option>
                              </select>
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Service Style</label>
                              <select v-model="m.serviceType"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                                <option v-for="t in SERVICE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                              </select>
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Covers / Pax</label>
                              <input v-model.number="m.paxCount" type="number" min="1"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Dietary Notes</label>
                              <input v-model="m.dietaryNotes" type="text" placeholder="e.g. Halal, vegan, allergens"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <button type="button"
                        class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline"
                        @click="mb.addOverrideMeal(date)">
                        <span class="material-symbols-outlined text-base">add</span> Add Meal to {{ fmtDayLabel(date) }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          <!-- ─── Notes ─── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-(--color-primary)">notes</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Additional Requests</h2>
            </div>
            <textarea v-model="mb.notes" rows="3"
              placeholder="Service timing, table configuration, themed decor, alcohol preferences, children's menu…"
              class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
          </section>

          <!-- Continue -->
          <div class="flex justify-end pt-2">
            <button type="button" @click="goToReview"
              class="flex items-center gap-2 px-8 py-3 rounded-full bg-(--color-primary) text-white font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors">
              Review Booking
              <span class="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>

        </template>

        <!-- ══ STEP 2: REVIEW ══ -->
        <template v-else>

          <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
            <div v-if="submitError" class="flex items-center gap-2 p-4 rounded-xl bg-(--color-error-container) text-(--color-on-error-container)">
              <span class="material-symbols-outlined text-base shrink-0">error</span>
              <p class="font-sans text-sm">{{ submitError }}</p>
            </div>
          </Transition>

          <div class="flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-sans text-xs font-semibold"
              :class="mb.isCorporate ? 'bg-(--color-primary) text-white' : 'bg-(--color-savannah-mist) text-(--color-primary) border border-(--color-primary)'">
              <span class="material-symbols-outlined text-sm">{{ mb.isCorporate ? 'corporate_fare' : 'person' }}</span>
              {{ mb.isCorporate ? 'Corporate Catering' : 'Individual Dining' }}
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
              <span class="material-symbols-outlined text-sm">restaurant</span>
              Meal Booking
            </span>
          </div>

          <!-- Booked By -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) p-6">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-4">Booking Contact</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
              <div><p class="font-sans text-xs text-(--color-on-surface-variant)">Name</p><p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ mb.bookedBy.name || '—' }}</p></div>
              <div><p class="font-sans text-xs text-(--color-on-surface-variant)">Email</p><p class="font-sans text-sm text-(--color-on-surface)">{{ mb.bookedBy.email || '—' }}</p></div>
              <div>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ mb.isCorporate ? 'Covers' : 'Diners' }}</p>
                <p class="font-sans text-sm text-(--color-on-surface)">
                  {{ mb.participantMode === 'headcount'
                    ? mb.participantCount + ' cover' + (mb.participantCount !== 1 ? 's' : '')
                    : mb.attendants.length + ' registered' }}
                </p>
              </div>
            </div>
          </section>

          <!-- Corporate company -->
          <section v-if="mb.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) p-6">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-4">Company</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
              <div class="sm:col-span-2"><p class="font-sans text-xs text-(--color-on-surface-variant)">Company Name</p><p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ mb.companyName || '—' }}</p></div>
              <div v-if="mb.departmentName"><p class="font-sans text-xs text-(--color-on-surface-variant)">Department</p><p class="font-sans text-sm text-(--color-on-surface)">{{ mb.departmentName }}</p></div>
              <div v-if="mb.costCenter"><p class="font-sans text-xs text-(--color-on-surface-variant)">Cost Centre</p><p class="font-sans text-sm text-(--color-on-surface)">{{ mb.costCenter }}</p></div>
            </div>
            <div v-if="mb.approverName" class="mt-4 pt-4 border-t border-(--color-outline-variant)">
              <p class="font-sans text-xs text-(--color-on-surface-variant) mb-1">Approver</p>
              <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ mb.approverName }}
                <span v-if="mb.approverTitle" class="font-sans text-xs font-normal text-(--color-on-surface-variant)"> · {{ mb.approverTitle }}</span>
              </p>
            </div>
          </section>

          <!-- Meal plan summary -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) p-6">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-4">Meal Plan</p>
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div><p class="font-sans text-xs text-(--color-on-surface-variant)">Start Date</p><p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ fmt(mb.startDate) }}</p></div>
              <div><p class="font-sans text-xs text-(--color-on-surface-variant)">End Date</p><p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ fmt(mb.endDate) }}</p></div>
              <div><p class="font-sans text-xs text-(--color-on-surface-variant)">Days</p><p class="font-sans text-sm text-(--color-on-surface)">{{ dayRange.length || '—' }}</p></div>
              <div><p class="font-sans text-xs text-(--color-on-surface-variant)">Schedule</p><p class="font-sans text-sm text-(--color-on-surface) capitalize">{{ mb.scheduleMode.replace('_', '-') }}</p></div>
            </div>
            <div v-if="mb.reasonForBooking" class="mb-4 pb-4 border-b border-(--color-outline-variant)">
              <p class="font-sans text-xs text-(--color-on-surface-variant) mb-1">Reason</p>
              <p class="font-sans text-sm text-(--color-on-surface)">{{ mb.reasonForBooking }}</p>
            </div>
            <div class="space-y-3 pt-2">
              <p class="font-sans text-xs font-semibold text-(--color-on-surface-variant)">Meals ({{ mb.masterMeals.length }} per day)</p>
              <div v-for="(m, i) in mb.masterMeals" :key="i"
                class="flex items-start justify-between gap-3 py-2 border-b border-(--color-outline-variant) last:border-0">
                <div class="min-w-0">
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ mealLabel(m, i) }}</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">
                    {{ SERVICE_TYPES.find(t => t.value === m.serviceType)?.label ?? m.serviceType }}
                    <template v-if="m.dietaryNotes"> · {{ m.dietaryNotes }}</template>
                  </p>
                </div>
                <span class="font-sans text-xs text-(--color-on-surface-variant) shrink-0 mt-0.5">{{ m.paxCount }} cover{{ m.paxCount !== 1 ? 's' : '' }}</span>
              </div>
            </div>
            <div v-if="mealDaySummary.customised > 0" class="mt-3 flex items-center gap-2">
              <span class="material-symbols-outlined text-sm text-(--color-primary)">event_note</span>
              <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ mealDaySummary.customised }} day{{ mealDaySummary.customised !== 1 ? 's' : '' }} with custom menu</p>
            </div>
            <div v-if="mealDaySummary.skipped > 0" class="mt-1 flex items-center gap-2">
              <span class="material-symbols-outlined text-sm text-(--color-outline)">no_meals</span>
              <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ mealDaySummary.skipped }} day{{ mealDaySummary.skipped !== 1 ? 's' : '' }} with no catering</p>
            </div>
            <div v-if="mb.notes" class="mt-4 pt-4 border-t border-(--color-outline-variant)">
              <p class="font-sans text-xs text-(--color-on-surface-variant) mb-1">Additional Requests</p>
              <p class="font-sans text-sm text-(--color-on-surface)">{{ mb.notes }}</p>
            </div>
          </section>

          <!-- Submit -->
          <div class="flex gap-3 pt-2">
            <button type="button" @click="step = 1"
              class="flex-1 py-3.5 rounded-full border border-(--color-outline-variant) font-sans text-sm font-semibold text-(--color-on-surface-variant) hover:bg-(--color-surface-container) transition-colors">
              Edit Details
            </button>
            <button type="button" @click="handleSubmit" :disabled="loading"
              class="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-(--color-primary) text-white font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors disabled:opacity-60">
              <span v-if="loading" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
              <span v-else class="material-symbols-outlined text-base">check</span>
              {{ loading ? 'Submitting…' : 'Confirm Booking' }}
            </button>
          </div>

        </template>
      </div>

      <!-- ── Sidebar ───────────────────────────────────────────────────────── -->
      <aside class="lg:col-span-4 lg:sticky lg:top-8 space-y-4">
        <div class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) p-5">
          <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-4">Booking Summary</p>

          <div class="flex items-center gap-3 mb-4 pb-4 border-b border-(--color-outline-variant)">
            <span class="material-symbols-outlined text-(--color-primary)">villa</span>
            <div class="min-w-0">
              <p class="font-sans text-sm font-semibold text-(--color-on-surface) truncate">{{ lodge?.name ?? '—' }}</p>
              <p v-if="selectedBranch" class="font-sans text-xs text-(--color-on-surface-variant)">{{ selectedBranch.name }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 mb-4">
            <span class="material-symbols-outlined text-sm" :class="mb.isCorporate ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">
              {{ mb.isCorporate ? 'corporate_fare' : 'person' }}
            </span>
            <span class="font-sans text-sm text-(--color-on-surface)">{{ mb.isCorporate ? 'Corporate Catering' : 'Individual Dining' }}</span>
          </div>

          <div v-if="mb.startDate || mb.endDate" class="space-y-2 mb-4 pb-4 border-b border-(--color-outline-variant)">
            <div class="flex justify-between items-center">
              <span class="font-sans text-xs text-(--color-on-surface-variant)">Start</span>
              <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ fmt(mb.startDate) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="font-sans text-xs text-(--color-on-surface-variant)">End</span>
              <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ fmt(mb.endDate) }}</span>
            </div>
            <div v-if="dayRange.length > 0" class="flex justify-between items-center">
              <span class="font-sans text-xs text-(--color-on-surface-variant)">Days</span>
              <span class="font-sans text-sm text-(--color-primary) font-semibold">{{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }}</span>
            </div>
          </div>
          <div v-else class="mb-4 pb-4 border-b border-(--color-outline-variant)">
            <p class="font-sans text-sm text-(--color-outline) italic">No dates selected yet</p>
          </div>

          <div class="space-y-2">
            <p class="font-sans text-xs font-semibold text-(--color-on-surface-variant)">Meals per day</p>
            <div v-for="(m, i) in mb.masterMeals" :key="i" class="flex items-center gap-2 py-1">
              <span class="material-symbols-outlined text-sm text-(--color-primary)">restaurant</span>
              <div class="min-w-0 flex-1">
                <p class="font-sans text-xs font-semibold text-(--color-on-surface) truncate">{{ mealLabel(m, i) }}</p>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ m.paxCount }} cover{{ m.paxCount !== 1 ? 's' : '' }} · {{ SERVICE_TYPES.find(t => t.value === m.serviceType)?.label ?? m.serviceType }}</p>
              </div>
            </div>
          </div>

          <div v-if="mb.participantCount" class="mt-4 pt-4 border-t border-(--color-outline-variant) flex justify-between items-center">
            <span class="font-sans text-xs text-(--color-on-surface-variant)">Total covers</span>
            <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ mb.participantCount }}</span>
          </div>
        </div>
      </aside>

    </div>
  </div>
</template>

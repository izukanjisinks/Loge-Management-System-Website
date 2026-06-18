<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLodgesStore } from '@/stores/lodges'
import { useAuthStore } from '@/stores/auth'
import { useIndividualBookingStore } from '@/stores/individualBooking'
import api from '@/lib/api'
import { DUMMY_CONFERENCE_ROOMS, DUMMY_MENU_ITEMS } from '@/data/dummyCorporateData'
import { EVENT_TYPES, SETUP_TYPES, PRICING_BASIS, MEAL_PERIODS, SERVICE_TYPES } from '@/data/bookingConstants'

const route        = useRoute()
const router       = useRouter()
const lodgesStore  = useLodgesStore()
const auth         = useAuthStore()
const ib           = useIndividualBookingStore()

const lodgeId        = route.params.id
const lodge          = computed(() => lodgesStore.lodges.find(l => String(l.id) === String(lodgeId)))
const branches       = computed(() => lodgesStore.branchesFor(lodgeId))
const selectedBranch = computed(() => branches.value.find(b => String(b.id) === String(ib.branchId)) ?? null)

// ── Multi-step ─────────────────────────────────────────────────────────────
const step        = ref(1)
const loading     = ref(false)
const success     = ref(false)
const errors      = ref({})
const submitError = ref('')

// ── Section state ──────────────────────────────────────────────────────────
const attendantsExpanded = ref(false)
const bookedByEditing    = ref(false)

// ── Tabs ───────────────────────────────────────────────────────────────────
const activeTab = ref('guest')

const TABS = [
  { key: 'guest',         label: 'Guest',         shortLabel: 'Guest',  icon: 'person'     },
  { key: 'accommodation', label: 'Accommodation', shortLabel: 'Rooms',  icon: 'bed'        },
  { key: 'events',        label: 'Events',        shortLabel: 'Events', icon: 'event'      },
  { key: 'meals',         label: 'Meals',         shortLabel: 'Meals',  icon: 'restaurant' },
]

const tabHasError = computed(() => ({
  guest:         ['bookedByName', 'bookedByEmail'].some(k => errors.value[k])
                   || Object.keys(errors.value).some(k => k.startsWith('att_')),
  accommodation: ['accomCheckIn', 'accomCheckOut'].some(k => errors.value[k]),
  events:        Object.keys(errors.value).some(k => k.startsWith('ev_')) || !!errors.value.eventsEndDate,
  meals:         false,
}))

function isServiceEnabled(key) {
  if (key === 'accommodation') return ib.accommodationEnabled
  if (key === 'events')        return ib.eventsEnabled
  if (key === 'meals')         return ib.mealsEnabled
  return false
}

function toggleService(key) {
  const wasEnabled = isServiceEnabled(key)
  if (key === 'accommodation') ib.accommodationEnabled = !ib.accommodationEnabled
  if (key === 'events')        ib.eventsEnabled        = !ib.eventsEnabled
  if (key === 'meals')         ib.mealsEnabled         = !ib.mealsEnabled
  if (!wasEnabled) activeTab.value = key
  else if (activeTab.value === key) activeTab.value = 'guest'
}

// ── Stepper ────────────────────────────────────────────────────────────────
const stepDefs = computed(() => [
  { label: 'Services', active: step.value === 1 },
  { label: 'Confirm',  active: step.value === 2 },
])

// ── Room availability ──────────────────────────────────────────────────────
const availableRooms = ref([])
const roomsLoading   = ref(false)
const roomsError     = ref(false)

async function fetchAvailableRooms() {
  const { checkIn, checkOut } = ib.accommodation
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    availableRooms.value = []
    return
  }
  roomsLoading.value = true
  roomsError.value   = false
  try {
    const params = { org_id: lodgeId, check_in: checkIn, check_out: checkOut, page_size: 100 }
    if (ib.branchId) params.branch_id = ib.branchId
    const { data } = await api.get('/guest/rooms', { params })
    availableRooms.value = (data.data ?? data).filter(r => r.available !== false)
  } catch {
    roomsError.value     = true
    availableRooms.value = []
  } finally {
    roomsLoading.value = false
  }
}

const expandedPickerIdx = ref(null)

// Local room helpers — defined in the view to avoid Pinia HMR stale-store issues.
// ib.accommodation is a reactive object so direct mutations are tracked fine.
function ensureRoomsArray() {
  if (!Array.isArray(ib.accommodation.attendantRooms)) {
    ib.accommodation.attendantRooms = []
  }
}

function getAttendantRoom(idx) {
  ensureRoomsArray()
  return ib.accommodation.attendantRooms.find(r => r.attendantIdx === idx) ?? null
}

function setAttendantRoom(idx, room) {
  ensureRoomsArray()
  const rooms    = ib.accommodation.attendantRooms
  const existing = rooms.findIndex(r => r.attendantIdx === idx)
  const entry    = { attendantIdx: idx, roomId: room.id, roomName: room.name, roomType: room.type, rate: room.price_per_night }
  if (existing >= 0) rooms.splice(existing, 1, entry)
  else rooms.push(entry)
}

function clearAttendantRoom(idx) {
  ensureRoomsArray()
  ib.accommodation.attendantRooms = ib.accommodation.attendantRooms.filter(r => r.attendantIdx !== idx)
}

function selectRoomForAttendant(attendantIdx, room) {
  setAttendantRoom(attendantIdx, room)
  expandedPickerIdx.value = null
}

function togglePicker(idx) {
  expandedPickerIdx.value = expandedPickerIdx.value === idx ? null : idx
  // If opening the picker and rooms haven't been loaded yet, fetch now
  if (expandedPickerIdx.value !== null && !availableRooms.value.length && !roomsLoading.value) {
    const { checkIn, checkOut } = ib.accommodation
    if (checkIn && checkOut && checkOut > checkIn) fetchAvailableRooms()
  }
}

watch(
  () => [ib.accommodation.checkIn, ib.accommodation.checkOut],
  ([ci, co]) => {
    ensureRoomsArray()
    ib.accommodation.attendantRooms = []
    expandedPickerIdx.value = null
    if (ci && co && co > ci) fetchAvailableRooms()
    else availableRooms.value = []
  }
)

function nights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  return Math.max(0, Math.floor((new Date(checkOut) - new Date(checkIn)) / 86400000))
}

function roomTypeLabel(type) {
  if (!type) return 'Room'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

// ── Event schedule helpers ─────────────────────────────────────────────────
const dayRange = computed(() => {
  const { startDate, endDate } = ib.events
  if (!startDate || !endDate || endDate < startDate) return []
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const start = new Date(Date.UTC(sy, sm - 1, sd))
  const end   = new Date(Date.UTC(ey, em - 1, ed))
  const dates = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1))
    dates.push(d.toISOString().slice(0, 10))
  return dates
})

const expandedDayOverride = ref(null)

const eventDaySummary = computed(() => {
  const total      = dayRange.value.length
  const skipped    = Object.values(ib.events.dayOverrides).filter(o =>  o.excluded).length
  const customised = Object.values(ib.events.dayOverrides).filter(o => !o.excluded).length
  return { total, skipped, customised, defaultCount: total - skipped - customised }
})

function fmtDayLabel(iso) {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function dayStatus(date) {
  const ov = ib.events.dayOverrides[date]
  if (!ov) return 'default'
  return ov.excluded ? 'skipped' : 'overridden'
}

function startDayOverride(date) {
  ib.setDayOverride(date)
  expandedDayOverride.value = expandedDayOverride.value === date ? null : date
}

function collapseDayOverride(date) {
  ib.clearDayOverride(date)
  if (expandedDayOverride.value === date) expandedDayOverride.value = null
}

function sessionLabel(s, i) {
  return s.sessionName || `Session ${i + 1}`
}

// ── Meal helpers ───────────────────────────────────────────────────────────
const mealDayRange = computed(() => {
  const useEvents = ib.meals.mealMode === 'event_linked' && ib.eventsEnabled
  const startDate = useEvents ? ib.events.startDate : ib.meals.startDate
  const endDate   = useEvents ? ib.events.endDate   : ib.meals.endDate
  if (!startDate || !endDate || endDate < startDate) return []
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const start = new Date(Date.UTC(sy, sm - 1, sd))
  const end   = new Date(Date.UTC(ey, em - 1, ed))
  const dates = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1))
    dates.push(d.toISOString().slice(0, 10))
  return dates
})

const expandedMealDayOverride = ref(null)

function mealDayStatus(date) {
  const ov = ib.meals.mealOverrides[date]
  if (!ov) return 'default'
  return ov.excluded ? 'skipped' : 'overridden'
}

function startMealDayOverride(date) {
  ib.setMealOverride(date)
  expandedMealDayOverride.value = expandedMealDayOverride.value === date ? null : date
}

function collapseMealDayOverride(date) {
  ib.clearMealOverride(date)
  if (expandedMealDayOverride.value === date) expandedMealDayOverride.value = null
}

function masterMealLabel(m, i) {
  if (m.sessionName) return m.sessionName
  return MEAL_PERIODS.find(p => p.value === m.mealPeriod)?.label ?? `Meal ${i + 1}`
}

function setMealMode(mode) {
  if (ib.meals.mealMode === mode) return
  ib.meals.mealMode = mode
  ib.meals.mealOverrides = {}
  expandedMealDayOverride.value = null
}

function menuItemsForPeriod(mealPeriod) {
  const catMap = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', tea_break: 'tea_break', cocktail: 'beverage' }
  const cat = catMap[mealPeriod]
  return cat ? DUMMY_MENU_ITEMS.filter(m => m.category === cat || m.category === 'beverage') : DUMMY_MENU_ITEMS
}

function addOrderItem(session, attendantIdx) {
  session.individualOrders.push({ attendantIdx, menuItemId: '', quantity: 1, notes: '' })
}
function removeOrderItem(session, orderIdx) {
  session.individualOrders.splice(orderIdx, 1)
}

const bulkMenuItems = ref({})
function getBulk(key) {
  if (!bulkMenuItems.value[key]) bulkMenuItems.value[key] = { menuItemId: '', quantity: 1 }
  return bulkMenuItems.value[key]
}
function applyBulkToAll(session, key) {
  const b = bulkMenuItems.value[key]
  if (!b?.menuItemId) return
  session.individualOrders = ib.attendants.map((_, idx) => ({
    attendantIdx: idx, menuItemId: b.menuItemId, quantity: b.quantity, notes: '',
  }))
}

// ── Validation ─────────────────────────────────────────────────────────────
function validate() {
  const e = {}

  if (!ib.bookedBy.name)  e.bookedByName  = 'Required'
  if (!ib.bookedBy.email) e.bookedByEmail = 'Required'
  else if (!/\S+@\S+\.\S+/.test(ib.bookedBy.email)) e.bookedByEmail = 'Enter a valid email'

  if (!ib.hasAnyService) e.service = 'Select at least one service to continue'

  ib.attendants.forEach((a, i) => {
    if (!a.fullName) e[`att_${i}_name`] = 'Required'
    if (a.isLead) {
      if (!a.email)    e[`att_${i}_email`]    = 'Required for lead contact'
      if (!a.phone)    e[`att_${i}_phone`]    = 'Required for lead contact'
      if (!a.idNumber) e[`att_${i}_idNumber`] = 'Required for lead contact'
    }
  })

  if (ib.eventsEnabled) {
    if (ib.events.startDate && ib.events.endDate && ib.events.endDate < ib.events.startDate)
      e.eventsEndDate = 'End date cannot be before start date'
    ib.events.masterSessions.forEach((s, i) => {
      if (!s.startTime) e[`ev_master_${i}_start`] = 'Required'
      if (!s.endTime)   e[`ev_master_${i}_end`]   = 'Required'
    })
    Object.entries(ib.events.dayOverrides).forEach(([date, ov]) => {
      if (ov.excluded) return
      ;(ov.sessions ?? []).forEach((s, i) => {
        if (!s.startTime) e[`ev_ov_${date}_${i}_start`] = 'Required'
        if (!s.endTime)   e[`ev_ov_${date}_${i}_end`]   = 'Required'
      })
    })
  }

  if (ib.accommodationEnabled) {
    if (!ib.accommodation.checkIn)  e.accomCheckIn  = 'Required'
    if (!ib.accommodation.checkOut) e.accomCheckOut = 'Required'
  }

  errors.value = e
  return Object.keys(e).length === 0
}

function goToConfirm() {
  if (!validate()) {
    if (Object.keys(errors.value).some(k => k.startsWith('att_'))) attendantsExpanded.value = true
    const errTab = TABS.map(t => t.key).find(t => tabHasError.value[t])
    if (errTab) activeTab.value = errTab
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  step.value = 2
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function submit() {
  loading.value     = true
  submitError.value = ''
  try {
    await ib.submit()
    success.value = true
    ib.reset()
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

// ── Formatting ─────────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Init ───────────────────────────────────────────────────────────────────
onMounted(async () => {
  await lodgesStore.fetchLodges()
  lodgesStore.fetchLodgeDetail(lodgeId)
  if (lodge.value) ib.setLodge(lodgeId, lodge.value.name)
  if (route.query.branchId && !ib.branchId) ib.branchId = route.query.branchId
  ib.fillFromAuth(auth.user)
  // Restore room availability if dates were already set (e.g. navigating back)
  const { checkIn, checkOut } = ib.accommodation
  if (checkIn && checkOut && checkOut > checkIn) fetchAvailableRooms()
})
</script>

<template>
  <!-- ── Success overlay ──────────────────────────────────────────────────── -->
  <Transition enter-active-class="transition duration-500" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
    <div v-if="success" class="fixed inset-0 z-50 bg-(--color-background) flex items-center justify-center px-5">
      <div class="text-center max-w-sm">
        <span class="material-symbols-outlined text-6xl text-(--color-primary) mb-6 block" style="font-variation-settings: 'FILL' 1">check_circle</span>
        <h2 class="font-serif text-3xl text-(--color-on-surface) mb-3">Booking Submitted</h2>
        <p class="font-sans text-base text-(--color-on-surface-variant) leading-relaxed">Your booking request has been received. The property team will be in touch to confirm. Redirecting to your bookings…</p>
      </div>
    </div>
  </Transition>

  <div class="w-full max-w-[1280px] mx-auto px-5 md:px-16 py-8 pb-24">

    <!-- Back -->
    <button type="button"
      class="flex items-center gap-1.5 font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) mb-6 transition-colors"
      @click="goBack">
      <span class="material-symbols-outlined text-base">arrow_back</span>
      {{ step === 2 ? 'Back to Services' : (lodge?.name ?? 'Lodge') }}
    </button>

    <!-- Header -->
    <div class="mb-6">
      <h1 class="font-serif text-3xl font-semibold text-(--color-on-surface)">Individual Booking</h1>
      <div class="flex items-center gap-3 flex-wrap mt-1">
        <p v-if="lodge" class="font-sans text-sm text-(--color-on-surface-variant)">{{ lodge.name }}</p>
        <span v-if="selectedBranch" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
          <span class="material-symbols-outlined text-sm">location_on</span>{{ selectedBranch.name }}
        </span>
      </div>
    </div>

    <!-- Stepper -->
    <nav class="flex items-center gap-4 mb-8">
      <div v-for="(s, i) in stepDefs" :key="s.label" class="flex items-center gap-4">
        <div class="flex items-center gap-2"
          :class="s.active ? 'text-(--color-primary)' : step > i + 1 ? 'text-(--color-primary)' : 'text-(--color-outline)'">
          <span v-if="step > i + 1" class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1">check_circle</span>
          <span v-else class="material-symbols-outlined">{{ s.active ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
          <span class="font-sans text-sm font-semibold">{{ s.label }}</span>
        </div>
        <div v-if="i < stepDefs.length - 1" class="h-px w-10 bg-(--color-outline-variant)"></div>
      </div>
    </nav>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      <!-- ── Main Column ──────────────────────────────────────────────────── -->
      <div class="lg:col-span-8 space-y-6">

        <!-- ══════════════════════ STEP 1 ══════════════════════════════════ -->
        <template v-if="step === 1">

          <!-- No-service error banner -->
          <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
            <div v-if="errors.service" class="flex items-center gap-2 p-3 rounded-lg bg-(--color-error-container) text-(--color-on-error-container)">
              <span class="material-symbols-outlined text-base shrink-0">error</span>
              <p class="font-sans text-sm">{{ errors.service }}</p>
            </div>
          </Transition>

          <!-- Tab bar -->
          <nav class="grid grid-cols-4 border-b-2 border-(--color-outline-variant)">
            <button
              v-for="tab in TABS"
              :key="tab.key"
              type="button"
              class="relative flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2 py-2.5 sm:px-5 sm:py-3.5 font-sans font-semibold border-b-2 -mb-[2px] transition-colors"
              :class="activeTab === tab.key
                ? 'border-(--color-primary) text-(--color-primary)'
                : 'border-transparent text-(--color-on-surface-variant) hover:text-(--color-on-surface) hover:border-(--color-outline)'"
              @click="activeTab = tab.key">
              <span class="material-symbols-outlined text-xl sm:text-base shrink-0"
                :style="activeTab === tab.key ? 'font-variation-settings: FILL 1' : ''">{{ tab.icon }}</span>
              <span class="sm:hidden text-[10px] leading-tight text-center">{{ tab.shortLabel }}</span>
              <span class="hidden sm:inline text-sm">{{ tab.label }}</span>
              <span v-if="tab.key !== 'guest' && isServiceEnabled(tab.key)"
                class="w-2 h-2 rounded-full bg-(--color-primary) shrink-0"></span>
              <span v-if="tabHasError[tab.key]"
                class="material-symbols-outlined text-xs sm:text-sm text-(--color-error)" style="font-variation-settings: 'FILL' 1">error</span>
            </button>
          </nav>

          <!-- ═════════════ GUEST TAB ═════════════ -->
          <template v-if="activeTab === 'guest'">

            <!-- Booked By card -->
            <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
              <!-- Header row -->
              <div class="flex items-center gap-4 px-6 py-5">
                <div class="w-10 h-10 rounded-full bg-(--color-savannah-mist) flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-(--color-primary)" style="font-variation-settings: 'FILL' 1">account_circle</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <h2 class="font-serif text-xl text-(--color-on-surface)">Booked By</h2>
                    <button type="button"
                      class="font-sans text-xs font-semibold text-(--color-primary) hover:underline shrink-0"
                      @click="bookedByEditing = !bookedByEditing">
                      {{ bookedByEditing ? 'Done' : 'Edit' }}
                    </button>
                  </div>
                  <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Auto-filled from your account — you are the booking contact.</p>
                </div>
              </div>

              <!-- Read-only display -->
              <div v-if="!bookedByEditing" class="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-(--color-outline-variant) pt-4">
                <div>
                  <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-0.5">Full Name</p>
                  <p class="font-sans text-sm text-(--color-on-surface)">{{ ib.bookedBy.name || '—' }}</p>
                  <p v-if="errors.bookedByName" class="font-sans text-xs text-(--color-error) mt-0.5">{{ errors.bookedByName }}</p>
                </div>
                <div>
                  <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-0.5">Email</p>
                  <p class="font-sans text-sm text-(--color-on-surface)">{{ ib.bookedBy.email || '—' }}</p>
                  <p v-if="errors.bookedByEmail" class="font-sans text-xs text-(--color-error) mt-0.5">{{ errors.bookedByEmail }}</p>
                </div>
                <div>
                  <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-0.5">Phone</p>
                  <p class="font-sans text-sm"
                    :class="ib.bookedBy.phone ? 'text-(--color-on-surface)' : 'text-(--color-outline) italic'">
                    {{ ib.bookedBy.phone || 'Not provided — click Edit to add' }}
                  </p>
                </div>
              </div>

              <!-- Editable fields -->
              <div v-else class="px-6 pb-6 border-t border-(--color-outline-variant) pt-4">
                <p class="font-sans text-xs text-(--color-on-surface-variant) mb-4">Update your contact details for this booking.</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full Name <span class="text-(--color-error)">*</span></label>
                    <input v-model="ib.bookedBy.name" type="text"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.bookedByName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors.bookedByName" class="font-sans text-xs text-(--color-error)">{{ errors.bookedByName }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email <span class="text-(--color-error)">*</span></label>
                    <input v-model="ib.bookedBy.email" type="email"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.bookedByEmail ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors.bookedByEmail" class="font-sans text-xs text-(--color-error)">{{ errors.bookedByEmail }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Phone</label>
                    <input v-model="ib.bookedBy.phone" type="tel" placeholder="+260 97 000 0000"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                  </div>
                </div>
              </div>
            </section>

            <!-- Additional Guests (collapsible) -->
            <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
              <div class="flex items-stretch">
                <button type="button"
                  class="flex items-center gap-2 flex-1 px-6 py-5 text-left hover:bg-(--color-surface-container-low) transition-colors min-w-0"
                  @click="attendantsExpanded = !attendantsExpanded">
                  <span class="material-symbols-outlined text-(--color-primary) shrink-0">group</span>
                  <div class="min-w-0 flex-1">
                    <h2 class="font-serif text-xl text-(--color-on-surface)">Additional Guests</h2>
                    <p v-if="!attendantsExpanded" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">
                      {{ ib.attendants.filter(a => a.fullName).length > 0
                        ? ib.attendants.filter(a => a.fullName).length + ' guest' + (ib.attendants.filter(a => a.fullName).length !== 1 ? 's' : '') + ' registered'
                        : 'Optional — expand to register travel companions' }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0 mr-2">
                    <span v-if="!attendantsExpanded && ib.attendants.filter(a => a.fullName).length > 0"
                      class="px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                      {{ ib.attendants.filter(a => a.fullName).length }}
                    </span>
                    <span v-if="Object.keys(errors).some(k => k.startsWith('att_'))"
                      class="material-symbols-outlined text-sm text-(--color-error)" style="font-variation-settings: 'FILL' 1">error</span>
                    <span class="material-symbols-outlined text-(--color-on-surface-variant) transition-transform duration-200"
                      :style="{ transform: attendantsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }">expand_more</span>
                  </div>
                </button>
                <div v-if="attendantsExpanded" class="flex items-center px-4 border-l border-(--color-outline-variant)">
                  <button type="button"
                    class="flex items-center gap-1 text-(--color-primary) font-sans text-sm font-semibold hover:underline shrink-0"
                    @click="ib.addAttendant()">
                    <span class="material-symbols-outlined text-base">person_add</span> Add Guest
                  </button>
                </div>
              </div>

              <div v-if="attendantsExpanded" class="px-6 pb-6 border-t border-(--color-outline-variant)">
                <p class="font-sans text-sm text-(--color-on-surface-variant) mb-5 pt-4">Register all guests staying under this booking. The lead contact receives all booking communications.</p>
                <div class="space-y-3">
                  <div v-for="(att, i) in ib.attendants" :key="i" class="p-4 bg-(--color-surface-container-low) rounded-xl">
                    <!-- Row header -->
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2">
                        <span class="inline-flex items-center justify-center w-7 h-7 rounded-full font-sans text-xs font-bold shrink-0"
                          :class="att.isLead ? 'bg-(--color-primary) text-white' : 'bg-(--color-surface-container-high) text-(--color-on-surface-variant)'">
                          {{ i + 1 }}
                        </span>
                        <span v-if="att.isLead" class="font-sans text-xs font-semibold text-(--color-primary)">Lead Contact</span>
                        <span v-else class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ att.fullName || `Guest ${i + 1}` }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <button v-if="!att.isLead" type="button"
                          class="font-sans text-xs text-(--color-outline) hover:text-(--color-primary) transition-colors"
                          @click="att.isLead = true; ib.attendants.forEach((a, j) => { if (j !== i) a.isLead = false })">
                          Set as lead
                        </button>
                        <button type="button" :disabled="ib.attendants.length === 1"
                          class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                          @click="ib.removeAttendant(i)">
                          <span class="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>
                    <!-- Fields -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full Name <span class="text-(--color-error)">*</span></label>
                        <input v-model="att.fullName" type="text"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                          :class="errors[`att_${i}_name`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                        <span v-if="errors[`att_${i}_name`]" class="font-sans text-xs text-(--color-error)">{{ errors[`att_${i}_name`] }}</span>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email <span v-if="att.isLead" class="text-(--color-error)">*</span></label>
                        <input v-model="att.email" type="email"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                          :class="errors[`att_${i}_email`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                        <span v-if="errors[`att_${i}_email`]" class="font-sans text-xs text-(--color-error)">{{ errors[`att_${i}_email`] }}</span>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Phone <span v-if="att.isLead" class="text-(--color-error)">*</span></label>
                        <input v-model="att.phone" type="tel"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                          :class="errors[`att_${i}_phone`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                        <span v-if="errors[`att_${i}_phone`]" class="font-sans text-xs text-(--color-error)">{{ errors[`att_${i}_phone`] }}</span>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Passport / ID <span v-if="att.isLead" class="text-(--color-error)">*</span></label>
                        <input v-model="att.idNumber" type="text"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                          :class="errors[`att_${i}_idNumber`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                        <span v-if="errors[`att_${i}_idNumber`]" class="font-sans text-xs text-(--color-error)">{{ errors[`att_${i}_idNumber`] }}</span>
                      </div>
                      <div class="flex flex-col gap-1 sm:col-span-2">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Dietary Notes</label>
                        <input v-model="att.dietaryNotes" type="text" placeholder="e.g. Vegetarian, halal, nut allergy"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- General Notes -->
            <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-5">
                <span class="material-symbols-outlined text-(--color-primary)">notes</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">General Notes</h2>
              </div>
              <textarea v-model="ib.notes" rows="3" placeholder="Any other requests or context for the property team…"
                class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
            </section>

          </template><!-- end Guest tab -->

          <!-- ═════════════ ACCOMMODATION TAB ═════════════ -->
          <template v-else-if="activeTab === 'accommodation'">

            <!-- Service toggle -->
            <div class="flex items-center justify-between p-4 rounded-xl border-2 mb-6 transition-all"
                 :class="ib.accommodationEnabled ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) bg-(--color-surface-container-low)'">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-xl" :class="ib.accommodationEnabled ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">bed</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">
                    {{ ib.accommodationEnabled ? 'Accommodation included in this booking' : 'Not currently included' }}
                  </p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">
                    {{ ib.accommodationEnabled ? 'Choose your dates and select a room below.' : 'Include to book a room.' }}
                  </p>
                </div>
              </div>
              <button type="button" @click="toggleService('accommodation')"
                class="flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-semibold transition-all shrink-0"
                :class="ib.accommodationEnabled
                  ? 'bg-(--color-error-container) text-(--color-on-error-container) hover:opacity-80'
                  : 'bg-(--color-primary) text-white hover:bg-(--color-clay-earth)'">
                <span class="material-symbols-outlined text-sm">{{ ib.accommodationEnabled ? 'remove_circle' : 'add_circle' }}</span>
                {{ ib.accommodationEnabled ? 'Remove' : 'Include' }}
              </button>
            </div>

            <section v-if="ib.accommodationEnabled" class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant) space-y-7">

              <!-- ── Date pickers ── -->
              <div>
                <div class="flex items-center gap-2 mb-5">
                  <span class="material-symbols-outlined text-(--color-primary)">date_range</span>
                  <h2 class="font-serif text-xl text-(--color-on-surface)">Your Stay</h2>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-in <span class="text-(--color-error)">*</span></label>
                    <input v-model="ib.accommodation.checkIn" type="date"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.accomCheckIn ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors.accomCheckIn" class="font-sans text-xs text-(--color-error)">{{ errors.accomCheckIn }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-out <span class="text-(--color-error)">*</span></label>
                    <input v-model="ib.accommodation.checkOut" type="date" :min="ib.accommodation.checkIn || undefined"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.accomCheckOut ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors.accomCheckOut" class="font-sans text-xs text-(--color-error)">{{ errors.accomCheckOut }}</span>
                  </div>
                </div>
                <!-- Nights badge -->
                <div v-if="nights(ib.accommodation.checkIn, ib.accommodation.checkOut) > 0"
                  class="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--color-savannah-mist) border border-(--color-primary)">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">nights_stay</span>
                  <span class="font-sans text-xs font-semibold text-(--color-primary)">
                    {{ nights(ib.accommodation.checkIn, ib.accommodation.checkOut) }}
                    night{{ nights(ib.accommodation.checkIn, ib.accommodation.checkOut) !== 1 ? 's' : '' }}
                    · {{ fmt(ib.accommodation.checkIn) }} – {{ fmt(ib.accommodation.checkOut) }}
                  </span>
                </div>
              </div>

              <!-- ── Per-attendant room assignments ── -->
              <div v-if="ib.accommodation.checkIn && ib.accommodation.checkOut && ib.accommodation.checkOut > ib.accommodation.checkIn">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-(--color-primary)">bed</span>
                    <h3 class="font-serif text-lg text-(--color-on-surface)">Room Assignments</h3>
                  </div>
                  <button v-if="!roomsLoading" type="button"
                    class="flex items-center gap-1 font-sans text-xs font-semibold text-(--color-primary) hover:underline"
                    @click="fetchAvailableRooms">
                    <span class="material-symbols-outlined text-sm">refresh</span> Refresh
                  </button>
                </div>

                <!-- Loading -->
                <div v-if="roomsLoading" class="space-y-3">
                  <div v-for="n in ib.attendants.length" :key="n" class="h-16 rounded-xl bg-(--color-surface-container-low) animate-pulse"></div>
                  <p class="font-sans text-xs text-center text-(--color-on-surface-variant) pt-1">Checking availability…</p>
                </div>

                <!-- Error -->
                <div v-else-if="roomsError" class="flex items-start gap-3 p-4 rounded-xl bg-(--color-error-container) text-(--color-on-error-container)">
                  <span class="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
                  <div>
                    <p class="font-sans text-sm font-semibold">Could not load available rooms</p>
                    <button type="button" class="font-sans text-xs hover:underline mt-1" @click="fetchAvailableRooms">Try again</button>
                  </div>
                </div>

                <!-- Per-attendant rows -->
                <div v-else class="space-y-3">
                  <div v-for="(att, idx) in ib.attendants" :key="idx"
                    class="border rounded-xl overflow-hidden transition-all"
                    :class="expandedPickerIdx === idx ? 'border-(--color-primary)' : 'border-(--color-outline-variant)'">

                    <!-- Attendant header row -->
                    <div class="flex items-center justify-between gap-3 px-4 py-3 bg-(--color-surface-container)">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-bold text-(--color-primary) shrink-0">{{ idx + 1 }}</span>
                        <div class="min-w-0">
                          <p class="font-sans text-sm font-semibold text-(--color-on-surface) truncate">{{ att.fullName || `Guest ${idx + 1}` }}</p>
                          <p v-if="att.isLead" class="font-sans text-xs text-(--color-primary)">Lead contact</p>
                        </div>
                      </div>
                      <!-- Room assigned -->
                      <div v-if="getAttendantRoom(idx)" class="flex items-center gap-2 shrink-0">
                        <div class="text-right hidden sm:block">
                          <p class="font-sans text-xs font-semibold text-(--color-on-surface)">{{ getAttendantRoom(idx).roomName }}</p>
                          <p class="font-sans text-xs text-(--color-primary)">K {{ Number(getAttendantRoom(idx).rate).toLocaleString() }}/night</p>
                        </div>
                        <button type="button" @click="togglePicker(idx)"
                          class="font-sans text-xs font-semibold text-(--color-on-surface-variant) hover:text-(--color-primary) transition-colors px-2 py-1">
                          {{ expandedPickerIdx === idx ? 'Done' : 'Change' }}
                        </button>
                        <button type="button" @click="clearAttendantRoom(idx)"
                          class="h-7 w-7 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors">
                          <span class="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                      <!-- No room yet -->
                      <button v-else type="button" @click="togglePicker(idx)"
                        class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-xs font-semibold transition-all"
                        :class="expandedPickerIdx === idx
                          ? 'bg-(--color-surface-container-high) text-(--color-on-surface)'
                          : 'bg-(--color-primary) text-white hover:bg-(--color-clay-earth)'">
                        <span class="material-symbols-outlined text-sm">{{ expandedPickerIdx === idx ? 'expand_less' : 'add' }}</span>
                        {{ expandedPickerIdx === idx ? 'Close' : 'Select Room' }}
                      </button>
                    </div>

                    <!-- Selected room badge (mobile) -->
                    <div v-if="getAttendantRoom(idx) && expandedPickerIdx !== idx"
                      class="sm:hidden px-4 py-2 bg-(--color-savannah-mist) flex items-center gap-2">
                      <span class="material-symbols-outlined text-sm text-(--color-primary)" style="font-variation-settings: 'FILL' 1">check_circle</span>
                      <p class="font-sans text-xs font-semibold text-(--color-on-surface)">{{ getAttendantRoom(idx).roomName }}</p>
                      <p class="font-sans text-xs text-(--color-primary) ml-auto">K {{ Number(getAttendantRoom(idx).rate).toLocaleString() }}/night</p>
                    </div>

                    <!-- Inline room picker -->
                    <div v-if="expandedPickerIdx === idx" class="p-4 bg-(--color-surface-container-low) border-t border-(--color-outline-variant)">
                      <div v-if="!availableRooms.length" class="flex flex-col items-center justify-center py-8 text-center">
                        <span class="material-symbols-outlined text-3xl text-(--color-outline) mb-2 opacity-40">bed_time</span>
                        <p class="font-sans text-sm text-(--color-on-surface-variant)">No rooms available for these dates</p>
                      </div>
                      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button v-for="room in availableRooms" :key="room.id"
                          type="button"
                          class="group text-left rounded-xl border-2 transition-all overflow-hidden"
                          :class="getAttendantRoom(idx)?.roomId === room.id
                            ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                            : 'border-(--color-outline-variant) hover:border-(--color-primary) bg-(--color-surface-container-lowest) hover:bg-(--color-savannah-mist)'"
                          @click="selectRoomForAttendant(idx, room)">
                          <div v-if="room.images?.[0]" class="w-full h-28 overflow-hidden">
                            <img :src="room.images[0]" :alt="room.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                          <div class="p-3">
                            <div class="flex items-start justify-between gap-2 mb-1">
                              <p class="font-sans text-sm font-semibold text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors leading-tight">{{ room.name }}</p>
                              <span v-if="getAttendantRoom(idx)?.roomId === room.id"
                                class="material-symbols-outlined text-base text-(--color-primary) shrink-0" style="font-variation-settings: 'FILL' 1">check_circle</span>
                              <span v-else class="px-1.5 py-0.5 rounded-full bg-(--color-surface-container) font-sans text-xs font-semibold text-(--color-on-surface-variant) capitalize shrink-0">{{ room.type }}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                              <span class="flex items-center gap-1 font-sans text-xs text-(--color-on-surface-variant)">
                                <span class="material-symbols-outlined text-sm">person</span>Sleeps {{ room.capacity }}
                              </span>
                              <span class="font-sans text-xs font-bold text-(--color-primary)">K {{ Number(room.price_per_night).toLocaleString() }}/night</span>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Summary line -->
                  <p class="font-sans text-xs text-(--color-on-surface-variant) text-right pt-1">
                    {{ (ib.accommodation.attendantRooms ?? []).length }} of {{ ib.attendants.length }} guest{{ ib.attendants.length !== 1 ? 's' : '' }} assigned a room
                  </p>
                </div>
              </div>

              <!-- Prompt to set dates first -->
              <div v-else class="flex items-start gap-3 p-4 rounded-xl bg-(--color-surface-container) border border-(--color-outline-variant)">
                <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0 mt-0.5">info</span>
                <p class="font-sans text-sm text-(--color-on-surface-variant)">Enter your check-in and check-out dates above to assign rooms to each guest.</p>
              </div>

              <!-- Additional requests -->
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Additional Requests</label>
                <textarea v-model="ib.accommodation.notes" rows="2"
                  placeholder="Accessibility needs, pillow preferences, early check-in, special occasions…"
                  class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
              </div>

            </section>

            <!-- Disabled placeholder -->
            <div v-else class="flex flex-col items-center justify-center py-16 text-center">
              <span class="material-symbols-outlined text-5xl text-(--color-outline) mb-4 opacity-40">bed</span>
              <p class="font-sans text-sm text-(--color-on-surface-variant)">Accommodation is not included in this booking.</p>
              <p class="font-sans text-xs text-(--color-outline) mt-1">Click "Include" above to add a room.</p>
            </div>

          </template><!-- end Accommodation tab -->

          <!-- ═════════════ EVENTS TAB ═════════════ -->
          <template v-else-if="activeTab === 'events'">

            <!-- Service toggle -->
            <div class="flex items-center justify-between p-4 rounded-xl border-2 mb-6 transition-all"
                 :class="ib.eventsEnabled ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) bg-(--color-surface-container-low)'">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-xl" :class="ib.eventsEnabled ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">event</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">
                    {{ ib.eventsEnabled ? 'Events included in this booking' : 'Not currently included' }}
                  </p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">
                    {{ ib.eventsEnabled ? 'Configure sessions below.' : 'Include to book conference rooms, seminars, or workshops.' }}
                  </p>
                </div>
              </div>
              <button type="button" @click="toggleService('events')"
                class="flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-semibold transition-all shrink-0"
                :class="ib.eventsEnabled
                  ? 'bg-(--color-error-container) text-(--color-on-error-container) hover:opacity-80'
                  : 'bg-(--color-primary) text-white hover:bg-(--color-clay-earth)'">
                <span class="material-symbols-outlined text-sm">{{ ib.eventsEnabled ? 'remove_circle' : 'add_circle' }}</span>
                {{ ib.eventsEnabled ? 'Remove' : 'Include' }}
              </button>
            </div>

            <section v-if="ib.eventsEnabled" class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-(--color-primary)">event</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Event Sessions</h2>
              </div>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Set the event date range to auto-generate a session per day, then customise each session as needed.</p>

              <div class="space-y-5 mb-6">
                <div>
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) block mb-2">Reason for Booking</label>
                  <textarea v-model="ib.events.reasonForBooking" rows="2" placeholder="e.g. Annual strategy conference, product launch, board meeting…"
                    class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
                </div>
                <!-- Event date range -->
                <div class="p-4 bg-(--color-surface-container) rounded-xl border border-(--color-outline-variant)">
                  <div class="flex items-start gap-2 mb-4">
                    <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0 mt-0.5">date_range</span>
                    <div>
                      <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Event Date Range</p>
                      <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Selecting a range auto-generates one session per day. All sessions remain fully editable.</p>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Start Date</label>
                      <input v-model="ib.events.startDate" type="date"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">End Date</label>
                      <input v-model="ib.events.endDate" type="date" :min="ib.events.startDate || undefined"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                        :class="errors.eventsEndDate ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                      <span v-if="errors.eventsEndDate" class="font-sans text-xs text-(--color-error)">{{ errors.eventsEndDate }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Schedule mode -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <button type="button" @click="ib.events.scheduleMode = 'uniform'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="ib.events.scheduleMode === 'uniform' ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                  <span class="material-symbols-outlined text-xl mt-0.5" :class="ib.events.scheduleMode === 'uniform' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">calendar_view_week</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Uniform Schedule</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">One daily schedule repeated across all event days</p>
                  </div>
                </button>
                <button type="button" @click="ib.events.scheduleMode = 'per_day'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="ib.events.scheduleMode === 'per_day' ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                  <span class="material-symbols-outlined text-xl mt-0.5" :class="ib.events.scheduleMode === 'per_day' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">event_note</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Per-Day Schedule</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Start from a default, then override or skip individual days</p>
                  </div>
                </button>
              </div>

              <!-- Master session scope banner -->
              <div class="mb-4 p-4 rounded-xl border"
                :class="dayRange.length > 0 ? 'bg-(--color-savannah-mist) border-(--color-primary)' : 'bg-(--color-surface-container) border-(--color-outline-variant)'">
                <div class="flex items-start gap-2">
                  <span class="material-symbols-outlined text-base shrink-0 mt-0.5" :class="dayRange.length > 0 ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">copy_all</span>
                  <div class="flex-1 min-w-0">
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">
                      {{ ib.events.scheduleMode === 'per_day' ? 'Default Daily Schedule' : 'Daily Schedule Template' }}
                    </p>
                    <template v-if="dayRange.length > 0">
                      <p v-if="ib.events.scheduleMode === 'uniform'" class="font-sans text-xs text-(--color-on-surface-variant) mt-1">
                        Applied to all <strong class="text-(--color-on-surface)">{{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }}</strong>
                        · {{ fmt(ib.events.startDate) }}<span v-if="ib.events.endDate && ib.events.endDate !== ib.events.startDate"> – {{ fmt(ib.events.endDate) }}</span>.
                      </p>
                      <p v-else class="font-sans text-xs text-(--color-on-surface-variant) mt-1">
                        Fallback for days without a custom plan — covering
                        <strong class="text-(--color-on-surface)">{{ eventDaySummary.defaultCount }} of {{ eventDaySummary.total }} day{{ eventDaySummary.total !== 1 ? 's' : '' }}</strong>.
                      </p>
                    </template>
                    <p v-else class="font-sans text-xs text-(--color-on-surface-variant) mt-1">Set a date range above to see how many days this schedule covers.</p>
                  </div>
                </div>
              </div>

              <!-- Master sessions list -->
              <div class="space-y-4 mb-4">
                <div v-for="(session, i) in ib.events.masterSessions" :key="i" class="border border-(--color-outline-variant) rounded-xl overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-3 bg-(--color-surface-container)">
                    <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ sessionLabel(session, i) }}</span>
                    <div class="flex items-center gap-2">
                      <span v-if="dayRange.length > 0 && ib.events.scheduleMode === 'uniform'"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                        × {{ dayRange.length }} days
                      </span>
                      <span v-else-if="dayRange.length > 0 && ib.events.scheduleMode === 'per_day'"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-surface-container-high) font-sans text-xs font-semibold text-(--color-on-surface-variant)">
                        default
                      </span>
                      <span v-else class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                        Session {{ i + 1 }}
                      </span>
                      <button type="button" :disabled="ib.events.masterSessions.length === 1"
                        class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                        @click="ib.removeMasterSession(i)">
                        <span class="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                  <div class="p-4 bg-(--color-surface-container-low) space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Session Name</label>
                        <input v-model="session.sessionName" type="text" placeholder="e.g. Plenary, Workshop A, Closing Ceremony"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Event Type</label>
                        <select v-model="session.eventType"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                          <option v-for="t in EVENT_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                        </select>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Venue</label>
                        <select v-model="session.venueId"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                          <option value="">No preference / TBC</option>
                          <option v-for="r in DUMMY_CONFERENCE_ROOMS" :key="r.id" :value="r.id">{{ r.name }} (cap. {{ r.capacity }})</option>
                        </select>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Start Time <span class="text-(--color-error)">*</span></label>
                        <input v-model="session.startTime" type="time"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                          :class="errors[`ev_master_${i}_start`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                        <span v-if="errors[`ev_master_${i}_start`]" class="font-sans text-xs text-(--color-error)">{{ errors[`ev_master_${i}_start`] }}</span>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">End Time <span class="text-(--color-error)">*</span></label>
                        <input v-model="session.endTime" type="time"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                          :class="errors[`ev_master_${i}_end`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                        <span v-if="errors[`ev_master_${i}_end`]" class="font-sans text-xs text-(--color-error)">{{ errors[`ev_master_${i}_end`] }}</span>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Expected Attendees</label>
                        <input v-model.number="session.expectedAttendees" type="number" min="1"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Room Setup</label>
                        <select v-model="session.setupType"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                          <option v-for="s in SETUP_TYPES" :key="s.value" :value="s.value">{{ s.label }}</option>
                        </select>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Pricing Basis</label>
                        <select v-model="session.pricingBasis"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                          <option v-for="p in PRICING_BASIS" :key="p.value" :value="p.value">{{ p.label }}</option>
                        </select>
                      </div>
                      <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Special Requirements</label>
                        <textarea v-model="session.specialRequirements" rows="2" placeholder="AV equipment, branding, flowers, signage, streaming setup…"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors resize-none"></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button type="button" class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline" @click="ib.addMasterSession()">
                <span class="material-symbols-outlined text-base">add</span>
                {{ ib.events.scheduleMode === 'per_day' ? 'Add Session to Default Schedule' : 'Add Session to Template' }}
              </button>

              <!-- Per-day overrides -->
              <div v-if="ib.events.scheduleMode === 'per_day' && dayRange.length > 0" class="mt-8 pt-6 border-t border-(--color-outline-variant)">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-1">
                  Day-by-Day Schedule <span class="text-(--color-outline) font-normal normal-case tracking-normal">({{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }})</span>
                </p>
                <p class="font-sans text-xs text-(--color-on-surface-variant) mb-3">Skip days your event doesn't run, or customise sessions for individual days.</p>
                <!-- Status summary strip -->
                <div class="flex items-center gap-2 flex-wrap mb-4">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-(--color-surface-container) font-sans text-xs font-semibold text-(--color-on-surface-variant)">
                    <span class="w-1.5 h-1.5 rounded-full bg-(--color-outline) inline-block"></span>
                    {{ eventDaySummary.defaultCount }} using default
                  </span>
                  <span v-if="eventDaySummary.customised > 0"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                    <span class="w-1.5 h-1.5 rounded-full bg-(--color-primary) inline-block"></span>
                    {{ eventDaySummary.customised }} customised
                  </span>
                  <span v-if="eventDaySummary.skipped > 0"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-(--color-outline-variant) font-sans text-xs font-semibold text-(--color-on-surface-variant)">
                    <span class="w-1.5 h-1.5 rounded-full bg-(--color-outline-variant) inline-block"></span>
                    {{ eventDaySummary.skipped }} skipped
                  </span>
                </div>
                <div class="space-y-2">
                  <div v-for="date in dayRange" :key="date" class="border rounded-xl overflow-hidden"
                    :class="dayStatus(date) === 'skipped' ? 'border-(--color-outline-variant) opacity-60' : 'border-(--color-outline-variant)'">
                    <!-- Day row -->
                    <div class="flex items-center justify-between px-4 py-3 bg-(--color-surface-container)">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="font-sans text-sm font-semibold text-(--color-on-surface) shrink-0">{{ fmtDayLabel(date) }}</span>
                        <span v-if="dayStatus(date) === 'overridden'"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary) shrink-0">
                          {{ ib.events.dayOverrides[date].sessions.length }} override{{ ib.events.dayOverrides[date].sessions.length !== 1 ? 's' : '' }}
                        </span>
                        <span v-else-if="dayStatus(date) === 'skipped'"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-outline-variant) font-sans text-xs font-semibold text-(--color-on-surface-variant) shrink-0">
                          Skipped
                        </span>
                        <span v-else class="font-sans text-xs text-(--color-on-surface-variant) hidden sm:inline">Using default schedule</span>
                      </div>
                      <div class="flex items-center gap-1 shrink-0 ml-2">
                        <button v-if="dayStatus(date) !== 'skipped'" type="button"
                          class="font-sans text-xs font-semibold text-(--color-primary) hover:underline px-2 py-1"
                          @click="startDayOverride(date)">
                          {{ dayStatus(date) === 'overridden' ? (expandedDayOverride === date ? 'Collapse' : 'Edit') : 'Customise' }}
                        </button>
                        <button v-if="dayStatus(date) === 'overridden'" type="button"
                          class="font-sans text-xs text-(--color-on-surface-variant) hover:text-(--color-error) hover:underline px-2 py-1"
                          @click="collapseDayOverride(date)">
                          Reset
                        </button>
                        <button type="button"
                          class="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
                          :class="dayStatus(date) === 'skipped'
                            ? 'text-(--color-primary) bg-(--color-savannah-mist) hover:opacity-80'
                            : 'text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container)'"
                          :title="dayStatus(date) === 'skipped' ? 'Restore day' : 'Skip this day'"
                          @click="ib.toggleDayExcluded(date)">
                          <span class="material-symbols-outlined text-base">{{ dayStatus(date) === 'skipped' ? 'undo' : 'block' }}</span>
                        </button>
                      </div>
                    </div>
                    <!-- Expanded override editor -->
                    <div v-if="expandedDayOverride === date && dayStatus(date) === 'overridden'" class="p-4 bg-(--color-surface-container-low) space-y-3">
                      <div v-for="(s, si) in ib.events.dayOverrides[date].sessions" :key="si" class="border border-(--color-outline-variant) rounded-xl overflow-hidden">
                        <div class="flex items-center justify-between px-4 py-2.5 bg-(--color-surface-container)">
                          <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ sessionLabel(s, si) }}</span>
                          <button type="button" :disabled="ib.events.dayOverrides[date].sessions.length === 1"
                            class="h-7 w-7 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                            @click="ib.removeOverrideSession(date, si)">
                            <span class="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                        <div class="p-4 bg-(--color-savannah-mist) space-y-3">
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div class="flex flex-col gap-1 md:col-span-2">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Session Name</label>
                              <input v-model="s.sessionName" type="text" placeholder="e.g. Keynote, Breakout, Gala Dinner"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Event Type</label>
                              <select v-model="s.eventType"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                                <option v-for="t in EVENT_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                              </select>
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Venue</label>
                              <select v-model="s.venueId"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                                <option value="">No preference / TBC</option>
                                <option v-for="r in DUMMY_CONFERENCE_ROOMS" :key="r.id" :value="r.id">{{ r.name }} (cap. {{ r.capacity }})</option>
                              </select>
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Start Time <span class="text-(--color-error)">*</span></label>
                              <input v-model="s.startTime" type="time"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                                :class="errors[`ev_ov_${date}_${si}_start`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                              <span v-if="errors[`ev_ov_${date}_${si}_start`]" class="font-sans text-xs text-(--color-error)">{{ errors[`ev_ov_${date}_${si}_start`] }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">End Time <span class="text-(--color-error)">*</span></label>
                              <input v-model="s.endTime" type="time"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                                :class="errors[`ev_ov_${date}_${si}_end`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                              <span v-if="errors[`ev_ov_${date}_${si}_end`]" class="font-sans text-xs text-(--color-error)">{{ errors[`ev_ov_${date}_${si}_end`] }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Expected Attendees</label>
                              <input v-model.number="s.expectedAttendees" type="number" min="1"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Room Setup</label>
                              <select v-model="s.setupType"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                                <option v-for="st in SETUP_TYPES" :key="st.value" :value="st.value">{{ st.label }}</option>
                              </select>
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Pricing Basis</label>
                              <select v-model="s.pricingBasis"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                                <option v-for="p in PRICING_BASIS" :key="p.value" :value="p.value">{{ p.label }}</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button type="button" class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline"
                        @click="ib.addOverrideSession(date)">
                        <span class="material-symbols-outlined text-base">add</span> Add Session for This Day
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Hint: per_day but no dates yet -->
              <div v-else-if="ib.events.scheduleMode === 'per_day' && dayRange.length === 0" class="mt-6 flex items-start gap-2 p-3 bg-(--color-surface-container) rounded-xl">
                <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0 mt-0.5">info</span>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">Set a start and end date above to see and customise the day-by-day schedule.</p>
              </div>
            </section>

            <!-- Disabled placeholder -->
            <div v-else class="flex flex-col items-center justify-center py-16 text-center">
              <span class="material-symbols-outlined text-5xl text-(--color-outline) mb-4 opacity-40">event</span>
              <p class="font-sans text-sm text-(--color-on-surface-variant)">Events are not included in this booking.</p>
              <p class="font-sans text-xs text-(--color-outline) mt-1">Click "Include" above to add conference rooms and sessions.</p>
            </div>

          </template><!-- end Events tab -->

          <!-- ═════════════ MEALS TAB ═════════════ -->
          <template v-else-if="activeTab === 'meals'">

            <!-- Service toggle -->
            <div class="flex items-center justify-between p-4 rounded-xl border-2 mb-6 transition-all"
                 :class="ib.mealsEnabled ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) bg-(--color-surface-container-low)'">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-xl" :class="ib.mealsEnabled ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">restaurant</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">
                    {{ ib.mealsEnabled ? 'Meals included in this booking' : 'Not currently included' }}
                  </p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">
                    {{ ib.mealsEnabled ? 'Configure the meal plan below.' : 'Include to add catering — buffet, set menu, or individual orders.' }}
                  </p>
                </div>
              </div>
              <button type="button" @click="toggleService('meals')"
                class="flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-semibold transition-all shrink-0"
                :class="ib.mealsEnabled
                  ? 'bg-(--color-error-container) text-(--color-on-error-container) hover:opacity-80'
                  : 'bg-(--color-primary) text-white hover:bg-(--color-clay-earth)'">
                <span class="material-symbols-outlined text-sm">{{ ib.mealsEnabled ? 'remove_circle' : 'add_circle' }}</span>
                {{ ib.mealsEnabled ? 'Remove' : 'Include' }}
              </button>
            </div>

            <section v-if="ib.mealsEnabled" class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-(--color-primary)">restaurant</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Meal Plan</h2>
              </div>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Configure your catering requirements. Meals can follow an event schedule or be booked independently.</p>

              <!-- Reason -->
              <div class="mb-6">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) block mb-2">Reason for Booking</label>
                <textarea v-model="ib.meals.reasonForBooking" rows="2" placeholder="e.g. Dietary preference, special occasion, room service…"
                  class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
              </div>

              <!-- Meal mode -->
              <div class="mb-6">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-3">Booking Type</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" @click="setMealMode('event_linked')"
                    class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                    :class="ib.meals.mealMode === 'event_linked' ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                    <span class="material-symbols-outlined text-xl mt-0.5" :class="ib.meals.mealMode === 'event_linked' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">link</span>
                    <div>
                      <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Event-Linked</p>
                      <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Meals follow the event schedule and dates</p>
                    </div>
                  </button>
                  <button type="button" @click="setMealMode('standalone')"
                    class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                    :class="ib.meals.mealMode === 'standalone' ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                    <span class="material-symbols-outlined text-xl mt-0.5" :class="ib.meals.mealMode === 'standalone' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">restaurant</span>
                    <div>
                      <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Standalone</p>
                      <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Independent meal booking with its own dates</p>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Event-linked: dates banner or no-event hint -->
              <template v-if="ib.meals.mealMode === 'event_linked'">
                <div v-if="ib.eventsEnabled && ib.events.startDate" class="flex items-center gap-2 p-3 rounded-xl bg-(--color-savannah-mist) border border-(--color-primary) mb-6">
                  <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0">link</span>
                  <p class="font-sans text-xs text-(--color-on-surface)">
                    Using event dates:
                    <strong>{{ fmt(ib.events.startDate) }}</strong>
                    <span v-if="ib.events.endDate && ib.events.endDate !== ib.events.startDate"> – <strong>{{ fmt(ib.events.endDate) }}</strong></span>
                    <span class="text-(--color-on-surface-variant)"> · {{ mealDayRange.length }} day{{ mealDayRange.length !== 1 ? 's' : '' }}</span>
                  </p>
                </div>
                <div v-else class="flex items-start gap-2 p-3 rounded-xl bg-(--color-surface-container) border border-(--color-outline-variant) mb-6">
                  <span class="material-symbols-outlined text-base text-(--color-on-surface-variant) shrink-0 mt-0.5">info</span>
                  <p class="font-sans text-xs text-(--color-on-surface-variant) leading-relaxed">
                    No event dates found.
                    <button type="button" class="text-(--color-primary) font-semibold hover:underline" @click="ib.eventsEnabled = true; activeTab = 'events'">Go to Events</button>
                    to set a date range, or switch to Standalone above.
                  </p>
                </div>
              </template>

              <!-- Standalone: own date range -->
              <div v-else class="mb-6">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-3">Meal Date Range</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold text-(--color-on-surface-variant)">Start Date</label>
                    <input v-model="ib.meals.startDate" type="date"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold text-(--color-on-surface-variant)">End Date</label>
                    <input v-model="ib.meals.endDate" type="date" :min="ib.meals.startDate || undefined"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Leave same as start date for a single-day booking.</p>
                  </div>
                </div>
              </div>

              <!-- Schedule mode (once dates are available) -->
              <div v-if="mealDayRange.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <button type="button" @click="ib.meals.scheduleMode = 'uniform'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="ib.meals.scheduleMode === 'uniform' ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                  <span class="material-symbols-outlined text-xl mt-0.5" :class="ib.meals.scheduleMode === 'uniform' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">calendar_view_week</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Uniform Plan</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Same meals apply to every day</p>
                  </div>
                </button>
                <button type="button" @click="ib.meals.scheduleMode = 'per_day'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="ib.meals.scheduleMode === 'per_day' ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                  <span class="material-symbols-outlined text-xl mt-0.5" :class="ib.meals.scheduleMode === 'per_day' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">event_note</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Per-Day Plan</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Customise or skip meals for individual days</p>
                  </div>
                </button>
              </div>

              <!-- Master meal plan label -->
              <div class="mb-3">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                  {{ ib.meals.scheduleMode === 'per_day' && mealDayRange.length ? 'Default Meal Plan' : 'Meal Plan' }}
                </p>
                <p v-if="ib.meals.scheduleMode === 'per_day' && mealDayRange.length" class="font-sans text-xs text-(--color-on-surface-variant) mt-1">Applied to all days unless you override a specific day below.</p>
              </div>

              <!-- Master meals -->
              <div class="space-y-4 mb-4">
                <div v-for="(meal, i) in ib.meals.masterMeals" :key="i" class="border border-(--color-outline-variant) rounded-xl overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-3 bg-(--color-surface-container)">
                    <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ masterMealLabel(meal, i) }}</span>
                    <div class="flex items-center gap-2">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                        {{ MEAL_PERIODS.find(p => p.value === meal.mealPeriod)?.label ?? meal.mealPeriod }}
                      </span>
                      <button type="button" :disabled="ib.meals.masterMeals.length === 1"
                        class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                        @click="ib.removeMasterMeal(i)">
                        <span class="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                  <div class="p-4 bg-(--color-surface-container-low) space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="flex flex-col gap-1 md:col-span-2">
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
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Service Type</label>
                        <select v-model="meal.serviceType"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                          <option v-for="t in SERVICE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                        </select>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Cover Count (Pax)</label>
                        <input v-model.number="meal.paxCount" type="number" min="1"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                      </div>
                      <div v-if="ib.meals.mealMode === 'event_linked' && ib.eventsEnabled && ib.events.masterSessions.length" class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Paired with Event Session</label>
                        <select v-model="meal.linkedMasterSessionIndex"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                          <option :value="null">Any / All sessions</option>
                          <option v-for="(s, si) in ib.events.masterSessions" :key="si" :value="si">{{ sessionLabel(s, si) }}</option>
                        </select>
                      </div>
                      <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Dietary & Arrangement Notes</label>
                        <textarea v-model="meal.dietaryNotes" rows="2" placeholder="Halal options, allergen-free stations, table layout…"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors resize-none"></textarea>
                      </div>
                    </div>

                    <!-- Individual orders (individual_order or mixed service type) -->
                    <div v-if="meal.serviceType === 'individual_order' || meal.serviceType === 'mixed'" class="pt-3 border-t border-(--color-outline-variant)">
                      <div class="flex items-center gap-2 mb-2">
                        <span class="material-symbols-outlined text-sm text-(--color-primary)">person_pin</span>
                        <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant)">
                          {{ meal.serviceType === 'mixed' ? 'Buffet Exceptions / Individual Orders' : 'Individual Meal Assignments' }}
                        </p>
                      </div>
                      <p class="font-sans text-xs text-(--color-on-surface-variant) mb-3">
                        {{ meal.serviceType === 'mixed'
                          ? 'Assign specific menu items to guests who require something different from the buffet.'
                          : 'Assign menu items directly to each guest.' }}
                      </p>
                      <div v-if="!ib.attendants.length || (ib.attendants.length === 1 && !ib.attendants[0].fullName)"
                        class="flex items-start gap-2 p-3 bg-(--color-surface-container) rounded-lg">
                        <span class="material-symbols-outlined text-base text-(--color-outline) shrink-0 mt-0.5">info</span>
                        <p class="font-sans text-xs text-(--color-on-surface-variant)">
                          Register guests in the <button type="button" class="text-(--color-primary) font-semibold hover:underline" @click="activeTab = 'guest'">Guest tab</button> first.
                        </p>
                      </div>
                      <div v-else class="space-y-3">
                        <!-- Bulk quick-fill -->
                        <div class="flex items-center gap-2 p-3 bg-(--color-surface-container) rounded-lg flex-wrap sm:flex-nowrap">
                          <span class="material-symbols-outlined text-base text-(--color-on-surface-variant) shrink-0">flash_on</span>
                          <select v-model="getBulk(`master-${i}`).menuItemId"
                            class="flex-1 min-w-0 bg-(--color-savannah-mist) rounded-lg px-3 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                            <option value="">Quick-fill all guests…</option>
                            <option v-for="mi in menuItemsForPeriod(meal.mealPeriod)" :key="mi.id" :value="mi.id">{{ mi.name }} — K {{ mi.price }}</option>
                          </select>
                          <input type="number" min="1" v-model.number="getBulk(`master-${i}`).quantity"
                            class="w-16 shrink-0 bg-(--color-savannah-mist) rounded-lg px-2 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors text-center" />
                          <button type="button" @click="applyBulkToAll(meal, `master-${i}`)"
                            :disabled="!getBulk(`master-${i}`).menuItemId"
                            class="shrink-0 px-3 py-2 rounded-lg bg-(--color-primary) text-white font-sans text-xs font-semibold hover:bg-(--color-clay-earth) transition-colors disabled:opacity-40">
                            Apply to All
                          </button>
                        </div>
                        <!-- Per-guest rows -->
                        <div v-for="(att, attIdx) in ib.attendants" :key="attIdx" class="rounded-lg border border-(--color-outline-variant) overflow-hidden">
                          <div class="flex items-center justify-between px-4 py-2.5 bg-(--color-surface-container)">
                            <div class="flex items-center gap-2">
                              <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-bold text-(--color-primary)">{{ attIdx + 1 }}</span>
                              <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ att.fullName || `Guest ${attIdx + 1}` }}</p>
                              <span v-if="att.isLead" class="font-sans text-xs text-(--color-primary) opacity-70">· Lead</span>
                              <span v-if="att.dietaryNotes" class="font-sans text-xs text-(--color-on-surface-variant) opacity-70 truncate max-w-32">· {{ att.dietaryNotes }}</span>
                            </div>
                            <button type="button" @click="addOrderItem(meal, attIdx)"
                              class="flex items-center gap-1 text-(--color-primary) font-sans text-xs font-semibold hover:underline shrink-0">
                              <span class="material-symbols-outlined text-sm">add</span> Add item
                            </button>
                          </div>
                          <div class="p-3 space-y-2 bg-(--color-surface-container-low)">
                            <p v-if="!meal.individualOrders.some(o => o.attendantIdx === attIdx)"
                              class="font-sans text-xs text-(--color-outline) text-center py-1">No items assigned yet</p>
                            <template v-for="(order, orderIdx) in meal.individualOrders" :key="orderIdx">
                              <div v-if="order.attendantIdx === attIdx" class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <select v-model="order.menuItemId"
                                  class="flex-1 min-w-0 bg-(--color-savannah-mist) rounded-lg px-3 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                                  <option value="">Select menu item…</option>
                                  <option v-for="mi in menuItemsForPeriod(meal.mealPeriod)" :key="mi.id" :value="mi.id">{{ mi.name }} — K {{ mi.price }}</option>
                                </select>
                                <input type="number" min="1" v-model.number="order.quantity"
                                  class="w-16 shrink-0 bg-(--color-savannah-mist) rounded-lg px-2 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors text-center" />
                                <input type="text" placeholder="Notes…" v-model="order.notes"
                                  class="flex-1 min-w-0 sm:w-32 sm:flex-none bg-(--color-savannah-mist) rounded-lg px-2 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                                <button type="button" @click="removeOrderItem(meal, orderIdx)"
                                  class="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors">
                                  <span class="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </div>
                            </template>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button type="button" class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline" @click="ib.addMasterMeal()">
                <span class="material-symbols-outlined text-base">add</span> Add Meal Type
              </button>

              <!-- Per-day meal overrides -->
              <div v-if="ib.meals.scheduleMode === 'per_day' && mealDayRange.length > 0" class="mt-8 pt-6 border-t border-(--color-outline-variant)">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-1">
                  Day-by-Day Meals <span class="text-(--color-outline) font-normal normal-case tracking-normal">({{ mealDayRange.length }} day{{ mealDayRange.length !== 1 ? 's' : '' }})</span>
                </p>
                <p class="font-sans text-xs text-(--color-on-surface-variant) mb-4">Skip days with no meals, or replace the default plan for individual days.</p>
                <div class="space-y-2">
                  <div v-for="date in mealDayRange" :key="date" class="border rounded-xl overflow-hidden"
                    :class="mealDayStatus(date) === 'skipped' ? 'border-(--color-outline-variant) opacity-60' : 'border-(--color-outline-variant)'">
                    <!-- Day row -->
                    <div class="flex items-center justify-between px-4 py-3 bg-(--color-surface-container)">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="font-sans text-sm font-semibold text-(--color-on-surface) shrink-0">{{ fmtDayLabel(date) }}</span>
                        <span v-if="mealDayStatus(date) === 'overridden'"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary) shrink-0">
                          {{ ib.meals.mealOverrides[date].sessions.length }} override{{ ib.meals.mealOverrides[date].sessions.length !== 1 ? 's' : '' }}
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
                          @click="startMealDayOverride(date)">
                          {{ mealDayStatus(date) === 'overridden' ? (expandedMealDayOverride === date ? 'Collapse' : 'Edit') : 'Customise' }}
                        </button>
                        <button v-if="mealDayStatus(date) === 'overridden'" type="button"
                          class="font-sans text-xs text-(--color-on-surface-variant) hover:text-(--color-error) hover:underline px-2 py-1"
                          @click="collapseMealDayOverride(date)">
                          Reset
                        </button>
                        <button type="button"
                          class="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
                          :class="mealDayStatus(date) === 'skipped'
                            ? 'text-(--color-primary) bg-(--color-savannah-mist) hover:opacity-80'
                            : 'text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container)'"
                          :title="mealDayStatus(date) === 'skipped' ? 'Restore meals for this day' : 'No meals on this day'"
                          @click="ib.toggleMealDayExcluded(date)">
                          <span class="material-symbols-outlined text-base">{{ mealDayStatus(date) === 'skipped' ? 'undo' : 'no_meals' }}</span>
                        </button>
                      </div>
                    </div>
                    <!-- Expanded override editor -->
                    <div v-if="expandedMealDayOverride === date && mealDayStatus(date) === 'overridden'" class="p-4 bg-(--color-surface-container-low) space-y-3">
                      <div v-for="(m, mi) in ib.meals.mealOverrides[date].sessions" :key="mi" class="border border-(--color-outline-variant) rounded-xl overflow-hidden">
                        <div class="flex items-center justify-between px-4 py-2.5 bg-(--color-surface-container)">
                          <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ masterMealLabel(m, mi) }}</span>
                          <button type="button" :disabled="ib.meals.mealOverrides[date].sessions.length === 1"
                            class="h-7 w-7 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                            @click="ib.removeOverrideMeal(date, mi)">
                            <span class="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                        <div class="p-4 bg-(--color-savannah-mist) space-y-3">
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div class="flex flex-col gap-1 md:col-span-2">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Session Name</label>
                              <input v-model="m.sessionName" type="text" placeholder="e.g. Gala Dinner, Farewell Lunch"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Meal Period</label>
                              <select v-model="m.mealPeriod"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                                <option v-for="p in MEAL_PERIODS" :key="p.value" :value="p.value">{{ p.label }}</option>
                              </select>
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Service Type</label>
                              <select v-model="m.serviceType"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                                <option v-for="t in SERVICE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                              </select>
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Cover Count (Pax)</label>
                              <input v-model.number="m.paxCount" type="number" min="1"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                            </div>
                            <div class="flex flex-col gap-1 md:col-span-2">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Dietary & Arrangement Notes</label>
                              <textarea v-model="m.dietaryNotes" rows="2" placeholder="Special arrangements for this day…"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors resize-none"></textarea>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button type="button" class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline"
                        @click="ib.addOverrideMeal(date)">
                        <span class="material-symbols-outlined text-base">add</span> Add Meal for This Day
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Hint: per_day but no dates yet -->
              <div v-else-if="ib.meals.scheduleMode === 'per_day' && mealDayRange.length === 0" class="mt-6 flex items-start gap-2 p-3 bg-(--color-surface-container) rounded-xl">
                <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0 mt-0.5">info</span>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">
                  {{ ib.meals.mealMode === 'standalone' ? 'Set a start and end date above to unlock per-day scheduling.' : 'Set event dates to unlock per-day scheduling.' }}
                </p>
              </div>

            </section>

            <!-- Disabled placeholder -->
            <div v-else class="flex flex-col items-center justify-center py-16 text-center">
              <span class="material-symbols-outlined text-5xl text-(--color-outline) mb-4 opacity-40">restaurant</span>
              <p class="font-sans text-sm text-(--color-on-surface-variant)">Meals are not included in this booking.</p>
              <p class="font-sans text-xs text-(--color-outline) mt-1">Click "Include" above to add catering sessions.</p>
            </div>

          </template><!-- end Meals tab -->

          <!-- CTA row -->
          <div class="flex justify-between items-center pt-4">
            <button type="button"
              class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold px-6 py-3 border border-(--color-primary) rounded-lg hover:bg-(--color-surface-container-low) transition-all"
              @click="goBack">
              <span class="material-symbols-outlined text-base">arrow_back</span> Back
            </button>
            <button type="button"
              class="px-8 py-3 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-lg hover:bg-(--color-clay-earth) transition-all"
              @click="goToConfirm">
              Review Booking
            </button>
          </div>

        </template><!-- end step 1 -->

        <!-- ══════════════════════ STEP 2: CONFIRM ═════════════════════════ -->
        <template v-else>

          <div class="flex items-center gap-3 mb-6">
            <span class="material-symbols-outlined text-(--color-primary)" style="font-variation-settings: 'FILL' 1">checklist</span>
            <div>
              <h2 class="font-serif text-2xl text-(--color-on-surface)">Review Your Booking</h2>
              <p class="font-sans text-sm text-(--color-on-surface-variant)">Check all details before submitting. The property team will confirm your request.</p>
            </div>
          </div>

          <!-- ── Guest Details ── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden mb-4">
            <div class="flex items-center gap-2 px-5 py-4 bg-(--color-surface-container) border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-base text-(--color-primary)" style="font-variation-settings: 'FILL' 1">person</span>
              <h3 class="font-sans text-sm font-semibold text-(--color-on-surface) uppercase tracking-widest">Guest Details</h3>
            </div>
            <div class="px-5 py-4 space-y-4">
              <!-- Booked by -->
              <div>
                <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-2">Booking Contact</p>
                <div class="flex items-start gap-3">
                  <div class="w-9 h-9 rounded-full bg-(--color-savannah-mist) flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-(--color-primary) text-base" style="font-variation-settings: 'FILL' 1">account_circle</span>
                  </div>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ ib.bookedBy.name }}</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ ib.bookedBy.email }}</p>
                    <p v-if="ib.bookedBy.phone" class="font-sans text-xs text-(--color-on-surface-variant)">{{ ib.bookedBy.phone }}</p>
                  </div>
                </div>
              </div>
              <!-- Attendants -->
              <div v-if="ib.attendants.some(a => a.fullName)" class="pt-3 border-t border-(--color-outline-variant)">
                <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-2">Guests ({{ ib.attendants.filter(a => a.fullName).length }})</p>
                <div class="space-y-2">
                  <div v-for="(att, i) in ib.attendants.filter(a => a.fullName)" :key="i" class="flex items-center gap-2.5">
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-bold text-(--color-primary) shrink-0">{{ i + 1 }}</span>
                    <div class="min-w-0">
                      <p class="font-sans text-sm text-(--color-on-surface) flex items-center gap-1.5">
                        {{ att.fullName }}
                        <span v-if="att.isLead" class="font-sans text-xs font-semibold text-(--color-primary)">(Lead)</span>
                      </p>
                      <p v-if="att.dietaryNotes" class="font-sans text-xs text-(--color-on-surface-variant) truncate">{{ att.dietaryNotes }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Notes -->
              <div v-if="ib.notes" class="pt-3 border-t border-(--color-outline-variant)">
                <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">General Notes</p>
                <p class="font-sans text-sm text-(--color-on-surface) leading-relaxed">{{ ib.notes }}</p>
              </div>
            </div>
          </section>

          <!-- ── Accommodation ── -->
          <section v-if="ib.accommodationEnabled" class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden mb-4">
            <div class="flex items-center gap-2 px-5 py-4 bg-(--color-surface-container) border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-base text-(--color-primary)">bed</span>
              <h3 class="font-sans text-sm font-semibold text-(--color-on-surface) uppercase tracking-widest">Accommodation</h3>
            </div>
            <div class="px-5 py-4 space-y-4">
              <!-- Dates -->
              <div v-if="ib.accommodation.checkIn" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Dates</p>
                  <p class="font-sans text-sm text-(--color-on-surface)">
                    {{ fmt(ib.accommodation.checkIn) }}
                    <span v-if="ib.accommodation.checkOut"> – {{ fmt(ib.accommodation.checkOut) }}</span>
                  </p>
                  <p v-if="nights(ib.accommodation.checkIn, ib.accommodation.checkOut)" class="font-sans text-xs text-(--color-on-surface-variant)">
                    {{ nights(ib.accommodation.checkIn, ib.accommodation.checkOut) }} night{{ nights(ib.accommodation.checkIn, ib.accommodation.checkOut) !== 1 ? 's' : '' }}
                  </p>
                </div>
              </div>
              <!-- Per-guest room list -->
              <div>
                <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-2">Room Assignments</p>
                <div class="divide-y divide-(--color-outline-variant) border border-(--color-outline-variant) rounded-xl overflow-hidden">
                  <div v-for="(att, idx) in ib.attendants" :key="idx"
                    class="flex items-center gap-3 px-4 py-3 bg-(--color-surface-container-low)">
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-bold text-(--color-primary) shrink-0">{{ idx + 1 }}</span>
                    <div class="flex-1 min-w-0">
                      <p class="font-sans text-sm text-(--color-on-surface) truncate">{{ att.fullName || `Guest ${idx + 1}` }}</p>
                    </div>
                    <div v-if="getAttendantRoom(idx)" class="text-right shrink-0">
                      <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ getAttendantRoom(idx).roomName }}</p>
                      <p class="font-sans text-xs text-(--color-primary)">K {{ Number(getAttendantRoom(idx).rate).toLocaleString() }}/night</p>
                    </div>
                    <p v-else class="font-sans text-xs text-(--color-outline) italic shrink-0">No room assigned</p>
                  </div>
                </div>
              </div>
              <!-- Notes -->
              <div v-if="ib.accommodation.notes">
                <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Additional Requests</p>
                <p class="font-sans text-sm text-(--color-on-surface) leading-relaxed">{{ ib.accommodation.notes }}</p>
              </div>
            </div>
          </section>

          <!-- ── Events ── -->
          <section v-if="ib.eventsEnabled" class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden mb-4">
            <div class="flex items-center gap-2 px-5 py-4 bg-(--color-surface-container) border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-base text-(--color-primary)">event</span>
              <h3 class="font-sans text-sm font-semibold text-(--color-on-surface) uppercase tracking-widest">Events</h3>
              <span class="ml-auto font-sans text-xs text-(--color-on-surface-variant)">
                {{ ib.events.scheduleMode === 'per_day' ? 'Per-day' : 'Uniform' }} schedule
              </span>
            </div>
            <div class="px-5 py-4 space-y-4">
              <div v-if="ib.events.reasonForBooking">
                <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Purpose</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ ib.events.reasonForBooking }}</p>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div v-if="ib.events.startDate">
                  <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Event Dates</p>
                  <p class="font-sans text-sm text-(--color-on-surface)">
                    {{ fmt(ib.events.startDate) }}<span v-if="ib.events.endDate && ib.events.endDate !== ib.events.startDate"> – {{ fmt(ib.events.endDate) }}</span>
                  </p>
                  <p v-if="dayRange.length > 1" class="font-sans text-xs text-(--color-on-surface-variant)">{{ dayRange.length }} days</p>
                </div>
                <div>
                  <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Sessions per Day</p>
                  <p class="font-sans text-sm text-(--color-on-surface)">{{ ib.events.masterSessions.length }} session{{ ib.events.masterSessions.length !== 1 ? 's' : '' }}</p>
                </div>
              </div>
              <div class="divide-y divide-(--color-outline-variant) border border-(--color-outline-variant) rounded-xl overflow-hidden">
                <div v-for="(s, i) in ib.events.masterSessions" :key="i" class="px-4 py-3 flex items-start gap-3 bg-(--color-surface-container-low)">
                  <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-bold text-(--color-primary) shrink-0 mt-0.5">{{ i + 1 }}</span>
                  <div class="min-w-0 flex-1">
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ sessionLabel(s, i) }}</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">
                      {{ EVENT_TYPES.find(t => t.value === s.eventType)?.label ?? s.eventType }}
                      <span v-if="s.startTime && s.endTime"> · {{ s.startTime }} – {{ s.endTime }}</span>
                      <span v-if="s.expectedAttendees"> · {{ s.expectedAttendees }} pax</span>
                    </p>
                    <p v-if="s.venueId" class="font-sans text-xs text-(--color-on-surface-variant)">
                      {{ DUMMY_CONFERENCE_ROOMS.find(r => r.id === s.venueId)?.name ?? s.venueId }}
                    </p>
                  </div>
                </div>
              </div>
              <div v-if="ib.events.scheduleMode === 'per_day' && Object.keys(ib.events.dayOverrides).length">
                <p class="font-sans text-xs text-(--color-on-surface-variant)">
                  + <strong class="text-(--color-on-surface)">{{ Object.values(ib.events.dayOverrides).filter(o => !o.excluded).length }}</strong> customised day{{ Object.values(ib.events.dayOverrides).filter(o => !o.excluded).length !== 1 ? 's' : '' }}
                  <span v-if="Object.values(ib.events.dayOverrides).filter(o => o.excluded).length">
                    · <strong class="text-(--color-on-surface)">{{ Object.values(ib.events.dayOverrides).filter(o => o.excluded).length }}</strong> skipped
                  </span>
                </p>
              </div>
            </div>
          </section>

          <!-- ── Meals ── -->
          <section v-if="ib.mealsEnabled" class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden mb-4">
            <div class="flex items-center gap-2 px-5 py-4 bg-(--color-surface-container) border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-base text-(--color-primary)">restaurant</span>
              <h3 class="font-sans text-sm font-semibold text-(--color-on-surface) uppercase tracking-widest">Meals</h3>
              <span class="ml-auto font-sans text-xs text-(--color-on-surface-variant)">
                {{ ib.meals.mealMode === 'standalone' ? 'Standalone' : 'Event-linked' }}
                · {{ ib.meals.scheduleMode === 'per_day' ? 'Per-day' : 'Uniform' }}
              </span>
            </div>
            <div class="px-5 py-4 space-y-4">
              <div v-if="ib.meals.reasonForBooking">
                <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Purpose</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ ib.meals.reasonForBooking }}</p>
              </div>
              <div v-if="ib.meals.mealMode === 'standalone' && ib.meals.startDate">
                <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-1">Meal Dates</p>
                <p class="font-sans text-sm text-(--color-on-surface)">
                  {{ fmt(ib.meals.startDate) }}<span v-if="ib.meals.endDate && ib.meals.endDate !== ib.meals.startDate"> – {{ fmt(ib.meals.endDate) }}</span>
                </p>
              </div>
              <div class="divide-y divide-(--color-outline-variant) border border-(--color-outline-variant) rounded-xl overflow-hidden">
                <div v-for="(m, i) in ib.meals.masterMeals" :key="i" class="px-4 py-3 flex items-start gap-3 bg-(--color-surface-container-low)">
                  <span class="material-symbols-outlined text-(--color-primary) text-base mt-0.5 shrink-0">restaurant</span>
                  <div class="min-w-0 flex-1">
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ masterMealLabel(m, i) }}</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">
                      {{ MEAL_PERIODS.find(p => p.value === m.mealPeriod)?.label ?? m.mealPeriod }}
                      · {{ SERVICE_TYPES.find(t => t.value === m.serviceType)?.label ?? m.serviceType }}
                      <span v-if="m.paxCount"> · {{ m.paxCount }} pax</span>
                    </p>
                    <p v-if="m.dietaryNotes" class="font-sans text-xs text-(--color-on-surface-variant) leading-relaxed mt-0.5">{{ m.dietaryNotes }}</p>
                  </div>
                </div>
              </div>
              <div v-if="ib.meals.scheduleMode === 'per_day' && Object.keys(ib.meals.mealOverrides).length">
                <p class="font-sans text-xs text-(--color-on-surface-variant)">
                  + <strong class="text-(--color-on-surface)">{{ Object.values(ib.meals.mealOverrides).filter(o => !o.excluded).length }}</strong> customised day{{ Object.values(ib.meals.mealOverrides).filter(o => !o.excluded).length !== 1 ? 's' : '' }}
                  <span v-if="Object.values(ib.meals.mealOverrides).filter(o => o.excluded).length">
                    · <strong class="text-(--color-on-surface)">{{ Object.values(ib.meals.mealOverrides).filter(o => o.excluded).length }}</strong> skipped
                  </span>
                </p>
              </div>
            </div>
          </section>

          <!-- ── Pricing notice ── -->
          <div class="flex items-start gap-3 p-4 bg-(--color-surface-container) rounded-xl border border-(--color-outline-variant) mb-6">
            <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0 mt-0.5">info</span>
            <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed">
              Rates and final pricing will be confirmed by the property team within 24 hours of submission. You will receive a confirmation email once the booking is approved.
            </p>
          </div>

          <!-- Submit error -->
          <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
            <div v-if="submitError" class="flex items-center gap-2 p-3 rounded-lg bg-(--color-error-container) text-(--color-on-error-container) mb-4">
              <span class="material-symbols-outlined text-base shrink-0">error</span>
              <p class="font-sans text-sm">{{ submitError }}</p>
            </div>
          </Transition>

          <div class="flex justify-between items-center pt-2">
            <button type="button"
              class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold px-6 py-3 border border-(--color-primary) rounded-lg hover:bg-(--color-surface-container-low) transition-all"
              @click="goBack">
              <span class="material-symbols-outlined text-base">arrow_back</span> Back to Services
            </button>
            <button type="button" :disabled="loading" @click="submit"
              class="px-8 py-3 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-lg hover:bg-(--color-clay-earth) transition-all disabled:opacity-60 flex items-center gap-2">
              <span v-if="loading" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
              {{ loading ? 'Submitting…' : 'Submit Booking' }}
            </button>
          </div>

        </template><!-- end step 2 -->

      </div><!-- end main column -->

      <!-- ── Sidebar ────────────────────────────────────────────────────── -->
      <aside class="lg:col-span-4 lg:sticky lg:top-8 space-y-4">
        <div class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
          <div class="px-5 py-4 border-b border-(--color-outline-variant) bg-(--color-surface-container)">
            <h3 class="font-serif text-lg text-(--color-on-surface)">Booking Summary</h3>
          </div>
          <div class="divide-y divide-(--color-outline-variant)">

            <!-- Property -->
            <div class="flex items-start gap-3 px-5 py-4">
              <span class="material-symbols-outlined text-(--color-primary) text-base mt-0.5 shrink-0">home_work</span>
              <div class="min-w-0">
                <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">Property</p>
                <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ lodge?.name ?? '—' }}</p>
                <p v-if="selectedBranch" class="font-sans text-xs text-(--color-primary) font-semibold mt-0.5 flex items-center gap-1">
                  <span class="material-symbols-outlined text-xs">location_on</span>{{ selectedBranch.name }}
                </p>
              </div>
            </div>

            <!-- Guest -->
            <div class="flex items-start gap-3 px-5 py-4">
              <span class="material-symbols-outlined text-(--color-primary) text-base mt-0.5 shrink-0" style="font-variation-settings: 'FILL' 1">account_circle</span>
              <div class="min-w-0 flex-1">
                <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">Guest</p>
                <p class="font-sans text-sm font-semibold text-(--color-on-surface) truncate">{{ ib.bookedBy.name || '—' }}</p>
                <p class="font-sans text-xs text-(--color-on-surface-variant) truncate">{{ ib.bookedBy.email || 'No email set' }}</p>
                <p v-if="ib.attendants.filter(a => a.fullName).length > 1"
                  class="font-sans text-xs text-(--color-primary) mt-0.5">
                  + {{ ib.attendants.filter(a => a.fullName).length - 1 }} additional guest{{ ib.attendants.filter(a => a.fullName).length > 2 ? 's' : '' }}
                </p>
              </div>
            </div>

            <!-- Services -->
            <div class="px-5 py-4">
              <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-3">Services</p>
              <p v-if="!ib.hasAnyService" class="font-sans text-xs text-(--color-outline) text-center py-2 italic">
                Use the tabs above to include services
              </p>
              <div v-else class="space-y-3">

                <!-- Accommodation chip -->
                <div v-if="ib.accommodationEnabled" class="p-3 rounded-xl bg-(--color-surface-container) border border-(--color-outline-variant)">
                  <div class="flex items-center gap-2 mb-1.5">
                    <span class="material-symbols-outlined text-(--color-primary) text-base">bed</span>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Accommodation</p>
                  </div>
                  <p v-if="ib.accommodation.checkIn" class="font-sans text-xs text-(--color-on-surface-variant)">
                    {{ fmt(ib.accommodation.checkIn) }}
                    <span v-if="ib.accommodation.checkOut"> – {{ fmt(ib.accommodation.checkOut) }}</span>
                  </p>
                  <p v-if="nights(ib.accommodation.checkIn, ib.accommodation.checkOut)"
                    class="font-sans text-xs text-(--color-primary) font-semibold mt-0.5">
                    {{ nights(ib.accommodation.checkIn, ib.accommodation.checkOut) }} night{{ nights(ib.accommodation.checkIn, ib.accommodation.checkOut) !== 1 ? 's' : '' }} stay
                  </p>
                  <div v-if="(ib.accommodation.attendantRooms ?? []).length" class="mt-2 space-y-1">
                    <div v-for="r in (ib.accommodation.attendantRooms ?? [])" :key="r.attendantIdx"
                      class="flex items-center gap-1.5 font-sans text-xs text-(--color-on-surface)">
                      <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-(--color-savannah-mist) font-bold text-(--color-primary) text-[10px] shrink-0">{{ r.attendantIdx + 1 }}</span>
                      <span class="truncate">{{ r.roomName }}</span>
                    </div>
                  </div>
                  <p v-else class="font-sans text-xs text-(--color-outline) italic mt-1">No rooms assigned yet</p>
                </div>

                <!-- Events chip -->
                <div v-if="ib.eventsEnabled" class="p-3 rounded-xl bg-(--color-surface-container) border border-(--color-outline-variant)">
                  <div class="flex items-center gap-2 mb-1.5">
                    <span class="material-symbols-outlined text-(--color-primary) text-base">event</span>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Events</p>
                  </div>
                  <p v-if="ib.events.startDate" class="font-sans text-xs text-(--color-on-surface-variant)">
                    {{ fmt(ib.events.startDate) }}<span v-if="ib.events.endDate && ib.events.endDate !== ib.events.startDate"> – {{ fmt(ib.events.endDate) }}</span>
                  </p>
                  <p v-if="dayRange.length" class="font-sans text-xs text-(--color-primary) font-semibold mt-0.5">
                    {{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }}
                    · {{ ib.events.masterSessions.length }} session{{ ib.events.masterSessions.length !== 1 ? 's' : '' }} per day
                    <span v-if="ib.events.scheduleMode === 'per_day' && eventDaySummary.customised > 0"
                      class="text-(--color-on-surface-variant) font-normal">
                      ({{ eventDaySummary.customised }} customised)
                    </span>
                  </p>
                  <p v-if="!ib.events.startDate" class="font-sans text-xs text-(--color-outline) italic">No dates set yet</p>
                </div>

                <!-- Meals chip -->
                <div v-if="ib.mealsEnabled" class="p-3 rounded-xl bg-(--color-surface-container) border border-(--color-outline-variant)">
                  <div class="flex items-center gap-2 mb-1.5">
                    <span class="material-symbols-outlined text-(--color-primary) text-base">restaurant</span>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Meals</p>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span v-for="(m, i) in ib.meals.masterMeals" :key="i"
                      class="inline-flex items-center px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                      {{ MEAL_PERIODS.find(p => p.value === m.mealPeriod)?.label ?? m.mealPeriod }}
                    </span>
                  </div>
                  <p v-if="mealDayRange.length" class="font-sans text-xs text-(--color-on-surface-variant) mt-1">
                    {{ mealDayRange.length }} day{{ mealDayRange.length !== 1 ? 's' : '' }}
                    · {{ ib.meals.masterMeals.length }} meal{{ ib.meals.masterMeals.length !== 1 ? 's' : '' }} per day
                    <span v-if="ib.meals.mealMode === 'event_linked'" class="text-(--color-primary) font-semibold"> · Event-linked</span>
                  </p>
                </div>

              </div>
            </div>

          </div><!-- end divide -->
        </div><!-- end card -->

        <!-- Proceed button (step 1 only) -->
        <button v-if="step === 1" type="button" @click="goToConfirm"
          class="w-full py-3.5 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-xl hover:bg-(--color-clay-earth) transition-all flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-base">arrow_forward</span>
          Review &amp; Confirm
        </button>

        <div class="flex items-start gap-2 p-4 bg-(--color-surface-container) rounded-xl">
          <span class="material-symbols-outlined text-base text-(--color-primary) mt-0.5 shrink-0">info</span>
          <p class="font-sans text-xs text-(--color-on-surface-variant) leading-relaxed">Pricing is confirmed by the property team after your booking is received.</p>
        </div>
      </aside>

    </div>
  </div>
</template>

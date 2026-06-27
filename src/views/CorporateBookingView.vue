<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLodgesStore } from '@/stores/lodges'
import { useAuthStore } from '@/stores/auth'
import { useCorporateBookingStore } from '@/stores/corporateBooking'
import { uploadBookingDocument } from '@/services/storage'
import api from '@/lib/api'
import {
  lookupByTpin,
  getBranchesForCompany,
  getProfilesForBranch,
} from '@/data/dummyCorporateData'
import { EVENT_TYPES, SETUP_TYPES, PRICING_BASIS, MEAL_PERIODS, SERVICE_TYPES } from '@/data/bookingConstants'

const route  = useRoute()
const router = useRouter()
const lodgesStore = useLodgesStore()
const auth   = useAuthStore()
const cb     = useCorporateBookingStore()

const lodgeId = route.params.id
const lodge   = computed(() => lodgesStore.lodges.find(l => String(l.id) === String(lodgeId)))
const branches = computed(() => lodgesStore.branchesFor(lodgeId))
const selectedBranch = computed(() => branches.value.find(b => String(b.id) === String(cb.branchId)) ?? null)

// ── Multi-step ───────────────────────────────────────────────────────────
const step      = ref(1)
const loading   = ref(false)
const success   = ref(false)
const errors    = ref({})
const submitError = ref('')

// ── Collapsible section state ─────────────────────────────────────────────
const approverExpanded   = ref(false)
const attendantsExpanded = ref(false)
const docsExpanded       = ref(false)

// ── Tab navigation ────────────────────────────────────────────────────────
const activeTab = ref('organisation')

const TABS = [
  { key: 'organisation',  label: 'Organisation',  shortLabel: 'Org',    icon: 'corporate_fare' },
  { key: 'accommodation', label: 'Accommodation', shortLabel: 'Rooms',  icon: 'bed'            },
  { key: 'events',        label: 'Events',        shortLabel: 'Events', icon: 'event'          },
  { key: 'meals',         label: 'Meals',         shortLabel: 'Meals',  icon: 'restaurant'     },
]

const tabHasError = computed(() => ({
  organisation: ['companyName', 'bookedByName', 'bookedByEmail', 'service', 'approverName', 'approverEmail', 'costCenter']
    .some(k => errors.value[k]) || (cb.participantMode === 'detailed' && Object.keys(errors.value).some(k => k.startsWith('att_'))),
  accommodation: ['accomCheckIn', 'accomCheckOut'].some(k => errors.value[k]),
  events:        Object.keys(errors.value).some(k => k.startsWith('ev_')) || !!errors.value.eventsEndDate,
  meals:         false,
}))

// ── Company hierarchy (dummy-backed) ─────────────────────────────────────
const companyQuery       = ref('')
const companyResults     = ref([])
const companySearchState = ref('idle') // idle | searching | found | not_found | new
const companyBranches    = ref([])
const branchProfiles     = ref([])

function doTpinLookup() {
  const q = companyQuery.value.trim()
  cb.tpin = q
  if (q.length < 2) { companyResults.value = []; companySearchState.value = 'idle'; return }
  companySearchState.value = 'searching'
  setTimeout(() => {
    const results = lookupByTpin(q)
    companyResults.value    = results
    companySearchState.value = results.length ? 'found' : 'not_found'
  }, 300)
}

function selectCompany(company) {
  cb.fillFromProfile(company, null, null)
  companyQuery.value       = company.registrationNo
  cb.tpin                  = company.registrationNo
  companyResults.value     = []
  companySearchState.value = 'found'
  companyBranches.value    = getBranchesForCompany(company.id)
  branchProfiles.value     = []
  cb.selectedBranchId      = null
  cb.selectedProfileId     = null
  cb.branchName            = ''
  cb.departmentName        = ''
  cb.costCenter            = ''
  cb.glCode                = ''
  cb.approverName          = ''
  cb.approverEmail         = ''
  cb.approverPhone         = ''
  cb.approverTitle         = ''
}

function onCompanyBranchChange(branchId) {
  const branch = companyBranches.value.find(b => b.id === branchId)
  if (!branch) return
  cb.branchName = branch.name
  cb.selectedBranchId = branchId
  branchProfiles.value = getProfilesForBranch(branchId)
  cb.selectedProfileId = null
  cb.departmentName = ''
  cb.costCenter     = ''
  cb.glCode         = ''
  cb.approverName   = ''
  cb.approverEmail  = ''
  cb.approverPhone  = ''
  cb.approverTitle  = ''
}

function onProfileChange(profileId) {
  const profile = branchProfiles.value.find(p => p.id === profileId)
  if (!profile) return
  cb.selectedProfileId = profileId
  cb.departmentName = profile.departmentName
  cb.costCenter     = profile.costCenter
  cb.glCode         = profile.glCode
  cb.approverName   = profile.approverName
  cb.approverEmail  = profile.approverEmail
  cb.approverPhone  = profile.approverPhone
  cb.approverTitle  = profile.approverTitle
}

function clearCompany() {
  companyQuery.value       = ''
  companyResults.value     = []
  companySearchState.value = 'idle'
  companyBranches.value    = []
  branchProfiles.value     = []
  cb.clearCompanySelection()
}

function useNewCompany() {
  companySearchState.value = 'new'
  companyResults.value     = []
}

// ── Venue availability ────────────────────────────────────────────────────
const availableVenues  = ref([])
const venuesLoading    = ref(false)
const venuesError      = ref(false)
const expandedVenueKey = ref(null)

async function fetchAvailableVenues() {
  const orgId = cb.lodgeId || lodgeId
  if (!orgId) { venuesError.value = true; return }
  const { startDate, endDate } = cb.events
  venuesLoading.value = true
  venuesError.value   = false
  try {
    const params = { org_id: orgId, page_size: 100 }
    if (cb.branchId) params.branch_id = cb.branchId
    if (startDate)   params.check_in  = startDate
    if (endDate)     params.check_out = endDate
    const { data } = await api.get('/guest/venues', { params })
    availableVenues.value = data.data ?? data
  } catch {
    venuesError.value     = true
    availableVenues.value = []
  } finally {
    venuesLoading.value = false
  }
}

function toggleVenuePicker(key) {
  expandedVenueKey.value = expandedVenueKey.value === key ? null : key
  if (expandedVenueKey.value !== null && !availableVenues.value.length && !venuesLoading.value) {
    fetchAvailableVenues()
  }
}

function selectVenueForSession(session, venue) {
  session.venueId       = venue.id
  session.venueName     = venue.name
  session.venueCapacity = venue.capacity ?? null
  expandedVenueKey.value = null
}

function clearVenueFromSession(session) {
  session.venueId       = ''
  session.venueName     = ''
  session.venueCapacity = null
}

watch(
  () => [cb.events.startDate, cb.events.endDate],
  () => {
    expandedVenueKey.value = null
    availableVenues.value  = []
    if (cb.eventsEnabled) fetchAvailableVenues()
  }
)

// ── Lodge room types ──────────────────────────────────────────────────────
const lodgeRoomTypes = ref([])

async function fetchRoomTypes() {
  try {
    const params = { org_id: lodgeId, page_size: 100 }
    if (cb.branchId) params.branch_id = cb.branchId
    const { data } = await api.get('/guest/rooms', { params })
    const rooms = data.data ?? data
    lodgeRoomTypes.value = [...new Set(rooms.map(r => r.type).filter(Boolean))]
  } catch {
    lodgeRoomTypes.value = []
  }
}

// ── Document upload ────────────────────────────────────────────────────────
const docFiles = ref([])

function pickDocs(e) {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png']
  Array.from(e.target.files).forEach(f => {
    if (!allowed.includes(f.type)) { docFiles.value.push({ name: f.name, error: 'Only PDF, JPG, PNG allowed' }); return }
    if (f.size > 5 * 1024 * 1024) { docFiles.value.push({ name: f.name, error: 'Max 5MB' }); return }
    docFiles.value.push({ file: f, name: f.name, progress: 0, url: null, error: null })
  })
  e.target.value = ''
}

function removeDoc(i) { docFiles.value.splice(i, 1) }

async function uploadDocs() {
  const pending = docFiles.value.filter(d => d.file && !d.url && !d.error)
  await Promise.all(pending.map(async d => {
    try { d.url = await uploadBookingDocument(d.file, p => { d.progress = p }) }
    catch { d.error = 'Upload failed' }
  }))
  const failed = docFiles.value.filter(d => d.file && d.error)
  return failed.length ? `${failed.length} document(s) failed to upload. Remove them and try again.` : null
}

// ── Constants ──────────────────────────────────────────────────────────────
const INDUSTRIES = [
  'Agriculture & Forestry', 'Automotive', 'Aviation & Aerospace',
  'Banking & Finance', 'Construction & Real Estate',
  'Consulting & Professional Services', 'Education & Training',
  'Energy & Utilities', 'Engineering', 'Entertainment & Media',
  'Government & Public Sector', 'Healthcare & Pharmaceuticals',
  'Hospitality & Tourism', 'Information Technology', 'Insurance',
  'Legal Services', 'Logistics & Transport', 'Manufacturing',
  'Mining & Quarrying', 'Non-Governmental Organizations',
  'Retail & Wholesale Trade', 'Telecommunications', 'Other',
]


// ── Validation ─────────────────────────────────────────────────────────────
function validate() {
  const e = {}

  if (!cb.companyName) e.companyName = 'Required'
  if (!cb.bookedBy.name)  e.bookedByName  = 'Required'
  if (!cb.bookedBy.email) e.bookedByEmail = 'Required'
  else if (!/\S+@\S+\.\S+/.test(cb.bookedBy.email)) e.bookedByEmail = 'Enter a valid email'

  if (!cb.hasAnyService) e.service = 'Select at least one service to continue'

  if (!cb.approverName)  e.approverName  = 'Required'
  if (!cb.approverEmail) e.approverEmail = 'Required'
  else if (!/\S+@\S+\.\S+/.test(cb.approverEmail)) e.approverEmail = 'Enter a valid email'
  if (!cb.costCenter)    e.costCenter    = 'Required'

  if (cb.participantMode === 'detailed') {
    cb.attendants.forEach((a, i) => {
      if (!a.fullName) e[`att_${i}_name`] = 'Required'
      if (a.isLead) {
        if (!a.email)    e[`att_${i}_email`]    = 'Required for lead contact'
        if (!a.phone)    e[`att_${i}_phone`]    = 'Required for lead contact'
        if (!a.idNumber) e[`att_${i}_idNumber`] = 'Required for lead contact'
      }
    })
  }

  if (cb.eventsEnabled) {
    if (cb.events.startDate && cb.events.endDate && cb.events.endDate < cb.events.startDate) {
      e.eventsEndDate = 'End date cannot be before start date'
    }
    cb.events.masterSessions.forEach((s, i) => {
      if (!s.startTime) e[`ev_master_${i}_start`] = 'Required'
      if (!s.endTime)   e[`ev_master_${i}_end`]   = 'Required'
    })
    Object.entries(cb.events.dayOverrides).forEach(([date, ov]) => {
      if (ov.excluded) return
      ;(ov.sessions ?? []).forEach((s, i) => {
        if (!s.startTime) e[`ev_ov_${date}_${i}_start`] = 'Required'
        if (!s.endTime)   e[`ev_ov_${date}_${i}_end`]   = 'Required'
      })
    })
  }

  if (cb.accommodationEnabled) {
    if (!cb.accommodation.checkIn)  e.accomCheckIn  = 'Required'
    if (!cb.accommodation.checkOut) e.accomCheckOut = 'Required'
  }

  errors.value = e
  return Object.keys(e).length === 0
}

function goToConfirm() {
  if (!validate()) {
    if (['approverName', 'approverEmail', 'costCenter'].some(k => errors.value[k])) approverExpanded.value = true
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
  loading.value   = true
  submitError.value = ''
  try {
    if (docFiles.value.some(d => d.file && !d.url)) {
      const err = await uploadDocs()
      if (err) { submitError.value = err; return }
    }
    cb.documents = docFiles.value.filter(d => d.url).map(d => d.url)
    await cb.submit()
    success.value = true
    cb.reset()
    docFiles.value = []
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

function toggleService(key) {
  const wasEnabled = isServiceEnabled(key)
  if (key === 'accommodation') cb.accommodationEnabled = !cb.accommodationEnabled
  if (key === 'events')        cb.eventsEnabled        = !cb.eventsEnabled
  if (key === 'meals')         cb.mealsEnabled         = !cb.mealsEnabled
  if (!wasEnabled) {
    activeTab.value = key
  } else if (activeTab.value === key) {
    activeTab.value = 'organisation'
  }
}

// ── Individual meal order helpers ─────────────────────────────────────────
function addOrderItem(session, attendantIdx) {
  session.individualOrders.push({ attendantIdx, menuItemId: '', quantity: 1, notes: '' })
}
function removeOrderItem(session, orderIdx) {
  session.individualOrders.splice(orderIdx, 1)
}
// ── Menu items (fetched from API) ───────────────────────────────────────────
const menuItems   = ref([])
const menuLoading = ref(false)

async function fetchMenuItems() {
  menuLoading.value = true
  try {
    const params = { org_id: lodgeId }
    if (cb.branchId) params.branch_id = cb.branchId
    const { data } = await api.get('/guest/menu', { params })
    const wrapper    = data.items
    const firstPage  = wrapper?.data ?? []
    const total      = wrapper?.total     ?? firstPage.length
    const pageSize   = wrapper?.page_size ?? 10
    const totalPages = Math.ceil(total / pageSize)
    let rest = []
    if (totalPages > 1) {
      const results = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          api.get('/guest/menu', { params: { ...params, page: i + 2, page_size: pageSize } })
        )
      )
      rest = results.flatMap(r => r.data.items?.data ?? [])
    }
    menuItems.value = [...firstPage, ...rest]
  } catch {
    menuItems.value = []
  } finally {
    menuLoading.value = false
  }
}

function menuItemsForPeriod(mealPeriod) {
  const catMap = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', tea_break: 'tea_break', cocktail: 'beverage' }
  const cat = catMap[mealPeriod]
  return cat ? menuItems.value.filter(m => m.category === cat || m.category === 'beverage') : menuItems.value
}

// ── Meal mode + bulk assignment ───────────────────────────────────────────
const bulkMenuItems = ref({})

function getBulk(key) {
  if (!bulkMenuItems.value[key]) bulkMenuItems.value[key] = { menuItemId: '', quantity: 1 }
  return bulkMenuItems.value[key]
}

function applyBulkToAll(session, key) {
  const b = bulkMenuItems.value[key]
  if (!b?.menuItemId) return
  session.individualOrders = cb.attendants.map((_, idx) => ({
    attendantIdx: idx,
    menuItemId: b.menuItemId,
    quantity: b.quantity,
    notes: '',
  }))
}

function setMealMode(mode) {
  if (cb.meals.mealMode === mode) return
  cb.meals.mealMode = mode
  cb.meals.mealOverrides = {}
  expandedMealDayOverride.value = null
}

// ── Event schedule helpers ────────────────────────────────────────────────
const dayRange = computed(() => {
  const { startDate, endDate } = cb.events
  if (!startDate || !endDate || endDate < startDate) return []
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const start = new Date(Date.UTC(sy, sm - 1, sd))
  const end   = new Date(Date.UTC(ey, em - 1, ed))
  const dates = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
})

const expandedDayOverride = ref(null)

const eventDaySummary = computed(() => {
  const total      = dayRange.value.length
  const skipped    = Object.values(cb.events.dayOverrides).filter(o =>  o.excluded).length
  const customised = Object.values(cb.events.dayOverrides).filter(o => !o.excluded).length
  return { total, skipped, customised, defaultCount: total - skipped - customised }
})

const mealDayRange = computed(() => {
  const useEvents = cb.meals.mealMode === 'event_linked' && cb.eventsEnabled
  const startDate = useEvents ? cb.events.startDate : cb.meals.startDate
  const endDate   = useEvents ? cb.events.endDate   : cb.meals.endDate
  if (!startDate || !endDate || endDate < startDate) return []
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const start = new Date(Date.UTC(sy, sm - 1, sd))
  const end   = new Date(Date.UTC(ey, em - 1, ed))
  const dates = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
})

const expandedMealDayOverride = ref(null)

function fmtDayLabel(iso) {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function dayStatus(date) {
  const ov = cb.events.dayOverrides[date]
  if (!ov) return 'default'
  if (ov.excluded) return 'skipped'
  return 'overridden'
}

function startDayOverride(date) {
  cb.setDayOverride(date)
  expandedDayOverride.value = expandedDayOverride.value === date ? null : date
}

function collapseDayOverride(date) {
  cb.clearDayOverride(date)
  if (expandedDayOverride.value === date) expandedDayOverride.value = null
}

function sessionLabel(s, i) {
  return s.sessionName || `Session ${i + 1}`
}

function isServiceEnabled(key) {
  if (key === 'accommodation') return cb.accommodationEnabled
  if (key === 'events')        return cb.eventsEnabled
  if (key === 'meals')         return cb.mealsEnabled
  return false
}

function masterMealLabel(m, i) {
  if (m.sessionName) return m.sessionName
  return MEAL_PERIODS.find(p => p.value === m.mealPeriod)?.label ?? `Meal ${i + 1}`
}

function mealDayStatus(date) {
  const ov = cb.meals.mealOverrides[date]
  if (!ov) return 'default'
  if (ov.excluded) return 'skipped'
  return 'overridden'
}

function startMealDayOverride(date) {
  cb.setMealOverride(date)
  expandedMealDayOverride.value = expandedMealDayOverride.value === date ? null : date
}

function collapseMealDayOverride(date) {
  cb.clearMealOverride(date)
  if (expandedMealDayOverride.value === date) expandedMealDayOverride.value = null
}

const stepDefs = computed(() => [
  { label: 'Services', active: step.value === 1 },
  { label: 'Confirm',  active: step.value === 2 },
])

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function nights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  return Math.max(0, Math.floor((new Date(checkOut) - new Date(checkIn)) / 86400000))
}

onMounted(async () => {
  await lodgesStore.fetchLodges()
  lodgesStore.fetchLodgeDetail(lodgeId)
  cb.setLodge(lodgeId, lodge.value?.name ?? '')
  if (route.query.branchId && !cb.branchId) cb.branchId = route.query.branchId
  fetchRoomTypes()
  fetchMenuItems()
  if (auth.user) {
    if (!cb.bookedBy.name && auth.user.firstName)
      cb.bookedBy.name = `${auth.user.firstName} ${auth.user.lastName ?? ''}`.trim()
    if (!cb.bookedBy.email && auth.user.email)
      cb.bookedBy.email = auth.user.email
  }

  // Pre-populate from room query params (e.g. from RoomDetailView / LodgeDetailView)
  const q = route.query
  if (q.roomId) {
    cb.accommodationEnabled = true
    if (q.checkIn)  cb.accommodation.checkIn  = q.checkIn
    if (q.checkOut) cb.accommodation.checkOut = q.checkOut
    if (q.roomType) cb.accommodation.roomType = q.roomType
    cb.accommodation.reasonForBooking = q.roomName ? `Accommodation: ${q.roomName}` : ''
    activeTab.value = 'accommodation'
  }

  // Pre-populate from venue query params (e.g. from VenueDetailView)
  if (q.venueId) {
    cb.eventsEnabled = true
    cb.events.reasonForBooking = q.venueName || ''
    if (cb.events.masterSessions?.[0]) {
      cb.events.masterSessions[0].venueId = q.venueId
    }
    if (q.eventDate) {
      cb.events.startDate = q.eventDate
      cb.events.endDate   = q.eventDate
    }
    activeTab.value = 'events'
  }
})

watch(() => cb.branchId, () => { fetchRoomTypes(); fetchMenuItems() })

watch(dayRange, (range) => {
  if (range.length <= 1) cb.events.scheduleMode = 'uniform'
})

watch(mealDayRange, (range) => {
  if (range.length <= 1) cb.meals.scheduleMode = 'uniform'
})
</script>

<template>
  <!-- Success overlay -->
  <Transition enter-active-class="transition duration-500" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
    <div v-if="success" class="fixed inset-0 z-50 bg-(--color-background) flex items-center justify-center px-5">
      <div class="text-center max-w-sm">
        <span class="material-symbols-outlined text-6xl text-(--color-primary) mb-6 block" style="font-variation-settings: 'FILL' 1">check_circle</span>
        <h2 class="font-serif text-3xl text-(--color-on-surface) mb-3">Booking Submitted</h2>
        <p class="font-sans text-base text-(--color-on-surface-variant) leading-relaxed">Your corporate booking request has been received and is pending approval. Redirecting to your bookings…</p>
      </div>
    </div>
  </Transition>

  <div class="w-full max-w-[1280px] mx-auto px-5 md:px-16 py-8 pb-24">

    <!-- Back -->
    <button type="button" class="flex items-center gap-1.5 font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) mb-6 transition-colors" @click="goBack">
      <span class="material-symbols-outlined text-base">arrow_back</span>
      {{ step === 2 ? 'Back to Services' : (lodge?.name ?? 'Lodge') }}
    </button>

    <!-- Header -->
    <div class="mb-6">
      <h1 class="font-serif text-3xl font-semibold text-(--color-on-surface)">Corporate Booking</h1>
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
        <div class="flex items-center gap-2" :class="s.active ? 'text-(--color-primary)' : step > i + 1 ? 'text-(--color-primary)' : 'text-(--color-outline)'">
          <span v-if="step > i + 1" class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1">check_circle</span>
          <span v-else class="material-symbols-outlined">{{ s.active ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
          <span class="font-sans text-sm font-semibold">{{ s.label }}</span>
        </div>
        <div v-if="i < stepDefs.length - 1" class="h-px w-10 bg-(--color-outline-variant)"></div>
      </div>
    </nav>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      <!-- ── Main Column ──────────────────────────────────────────────── -->
      <div class="lg:col-span-8 space-y-6">

        <!-- ══════════════════════ STEP 1 ══════════════════════ -->
        <template v-if="step === 1">

          <!-- No-service error banner -->
          <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
            <div v-if="errors.service" class="mb-4 flex items-center gap-2 p-3 rounded-lg bg-(--color-error-container) text-(--color-on-error-container)">
              <span class="material-symbols-outlined text-base shrink-0">error</span>
              <p class="font-sans text-sm">{{ errors.service }}</p>
            </div>
          </Transition>

          <!-- ── Tab bar ──────────────────────────────────────────── -->
          <nav class="grid grid-cols-4 border-b-2 border-(--color-outline-variant) mb-6">
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
              <!-- enabled indicator -->
              <span v-if="tab.key !== 'organisation' && isServiceEnabled(tab.key)"
                class="w-2 h-2 rounded-full bg-(--color-primary) shrink-0"></span>
              <!-- error indicator -->
              <span v-if="tabHasError[tab.key]"
                class="material-symbols-outlined text-xs sm:text-sm text-(--color-error)" style="font-variation-settings: 'FILL' 1">error</span>
            </button>
          </nav>

          <!-- ═══════════════ ORGANISATION TAB ═══════════════ -->
          <template v-if="activeTab === 'organisation'">

          <!-- ── Company Details ─────────────────────────────── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-(--color-primary)">business</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Company Details</h2>
            </div>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Enter the company TPIN to look up an existing company — details will auto-fill. If not found, fill in the details below to register a new one.</p>

            <!-- TPIN lookup -->
            <div class="space-y-4">
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">TPIN <span class="text-(--color-error)">*</span></label>
                <div class="relative">
                  <input v-model="companyQuery" type="text" placeholder="Enter company TPIN to look up…"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 pr-10 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.companyName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'"
                    @input="doTpinLookup" @keydown.escape="companyResults = []" />
                  <button v-if="companyQuery" type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-outline) hover:text-(--color-error)" @click="clearCompany">
                    <span class="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
                <span v-if="errors.companyName" class="font-sans text-xs text-(--color-error)">{{ errors.companyName }}</span>

                <!-- Search results dropdown -->
                <div v-if="companyResults.length" class="border border-(--color-outline-variant) rounded-xl overflow-hidden bg-(--color-surface-container-lowest) shadow-lg mt-1">
                  <button v-for="c in companyResults" :key="c.id" type="button"
                    class="w-full flex items-start gap-3 px-4 py-3 hover:bg-(--color-surface-container-low) text-left transition-colors border-b border-(--color-outline-variant) last:border-0"
                    @click="selectCompany(c)">
                    <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0 mt-0.5">business</span>
                    <div class="min-w-0">
                      <p class="font-sans text-xs font-semibold text-(--color-primary) truncate">{{ c.registrationNo }}</p>
                      <p class="font-sans text-sm font-semibold text-(--color-on-surface) truncate">{{ c.name }}</p>
                      <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ c.industry }}</p>
                    </div>
                  </button>
                </div>

                <!-- Not found banner -->
                <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
                  <div v-if="companySearchState === 'not_found'" class="mt-2 flex items-start justify-between gap-3 p-3 rounded-lg bg-(--color-surface-container-low) border border-(--color-outline-variant)">
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-base text-(--color-on-surface-variant) shrink-0">domain_add</span>
                      <p class="font-sans text-sm text-(--color-on-surface)">TPIN not found. <span class="text-(--color-on-surface-variant)">Fill in the details below to register a new company.</span></p>
                    </div>
                    <button type="button" class="font-sans text-xs font-semibold text-(--color-primary) hover:underline shrink-0" @click="useNewCompany">Enter details</button>
                  </div>
                </Transition>

                <!-- Company found -->
                <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
                  <div v-if="companySearchState === 'found' && cb.selectedCompanyId" class="mt-2 flex items-center justify-between gap-3 p-3 rounded-lg bg-(--color-savannah-mist) border border-(--color-primary)">
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0" style="font-variation-settings: 'FILL' 1">check_circle</span>
                      <p class="font-sans text-sm text-(--color-on-surface)">Company found — details pre-filled. You may edit any field.</p>
                    </div>
                    <button type="button" class="font-sans text-xs font-semibold text-(--color-primary) hover:underline shrink-0" @click="clearCompany">Change</button>
                  </div>
                </Transition>
              </div>

              <!-- Branch selection (shows after company selected) -->
              <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100">
                <div v-if="companyBranches.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Branch / Office</label>
                    <select :value="cb.selectedBranchId" @change="onCompanyBranchChange($event.target.value)"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                      <option value="">— Select branch —</option>
                      <option v-for="b in companyBranches" :key="b.id" :value="b.id">{{ b.name }}{{ b.isPrimary ? ' (Head Office)' : '' }}</option>
                    </select>
                  </div>
                  <!-- Profile selection (shows after branch selected) -->
                  <div v-if="branchProfiles.length" class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Department Profile</label>
                    <select :value="cb.selectedProfileId" @change="onProfileChange($event.target.value)"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                      <option value="">— Select profile —</option>
                      <option v-for="p in branchProfiles" :key="p.id" :value="p.id">{{ p.departmentName }}</option>
                    </select>
                  </div>
                </div>
              </Transition>

              <!-- Editable booking fields -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Company Name <span class="text-(--color-error)">*</span></label>
                  <input v-model="cb.companyName" type="text" placeholder="Acme Corporation Ltd"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.companyName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.companyName" class="font-sans text-xs text-(--color-error)">{{ errors.companyName }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Industry</label>
                  <select v-model="cb.industry"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                    <option value="">Select industry</option>
                    <option v-for="ind in INDUSTRIES" :key="ind" :value="ind">{{ ind }}</option>
                  </select>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Company Email</label>
                  <input v-model="cb.companyEmail" type="email" placeholder="billing@company.com"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Company Phone</label>
                  <input v-model="cb.companyPhone" type="tel" placeholder="+260 211 000 000"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">City</label>
                  <input v-model="cb.city" type="text" placeholder="e.g. Lusaka"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Street Address</label>
                  <input v-model="cb.streetAddress" type="text" placeholder="e.g. 14 Addis Ababa Drive, Rhodespark"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Department</label>
                  <input v-model="cb.departmentName" type="text" placeholder="e.g. Finance, Human Resources"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
              </div>
            </div>
          </section>

          <!-- ── 4. Booked By ────────────────────────────────────── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center gap-2 mb-6">
              <span class="material-symbols-outlined text-(--color-primary)">person</span>
              <div>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Booked By</h2>
                <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Person submitting this booking on behalf of the company</p>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full Name <span class="text-(--color-error)">*</span></label>
                <input v-model="cb.bookedBy.name" type="text" placeholder="Jane Smith"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.bookedByName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.bookedByName" class="font-sans text-xs text-(--color-error)">{{ errors.bookedByName }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email <span class="text-(--color-error)">*</span></label>
                <input v-model="cb.bookedBy.email" type="email" placeholder="j.smith@acme.com"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.bookedByEmail ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.bookedByEmail" class="font-sans text-xs text-(--color-error)">{{ errors.bookedByEmail }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Phone</label>
                <input v-model="cb.bookedBy.phone" type="tel" placeholder="+260 97 000 0000"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Job Title</label>
                <input v-model="cb.bookedBy.jobTitle" type="text" placeholder="e.g. Head of Section"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Employee / Man Number</label>
                <input v-model="cb.bookedBy.manNumber" type="text" placeholder="e.g. EMP-00123"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
            </div>
          </section>

                    <!-- ── 5. Attendants (collapsible) ───────────────────────── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
            <div class="flex items-stretch">
              <button type="button" @click="attendantsExpanded = !attendantsExpanded"
                class="flex items-center gap-2 flex-1 px-6 py-5 text-left hover:bg-(--color-surface-container-low) transition-colors min-w-0">
                <span class="material-symbols-outlined text-(--color-primary) shrink-0">groups</span>
                <div class="min-w-0 flex-1">
                  <h2 class="font-serif text-xl text-(--color-on-surface)">Attendants</h2>
                  <p v-if="!attendantsExpanded" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">
                    {{ cb.participantMode === 'headcount'
                      ? cb.participantCount + ' attendee' + (cb.participantCount !== 1 ? 's' : '') + ' (headcount)'
                      : (cb.attendants.filter(a => a.fullName).length > 0
                          ? cb.attendants.filter(a => a.fullName).length + ' attendant' + (cb.attendants.filter(a => a.fullName).length !== 1 ? 's' : '') + ' registered'
                          : 'No attendants registered yet — expand to add') }}
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0 mr-2">
                  <span v-if="!attendantsExpanded && (cb.participantMode === 'headcount' ? cb.participantCount > 0 : cb.attendants.filter(a => a.fullName).length > 0)"
                    class="px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                    {{ cb.participantMode === 'headcount' ? cb.participantCount : cb.attendants.filter(a => a.fullName).length }}
                  </span>
                  <span v-if="cb.participantMode === 'detailed' && Object.keys(errors).some(k => k.startsWith('att_'))"
                    class="material-symbols-outlined text-sm text-(--color-error)" style="font-variation-settings: 'FILL' 1">error</span>
                  <span class="material-symbols-outlined text-(--color-on-surface-variant) transition-transform duration-200"
                    :style="{ transform: attendantsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }">expand_more</span>
                </div>
              </button>
              <div v-if="attendantsExpanded && cb.participantMode === 'detailed'" class="flex items-center px-4 border-l border-(--color-outline-variant)">
                <button type="button" class="flex items-center gap-1 text-(--color-primary) font-sans text-sm font-semibold hover:underline shrink-0" @click="cb.addAttendant()">
                  <span class="material-symbols-outlined text-base">person_add</span> Add Attendant
                </button>
              </div>
            </div>
            <div v-if="attendantsExpanded" class="px-6 pb-6 border-t border-(--color-outline-variant)">
              <!-- Mode selector cards -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 mb-5">
                <button type="button"
                  @click="cb.participantMode = 'headcount'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="cb.participantMode === 'headcount'
                    ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                    : 'border-(--color-outline-variant) bg-(--color-surface-container-low) hover:border-(--color-primary)'">
                  <span class="material-symbols-outlined text-xl mt-0.5 shrink-0"
                    :class="cb.participantMode === 'headcount' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">groups</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Headcount Only</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Specify the total number of attendees — no individual records required</p>
                  </div>
                </button>
                <button type="button"
                  @click="cb.participantMode = 'detailed'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="cb.participantMode === 'detailed'
                    ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                    : 'border-(--color-outline-variant) bg-(--color-surface-container-low) hover:border-(--color-primary)'">
                  <span class="material-symbols-outlined text-xl mt-0.5 shrink-0"
                    :class="cb.participantMode === 'detailed' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">format_list_bulleted</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Individual Records</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Enter each attendee's name and contact details</p>
                  </div>
                </button>
              </div>

              <!-- Headcount mode -->
              <div v-if="cb.participantMode === 'headcount'">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Total Attendees</label>
                <div class="flex items-center gap-3 mt-2">
                  <input type="number" min="1" v-model.number="cb.participantCount"
                    class="w-28 bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors text-center" />
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">Number of people expected to attend</p>
                </div>
              </div>

              <!-- Detailed mode -->
              <div v-else>
                <p class="font-sans text-sm text-(--color-on-surface-variant) mb-5">Register everyone attending under this booking. This list is shared across all included services.</p>
                <div class="space-y-3">
                  <div v-for="(att, i) in cb.attendants" :key="i" class="p-4 bg-(--color-surface-container-low) rounded-xl">
                    <!-- Header row -->
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2">
                        <span class="inline-flex items-center justify-center w-7 h-7 rounded-full font-sans text-xs font-bold shrink-0"
                          :class="att.isLead ? 'bg-(--color-primary) text-white' : 'bg-(--color-surface-container-high) text-(--color-on-surface-variant)'">
                          {{ i + 1 }}
                        </span>
                        <span v-if="att.isLead" class="font-sans text-xs font-semibold text-(--color-primary)">Lead Contact</span>
                        <span v-else class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ att.fullName || `Attendant ${i + 1}` }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <button v-if="!att.isLead" type="button" class="font-sans text-xs text-(--color-outline) hover:text-(--color-primary) transition-colors" @click="att.isLead = true; cb.attendants.forEach((a, j) => { if (j !== i) a.isLead = false })">
                          Set as lead
                        </button>
                        <button type="button" :disabled="cb.attendants.length === 1"
                          class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                          @click="cb.removeAttendant(i)">
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
                      <div class="flex flex-col gap-1 sm:col-span-2">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Company / Organisation</label>
                        <input v-model="att.company" type="text" placeholder="For mixed-delegation events"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ── 3. Approver & Cost Codes (collapsible) ───────────── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
            <button type="button" @click="approverExpanded = !approverExpanded"
              class="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-(--color-surface-container-low) transition-colors">
              <div class="flex items-center gap-2 min-w-0">
                <span class="material-symbols-outlined text-(--color-primary) shrink-0">approval</span>
                <div class="min-w-0">
                  <h2 class="font-serif text-xl text-(--color-on-surface)">Approver & Cost Codes</h2>
                  <p v-if="!approverExpanded" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5 truncate">
                    {{ cb.approverName ? `${cb.approverName}${cb.approverTitle ? ', ' + cb.approverTitle : ''}${cb.costCenter ? ' · ' + cb.costCenter : ''}` : 'Not yet configured — required fields inside' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span v-if="errors.approverName || errors.approverEmail || errors.costCenter"
                  class="material-symbols-outlined text-sm text-(--color-error)" style="font-variation-settings: 'FILL' 1">error</span>
                <span class="material-symbols-outlined text-(--color-on-surface-variant) transition-transform duration-200"
                  :style="{ transform: approverExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }">expand_more</span>
              </div>
            </button>
            <div v-if="approverExpanded" class="px-6 pb-6 pt-4 border-t border-(--color-outline-variant)">
              <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Auto-filled from the selected department profile. Review and override if needed.</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Approver Name <span class="text-(--color-error)">*</span></label>
                  <input v-model="cb.approverName" type="text" placeholder="John Banda"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.approverName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.approverName" class="font-sans text-xs text-(--color-error)">{{ errors.approverName }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Approver Title</label>
                  <input v-model="cb.approverTitle" type="text" placeholder="e.g. Finance Manager"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Approver Email <span class="text-(--color-error)">*</span></label>
                  <input v-model="cb.approverEmail" type="email" placeholder="j.banda@acme.com"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.approverEmail ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.approverEmail" class="font-sans text-xs text-(--color-error)">{{ errors.approverEmail }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Approver Phone</label>
                  <input v-model="cb.approverPhone" type="tel" placeholder="+260 97 000 0000"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                    {{ cb.costCenterType === 'internal_order' ? 'Internal Order No.' : 'Cost Centre' }}
                    <span class="text-(--color-error)">*</span>
                  </label>
                  <div class="flex w-full bg-(--color-surface-container) rounded-xl p-1 gap-1">
                    <button type="button"
                      @click="cb.costCenterType = 'cost_center'"
                      class="flex-1 py-2 px-3 font-sans text-xs font-semibold rounded-lg transition-all duration-150 text-center"
                      :class="cb.costCenterType === 'cost_center'
                        ? 'bg-(--color-primary) text-white shadow-sm'
                        : 'text-(--color-on-surface-variant) hover:text-(--color-on-surface)'">
                      Cost Centre
                    </button>
                    <button type="button"
                      @click="cb.costCenterType = 'internal_order'"
                      class="flex-1 py-2 px-3 font-sans text-xs font-semibold rounded-lg transition-all duration-150 text-center"
                      :class="cb.costCenterType === 'internal_order'
                        ? 'bg-(--color-primary) text-white shadow-sm'
                        : 'text-(--color-on-surface-variant) hover:text-(--color-on-surface)'">
                      Internal Order No.
                    </button>
                  </div>
                  <input v-model="cb.costCenter" type="text"
                    :placeholder="cb.costCenterType === 'cost_center' ? 'e.g. CC-FIN-001' : 'e.g. IO-5678'"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.costCenter ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.costCenter" class="font-sans text-xs text-(--color-error)">{{ errors.costCenter }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">GL Code</label>
                  <input v-model="cb.glCode" type="text" placeholder="e.g. GL-7700"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
              </div>
            </div>
          </section>

          <!-- ── Supporting Documents (collapsible) ────────────── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
            <button type="button" @click="docsExpanded = !docsExpanded"
              class="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-(--color-surface-container-low) transition-colors">
              <div class="flex items-center gap-2 min-w-0">
                <span class="material-symbols-outlined text-(--color-primary) shrink-0">attach_file</span>
                <div class="min-w-0">
                  <h2 class="font-serif text-xl text-(--color-on-surface)">Supporting Documents</h2>
                  <p v-if="!docsExpanded" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">
                    {{ docFiles.length ? docFiles.length + ' document' + (docFiles.length !== 1 ? 's' : '') + ' attached' : 'Optional — POs, approval letters, contracts' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span v-if="!docsExpanded && docFiles.length"
                  class="px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                  {{ docFiles.length }}
                </span>
                <span class="material-symbols-outlined text-(--color-on-surface-variant) transition-transform duration-200"
                  :style="{ transform: docsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }">expand_more</span>
              </div>
            </button>
            <div v-if="docsExpanded" class="px-6 pb-6 pt-4 border-t border-(--color-outline-variant)">
              <p class="font-sans text-sm text-(--color-on-surface-variant) mb-5">Attach any signed approval letters, purchase orders, or authorisation documents before submitting.</p>
              <label class="block border-2 border-dashed border-(--color-outline-variant) rounded-xl p-8 text-center hover:bg-(--color-surface-container-low) transition-colors cursor-pointer group">
                <input type="file" class="hidden" multiple accept=".pdf,.jpg,.jpeg,.png" @change="pickDocs" />
                <span class="material-symbols-outlined text-4xl text-(--color-outline) mb-2 block group-hover:text-(--color-primary) transition-colors">upload_file</span>
                <p class="font-sans text-sm font-semibold text-(--color-on-surface-variant)">Click to upload or drag &amp; drop</p>
                <p class="font-sans text-xs text-(--color-outline) mt-1 uppercase tracking-widest">PDF, JPG, PNG — max 5 MB each</p>
              </label>
              <div v-if="docFiles.length" class="mt-4 space-y-3">
                <div v-for="(doc, i) in docFiles" :key="i" class="flex items-center gap-3 p-3 bg-(--color-surface-container-low) rounded-lg">
                  <span class="material-symbols-outlined shrink-0"
                    :class="doc.error ? 'text-(--color-error)' : doc.url ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'"
                    :style="doc.url ? 'font-variation-settings: FILL 1' : ''">
                    {{ doc.error ? 'error' : doc.url ? 'check_circle' : 'description' }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="font-sans text-sm text-(--color-on-surface) truncate">{{ doc.name }}</p>
                    <p v-if="doc.error" class="font-sans text-xs text-(--color-error)">{{ doc.error }}</p>
                    <p v-else-if="doc.url" class="font-sans text-xs text-(--color-primary)">Uploaded</p>
                    <div v-else class="mt-1 h-1 bg-(--color-outline-variant) rounded-full overflow-hidden">
                      <div class="h-full bg-(--color-primary) transition-all duration-300 rounded-full" :style="{ width: doc.progress + '%' }"></div>
                    </div>
                  </div>
                  <button type="button" class="text-(--color-outline) hover:text-(--color-error) transition-colors shrink-0" @click="removeDoc(i)">
                    <span class="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- ── General Notes ────────────────────────────── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center gap-2 mb-5">
              <span class="material-symbols-outlined text-(--color-primary)">notes</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">General Notes</h2>
            </div>
            <textarea v-model="cb.notes" rows="3" placeholder="Any other instructions or context for the property team…"
              class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
          </section>

          </template><!-- end Organisation tab -->

          <!-- ═══════════════ ACCOMMODATION TAB ═══════════════ -->
          <template v-else-if="activeTab === 'accommodation'">

            <!-- Service include/exclude toggle -->
            <div class="flex items-center justify-between p-4 rounded-xl border-2 mb-6 transition-all"
                 :class="cb.accommodationEnabled ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) bg-(--color-surface-container-low)'">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-xl" :class="cb.accommodationEnabled ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">bed</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">
                    {{ cb.accommodationEnabled ? 'Accommodation included in this booking' : 'Not currently included' }}
                  </p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">
                    {{ cb.accommodationEnabled ? 'Fill in the room details below.' : 'Include to add room bookings to this request.' }}
                  </p>
                </div>
              </div>
              <button type="button" @click="toggleService('accommodation')"
                class="flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-semibold transition-all shrink-0"
                :class="cb.accommodationEnabled
                  ? 'bg-(--color-error-container) text-(--color-on-error-container) hover:opacity-80'
                  : 'bg-(--color-primary) text-white hover:bg-(--color-clay-earth)'">
                <span class="material-symbols-outlined text-sm">{{ cb.accommodationEnabled ? 'remove_circle' : 'add_circle' }}</span>
                {{ cb.accommodationEnabled ? 'Remove' : 'Include' }}
              </button>
            </div>

            <!-- Accommodation fields -->
            <section v-if="cb.accommodationEnabled" class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-6">
                <span class="material-symbols-outlined text-(--color-primary)">bed</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Accommodation Details</h2>
              </div>
              <div class="space-y-5">
                <div>
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) block mb-1">Reason for Booking</label>
                  <textarea v-model="cb.accommodation.reasonForBooking" rows="2" placeholder="e.g. Annual conference, team training, client visit…"
                    class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Room Type</label>
                    <select v-model="cb.accommodation.roomType"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                      <option value="">Any available</option>
                      <option v-for="type in lodgeRoomTypes" :key="type" :value="type">{{ type.charAt(0).toUpperCase() + type.slice(1) }}</option>
                    </select>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Number of Rooms</label>
                    <input v-model.number="cb.accommodation.roomCount" type="number" min="1"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-in <span class="text-(--color-error)">*</span></label>
                    <input v-model="cb.accommodation.checkIn" type="date"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.accomCheckIn ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors.accomCheckIn" class="font-sans text-xs text-(--color-error)">{{ errors.accomCheckIn }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-out <span class="text-(--color-error)">*</span></label>
                    <input v-model="cb.accommodation.checkOut" type="date" :min="cb.accommodation.checkIn || undefined"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.accomCheckOut ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors.accomCheckOut" class="font-sans text-xs text-(--color-error)">{{ errors.accomCheckOut }}</span>
                  </div>
                </div>
                <div class="flex items-start gap-3 p-4 rounded-xl bg-(--color-surface-container) border border-(--color-outline-variant)">
                  <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0 mt-0.5">info</span>
                  <p class="font-sans text-sm text-(--color-on-surface-variant)">
                    The property team will confirm exact room assignments based on availability prior to your event. Preferences can be noted in Additional Requests below.
                  </p>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Additional Requests</label>
                  <textarea v-model="cb.accommodation.notes" rows="2" placeholder="Accessibility needs, room preferences, special occasions…"
                    class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
                </div>
              </div>
            </section>

            <!-- Disabled placeholder -->
            <div v-else class="flex flex-col items-center justify-center py-16 text-center">
              <span class="material-symbols-outlined text-5xl text-(--color-outline) mb-4 opacity-40">bed</span>
              <p class="font-sans text-sm text-(--color-on-surface-variant)">Accommodation is not included in this booking.</p>
              <p class="font-sans text-xs text-(--color-outline) mt-1">Click "Include" above to add room bookings.</p>
            </div>

          </template><!-- end Accommodation tab -->

          <!-- ═══════════════ EVENTS TAB ═══════════════ -->
          <template v-else-if="activeTab === 'events'">

            <!-- Service include/exclude toggle -->
            <div class="flex items-center justify-between p-4 rounded-xl border-2 mb-6 transition-all"
                 :class="cb.eventsEnabled ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) bg-(--color-surface-container-low)'">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-xl" :class="cb.eventsEnabled ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">event</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">
                    {{ cb.eventsEnabled ? 'Events included in this booking' : 'Not currently included' }}
                  </p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">
                    {{ cb.eventsEnabled ? 'Configure sessions below.' : 'Include to book conference rooms, seminars, or workshops.' }}
                  </p>
                </div>
              </div>
              <button type="button" @click="toggleService('events')"
                class="flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-semibold transition-all shrink-0"
                :class="cb.eventsEnabled
                  ? 'bg-(--color-error-container) text-(--color-on-error-container) hover:opacity-80'
                  : 'bg-(--color-primary) text-white hover:bg-(--color-clay-earth)'">
                <span class="material-symbols-outlined text-sm">{{ cb.eventsEnabled ? 'remove_circle' : 'add_circle' }}</span>
                {{ cb.eventsEnabled ? 'Remove' : 'Include' }}
              </button>
            </div>

            <!-- Events fields -->
            <section v-if="cb.eventsEnabled" class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-(--color-primary)">event</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Event Sessions</h2>
              </div>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Set the event date range to auto-generate a session per day, then customise each session as needed.</p>
              <div class="space-y-5 mb-6">
                <div>
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) block mb-2">Reason for Booking</label>
                  <textarea v-model="cb.events.reasonForBooking" rows="2" placeholder="e.g. Annual strategy conference, product launch, board meeting…"
                    class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
                </div>
                <!-- Event Date Range -->
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
                      <input v-model="cb.events.startDate" type="date"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">End Date</label>
                      <input v-model="cb.events.endDate" type="date" :min="cb.events.startDate || undefined"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                        :class="errors.eventsEndDate ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                      <span v-if="errors.eventsEndDate" class="font-sans text-xs text-(--color-error)">{{ errors.eventsEndDate }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Schedule Mode Selector — only relevant when spanning multiple days -->
              <div v-if="dayRange.length > 1" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <button type="button" @click="cb.events.scheduleMode = 'uniform'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="cb.events.scheduleMode === 'uniform'
                    ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                    : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                  <span class="material-symbols-outlined text-xl mt-0.5"
                    :class="cb.events.scheduleMode === 'uniform' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">calendar_view_week</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Uniform Schedule</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Define one daily schedule — it repeats across all event days automatically</p>
                  </div>
                </button>
                <button type="button" @click="cb.events.scheduleMode = 'per_day'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="cb.events.scheduleMode === 'per_day'
                    ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                    : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                  <span class="material-symbols-outlined text-xl mt-0.5"
                    :class="cb.events.scheduleMode === 'per_day' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">event_note</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Per-Day Schedule</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Start from a default schedule, then override or skip specific days as needed</p>
                  </div>
                </button>
              </div>

              <!-- Master Session Plan — contextual scope panel -->
              <div class="mb-4 p-4 rounded-xl border"
                :class="dayRange.length > 0 ? 'bg-(--color-savannah-mist) border-(--color-primary)' : 'bg-(--color-surface-container) border-(--color-outline-variant)'">
                <div class="flex items-start gap-2">
                  <span class="material-symbols-outlined text-base shrink-0 mt-0.5"
                    :class="dayRange.length > 0 ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">copy_all</span>
                  <div class="flex-1 min-w-0">
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">
                      {{ cb.events.scheduleMode === 'per_day' ? 'Default Daily Schedule' : 'Daily Schedule Template' }}
                    </p>
                    <template v-if="dayRange.length > 0">
                      <p v-if="cb.events.scheduleMode === 'uniform'" class="font-sans text-xs text-(--color-on-surface-variant) mt-1">
                        Applied to all <strong class="text-(--color-on-surface)">{{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }}</strong>
                        · {{ fmt(cb.events.startDate) }}<span v-if="cb.events.endDate && cb.events.endDate !== cb.events.startDate"> – {{ fmt(cb.events.endDate) }}</span>.
                        Changes here affect every event day.
                      </p>
                      <p v-else class="font-sans text-xs text-(--color-on-surface-variant) mt-1">
                        Fallback for days without a custom plan — currently covering
                        <strong class="text-(--color-on-surface)">{{ eventDaySummary.defaultCount }} of {{ eventDaySummary.total }} day{{ eventDaySummary.total !== 1 ? 's' : '' }}</strong>
                        · {{ fmt(cb.events.startDate) }}<span v-if="cb.events.endDate && cb.events.endDate !== cb.events.startDate"> – {{ fmt(cb.events.endDate) }}</span>.
                      </p>
                    </template>
                    <p v-else class="font-sans text-xs text-(--color-on-surface-variant) mt-1">
                      Set a date range above to see how many days this schedule covers.
                    </p>
                  </div>
                </div>
              </div>
              <div class="space-y-4 mb-4">
                <div v-for="(session, i) in cb.events.masterSessions" :key="i" class="border border-(--color-outline-variant) rounded-xl overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-3 bg-(--color-surface-container)">
                    <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ sessionLabel(session, i) }}</span>
                    <div class="flex items-center gap-2">
                      <span v-if="dayRange.length > 0 && cb.events.scheduleMode === 'uniform'"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                        × {{ dayRange.length }} days
                      </span>
                      <span v-else-if="dayRange.length > 0 && cb.events.scheduleMode === 'per_day'"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-surface-container-high) font-sans text-xs font-semibold text-(--color-on-surface-variant)">
                        default
                      </span>
                      <span v-else
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                        Session {{ i + 1 }}
                      </span>
                      <button type="button" :disabled="cb.events.masterSessions.length === 1"
                        class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                        @click="cb.removeMasterSession(i)">
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
                      <!-- Venue picker (master session) -->
                      <div class="flex flex-col gap-1 md:col-span-2">
                        <div class="flex items-center justify-between">
                          <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Venue</label>
                          <button v-if="!venuesLoading" type="button"
                            class="flex items-center gap-1 font-sans text-xs text-(--color-primary) hover:underline"
                            @click="fetchAvailableVenues">
                            <span class="material-symbols-outlined text-sm">refresh</span> Refresh
                          </button>
                        </div>
                        <div class="border rounded-xl overflow-hidden transition-all"
                          :class="expandedVenueKey === `master_${i}` ? 'border-(--color-primary)' : 'border-(--color-outline-variant)'">
                          <div class="flex items-center justify-between gap-3 px-3 py-2.5 bg-(--color-surface-container)">
                            <div v-if="session.venueId" class="flex items-center gap-2 min-w-0">
                              <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0" style="font-variation-settings: 'FILL' 1">check_circle</span>
                              <div class="min-w-0">
                                <p class="font-sans text-sm font-semibold text-(--color-on-surface) truncate">{{ session.venueName }}</p>
                                <p v-if="session.venueCapacity" class="font-sans text-xs text-(--color-on-surface-variant)">Cap. {{ session.venueCapacity }}</p>
                              </div>
                            </div>
                            <p v-else class="font-sans text-sm text-(--color-on-surface-variant)">No preference / TBC</p>
                            <div class="flex items-center gap-2 shrink-0">
                              <button v-if="session.venueId" type="button" @click="clearVenueFromSession(session)"
                                class="h-7 w-7 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors">
                                <span class="material-symbols-outlined text-sm">close</span>
                              </button>
                              <button type="button" @click="toggleVenuePicker(`master_${i}`)"
                                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-xs font-semibold transition-all"
                                :class="expandedVenueKey === `master_${i}`
                                  ? 'bg-(--color-surface-container-high) text-(--color-on-surface)'
                                  : 'bg-(--color-primary) text-white hover:bg-(--color-clay-earth)'">
                                <span class="material-symbols-outlined text-sm">{{ expandedVenueKey === `master_${i}` ? 'expand_less' : 'add' }}</span>
                                {{ expandedVenueKey === `master_${i}` ? 'Close' : (session.venueId ? 'Change' : 'Browse') }}
                              </button>
                            </div>
                          </div>
                          <div v-if="expandedVenueKey === `master_${i}`" class="p-4 bg-(--color-surface-container-low) border-t border-(--color-outline-variant)">
                            <div v-if="venuesLoading" class="flex items-center justify-center py-6 gap-2 text-(--color-on-surface-variant)">
                              <span class="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                              <p class="font-sans text-sm">Loading venues…</p>
                            </div>
                            <div v-else-if="venuesError" class="flex items-start gap-2 p-3 rounded-lg bg-(--color-error-container) text-(--color-on-error-container)">
                              <span class="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
                              <p class="font-sans text-sm">Could not load venues. <button type="button" class="underline" @click="fetchAvailableVenues">Try again</button></p>
                            </div>
                            <div v-else-if="!availableVenues.length" class="flex flex-col items-center py-6 text-center">
                              <span class="material-symbols-outlined text-3xl text-(--color-outline) mb-2 opacity-40">meeting_room</span>
                              <p class="font-sans text-sm text-(--color-on-surface-variant)">No venues found at this property</p>
                            </div>
                            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <button v-for="venue in availableVenues" :key="venue.id"
                                type="button"
                                class="group text-left rounded-xl border-2 transition-all overflow-hidden"
                                :class="session.venueId === venue.id
                                  ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                                  : 'border-(--color-outline-variant) hover:border-(--color-primary) bg-(--color-surface-container-lowest) hover:bg-(--color-savannah-mist)'"
                                @click="selectVenueForSession(session, venue)">
                                <div v-if="venue.images?.[0]" class="w-full h-24 overflow-hidden">
                                  <img :src="venue.images[0]" :alt="venue.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                </div>
                                <div class="p-3">
                                  <div class="flex items-start justify-between gap-2 mb-1">
                                    <p class="font-sans text-sm font-semibold text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors leading-tight">{{ venue.name }}</p>
                                    <span v-if="session.venueId === venue.id"
                                      class="material-symbols-outlined text-base text-(--color-primary) shrink-0" style="font-variation-settings: 'FILL' 1">check_circle</span>
                                  </div>
                                  <div class="flex items-center gap-3 flex-wrap">
                                    <span class="flex items-center gap-1 font-sans text-xs text-(--color-on-surface-variant)">
                                      <span class="material-symbols-outlined text-sm">group</span>Cap. {{ venue.capacity }}
                                    </span>
                                    <span class="px-1.5 py-0.5 rounded-full bg-(--color-surface-container) font-sans text-xs font-semibold text-(--color-on-surface-variant) capitalize">{{ (venue.type ?? '').replace(/_/g, ' ') }}</span>
                                    <span class="px-1.5 py-0.5 rounded-full bg-(--color-surface-container) font-sans text-xs text-(--color-on-surface-variant) capitalize">{{ (venue.location_type ?? 'indoor').replace(/_/g, ' ') }}</span>
                                  </div>
                                </div>
                              </button>
                            </div>
                          </div>
                        </div>
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
              <button type="button" class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline" @click="cb.addMasterSession()">
                <span class="material-symbols-outlined text-base">add</span>
                {{ cb.events.scheduleMode === 'per_day' ? 'Add Session to Default Schedule' : 'Add Session to Template' }}
              </button>

              <!-- Per-Day Overrides (per_day mode only, requires dates) -->
              <div v-if="cb.events.scheduleMode === 'per_day' && dayRange.length > 0" class="mt-8 pt-6 border-t border-(--color-outline-variant)">
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
                  <div v-for="date in dayRange" :key="date" class="border rounded-xl overflow-hidden transition-all"
                    :class="dayStatus(date) === 'skipped' ? 'border-(--color-outline-variant) opacity-60' : 'border-(--color-outline-variant)'">
                    <!-- Day row -->
                    <div class="flex items-center justify-between px-4 py-3 bg-(--color-surface-container)">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="font-sans text-sm font-semibold text-(--color-on-surface) shrink-0">{{ fmtDayLabel(date) }}</span>
                        <span v-if="dayStatus(date) === 'overridden'"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary) shrink-0">
                          {{ cb.events.dayOverrides[date].sessions.length }} override{{ cb.events.dayOverrides[date].sessions.length !== 1 ? 's' : '' }}
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
                          @click="cb.toggleDayExcluded(date)">
                          <span class="material-symbols-outlined text-base">{{ dayStatus(date) === 'skipped' ? 'undo' : 'block' }}</span>
                        </button>
                      </div>
                    </div>
                    <!-- Expanded override editor -->
                    <div v-if="expandedDayOverride === date && dayStatus(date) === 'overridden'" class="p-4 bg-(--color-surface-container-low) space-y-3">
                      <div v-for="(s, si) in cb.events.dayOverrides[date].sessions" :key="si" class="border border-(--color-outline-variant) rounded-xl overflow-hidden">
                        <div class="flex items-center justify-between px-4 py-2.5 bg-(--color-surface-container)">
                          <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ sessionLabel(s, si) }}</span>
                          <button type="button" :disabled="cb.events.dayOverrides[date].sessions.length === 1"
                            class="h-7 w-7 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                            @click="cb.removeOverrideSession(date, si)">
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
                            <!-- Venue picker (override session) -->
                            <div class="flex flex-col gap-1 md:col-span-2">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Venue</label>
                              <div class="border rounded-xl overflow-hidden transition-all"
                                :class="expandedVenueKey === `ov_${date}_${si}` ? 'border-(--color-primary)' : 'border-(--color-outline-variant)'">
                                <div class="flex items-center justify-between gap-3 px-3 py-2.5 bg-(--color-surface-container)">
                                  <div v-if="s.venueId" class="flex items-center gap-2 min-w-0">
                                    <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0" style="font-variation-settings: 'FILL' 1">check_circle</span>
                                    <div class="min-w-0">
                                      <p class="font-sans text-sm font-semibold text-(--color-on-surface) truncate">{{ s.venueName }}</p>
                                      <p v-if="s.venueCapacity" class="font-sans text-xs text-(--color-on-surface-variant)">Cap. {{ s.venueCapacity }}</p>
                                    </div>
                                  </div>
                                  <p v-else class="font-sans text-sm text-(--color-on-surface-variant)">No preference / TBC</p>
                                  <div class="flex items-center gap-2 shrink-0">
                                    <button v-if="s.venueId" type="button" @click="clearVenueFromSession(s)"
                                      class="h-7 w-7 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors">
                                      <span class="material-symbols-outlined text-sm">close</span>
                                    </button>
                                    <button type="button" @click="toggleVenuePicker(`ov_${date}_${si}`)"
                                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-xs font-semibold transition-all"
                                      :class="expandedVenueKey === `ov_${date}_${si}`
                                        ? 'bg-(--color-surface-container-high) text-(--color-on-surface)'
                                        : 'bg-(--color-primary) text-white hover:bg-(--color-clay-earth)'">
                                      <span class="material-symbols-outlined text-sm">{{ expandedVenueKey === `ov_${date}_${si}` ? 'expand_less' : 'add' }}</span>
                                      {{ expandedVenueKey === `ov_${date}_${si}` ? 'Close' : (s.venueId ? 'Change' : 'Browse') }}
                                    </button>
                                  </div>
                                </div>
                                <div v-if="expandedVenueKey === `ov_${date}_${si}`" class="p-4 bg-(--color-surface-container-low) border-t border-(--color-outline-variant)">
                                  <div v-if="venuesLoading" class="flex items-center justify-center py-6 gap-2 text-(--color-on-surface-variant)">
                                    <span class="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                                    <p class="font-sans text-sm">Loading venues…</p>
                                  </div>
                                  <div v-else-if="venuesError" class="flex items-start gap-2 p-3 rounded-lg bg-(--color-error-container) text-(--color-on-error-container)">
                                    <span class="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
                                    <p class="font-sans text-sm">Could not load venues. <button type="button" class="underline" @click="fetchAvailableVenues">Try again</button></p>
                                  </div>
                                  <div v-else-if="!availableVenues.length" class="flex flex-col items-center py-6 text-center">
                                    <span class="material-symbols-outlined text-3xl text-(--color-outline) mb-2 opacity-40">meeting_room</span>
                                    <p class="font-sans text-sm text-(--color-on-surface-variant)">No venues found at this property</p>
                                  </div>
                                  <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button v-for="venue in availableVenues" :key="venue.id"
                                      type="button"
                                      class="group text-left rounded-xl border-2 transition-all overflow-hidden"
                                      :class="s.venueId === venue.id
                                        ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                                        : 'border-(--color-outline-variant) hover:border-(--color-primary) bg-(--color-surface-container-lowest) hover:bg-(--color-savannah-mist)'"
                                      @click="selectVenueForSession(s, venue)">
                                      <div v-if="venue.images?.[0]" class="w-full h-24 overflow-hidden">
                                        <img :src="venue.images[0]" :alt="venue.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                      </div>
                                      <div class="p-3">
                                        <div class="flex items-start justify-between gap-2 mb-1">
                                          <p class="font-sans text-sm font-semibold text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors leading-tight">{{ venue.name }}</p>
                                          <span v-if="s.venueId === venue.id"
                                            class="material-symbols-outlined text-base text-(--color-primary) shrink-0" style="font-variation-settings: 'FILL' 1">check_circle</span>
                                        </div>
                                        <div class="flex items-center gap-3 flex-wrap">
                                          <span class="flex items-center gap-1 font-sans text-xs text-(--color-on-surface-variant)">
                                            <span class="material-symbols-outlined text-sm">group</span>Cap. {{ venue.capacity }}
                                          </span>
                                          <span class="px-1.5 py-0.5 rounded-full bg-(--color-surface-container) font-sans text-xs font-semibold text-(--color-on-surface-variant) capitalize">{{ (venue.type ?? '').replace(/_/g, ' ') }}</span>
                                          <span class="px-1.5 py-0.5 rounded-full bg-(--color-surface-container) font-sans text-xs text-(--color-on-surface-variant) capitalize">{{ (venue.location_type ?? 'indoor').replace(/_/g, ' ') }}</span>
                                        </div>
                                      </div>
                                    </button>
                                  </div>
                                </div>
                              </div>
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
                        @click="cb.addOverrideSession(date)">
                        <span class="material-symbols-outlined text-base">add</span> Add Session for This Day
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Hint when per_day but no dates yet -->
              <div v-else-if="cb.events.scheduleMode === 'per_day' && dayRange.length === 0" class="mt-6 flex items-start gap-2 p-3 bg-(--color-surface-container) rounded-xl">
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

          <!-- ═══════════════ MEALS TAB ═══════════════ -->
          <template v-else-if="activeTab === 'meals'">

            <!-- Service include/exclude toggle -->
            <div class="flex items-center justify-between p-4 rounded-xl border-2 mb-6 transition-all"
                 :class="cb.mealsEnabled ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) bg-(--color-surface-container-low)'">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-xl" :class="cb.mealsEnabled ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">restaurant</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">
                    {{ cb.mealsEnabled ? 'Meals included in this booking' : 'Not currently included' }}
                  </p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">
                    {{ cb.mealsEnabled ? 'Configure the meal plan below.' : 'Include to add catering — buffet, set menu, or individual orders.' }}
                  </p>
                </div>
              </div>
              <button type="button" @click="toggleService('meals')"
                class="flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-semibold transition-all shrink-0"
                :class="cb.mealsEnabled
                  ? 'bg-(--color-error-container) text-(--color-on-error-container) hover:opacity-80'
                  : 'bg-(--color-primary) text-white hover:bg-(--color-clay-earth)'">
                <span class="material-symbols-outlined text-sm">{{ cb.mealsEnabled ? 'remove_circle' : 'add_circle' }}</span>
                {{ cb.mealsEnabled ? 'Remove' : 'Include' }}
              </button>
            </div>

            <!-- Meals section -->
            <section v-if="cb.mealsEnabled" class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-(--color-primary)">restaurant</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Meal Plan</h2>
              </div>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Configure your catering requirements. Meals can follow an event schedule or be booked as a standalone service.</p>

              <!-- Reason for booking -->
              <div class="mb-6">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) block mb-2">Reason for Booking</label>
                <textarea v-model="cb.meals.reasonForBooking" rows="2" placeholder="e.g. Team retreat, conference catering, client dinner…"
                  class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
              </div>

              <!-- Meal mode selector -->
              <div class="mb-6">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-3">Booking Type</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" @click="setMealMode('event_linked')"
                    class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                    :class="cb.meals.mealMode === 'event_linked'
                      ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                      : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                    <span class="material-symbols-outlined text-xl mt-0.5"
                      :class="cb.meals.mealMode === 'event_linked' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">link</span>
                    <div>
                      <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Event-Linked</p>
                      <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Meals follow the event schedule and dates</p>
                    </div>
                  </button>
                  <button type="button" @click="setMealMode('standalone')"
                    class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                    :class="cb.meals.mealMode === 'standalone'
                      ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                      : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                    <span class="material-symbols-outlined text-xl mt-0.5"
                      :class="cb.meals.mealMode === 'standalone' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">restaurant</span>
                    <div>
                      <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Standalone</p>
                      <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Independent meal booking with its own dates</p>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Event-linked: dates banner or no-event hint -->
              <template v-if="cb.meals.mealMode === 'event_linked'">
                <div v-if="cb.eventsEnabled && cb.events.startDate" class="flex items-center gap-2 p-3 rounded-xl bg-(--color-savannah-mist) border border-(--color-primary) mb-6">
                  <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0">link</span>
                  <p class="font-sans text-xs text-(--color-on-surface)">
                    Using event dates:
                    <strong>{{ fmt(cb.events.startDate) }}</strong><span v-if="cb.events.endDate && cb.events.endDate !== cb.events.startDate"> – <strong>{{ fmt(cb.events.endDate) }}</strong></span>
                    <span class="text-(--color-on-surface-variant)"> · {{ mealDayRange.length }} day{{ mealDayRange.length !== 1 ? 's' : '' }}</span>
                  </p>
                </div>
                <div v-else class="flex items-start gap-2 p-3 rounded-xl bg-(--color-surface-container) border border-(--color-outline-variant) mb-6">
                  <span class="material-symbols-outlined text-base text-(--color-on-surface-variant) shrink-0 mt-0.5">info</span>
                  <p class="font-sans text-xs text-(--color-on-surface-variant) leading-relaxed">
                    No event dates found.
                    <button type="button" class="text-(--color-primary) font-semibold hover:underline" @click="cb.eventsEnabled = true; activeTab = 'events'">Go to Events</button>
                    to set a date range, or switch to Standalone above.
                  </p>
                </div>
              </template>

              <!-- Standalone: own date range inputs -->
              <div v-else class="mb-6">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-3">Meal Date Range</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold text-(--color-on-surface-variant)">Start Date</label>
                    <input v-model="cb.meals.startDate" type="date"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold text-(--color-on-surface-variant)">End Date</label>
                    <input v-model="cb.meals.endDate" type="date" :min="cb.meals.startDate || undefined"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Leave same as start date for a single-day booking.</p>
                  </div>
                </div>
              </div>

              <!-- Schedule mode selector — only relevant when spanning multiple days -->
              <div v-if="mealDayRange.length > 1" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <button type="button" @click="cb.meals.scheduleMode = 'uniform'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="cb.meals.scheduleMode === 'uniform'
                    ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                    : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                  <span class="material-symbols-outlined text-xl mt-0.5"
                    :class="cb.meals.scheduleMode === 'uniform' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">calendar_view_week</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Uniform Plan</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Same meals apply to every day</p>
                  </div>
                </button>
                <button type="button" @click="cb.meals.scheduleMode = 'per_day'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="cb.meals.scheduleMode === 'per_day'
                    ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                    : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                  <span class="material-symbols-outlined text-xl mt-0.5"
                    :class="cb.meals.scheduleMode === 'per_day' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">event_note</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Per-Day Plan</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Customise or skip meals for individual days</p>
                  </div>
                </button>
              </div>

              <!-- Master Meal Plan label -->
              <div class="mb-3">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                  {{ cb.meals.scheduleMode === 'per_day' && mealDayRange.length ? 'Default Meal Plan' : 'Meal Plan' }}
                </p>
                <p v-if="cb.meals.scheduleMode === 'per_day' && mealDayRange.length" class="font-sans text-xs text-(--color-on-surface-variant) mt-1">Applied to all days unless you override a specific day below.</p>
              </div>

              <!-- Master Meal items -->
              <div class="space-y-4 mb-4">
                <div v-for="(meal, i) in cb.meals.masterMeals" :key="i" class="border border-(--color-outline-variant) rounded-xl overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-3 bg-(--color-surface-container)">
                    <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ masterMealLabel(meal, i) }}</span>
                    <div class="flex items-center gap-2">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                        {{ MEAL_PERIODS.find(p => p.value === meal.mealPeriod)?.label ?? meal.mealPeriod }}
                      </span>
                      <button type="button" :disabled="cb.meals.masterMeals.length === 1"
                        class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                        @click="cb.removeMasterMeal(i)">
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
                      <div v-if="cb.meals.mealMode === 'event_linked' && cb.eventsEnabled && cb.events.masterSessions.length" class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Paired with Event Session</label>
                        <select v-model="meal.linkedMasterSessionIndex"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                          <option :value="null">Any / All sessions</option>
                          <option v-for="(s, si) in cb.events.masterSessions" :key="si" :value="si">{{ sessionLabel(s, si) }}</option>
                        </select>
                      </div>
                      <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Dietary & Arrangement Notes</label>
                        <textarea v-model="meal.dietaryNotes" rows="2" placeholder="Halal options, allergen-free stations, replenish schedule, table layout…"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors resize-none"></textarea>
                      </div>
                    </div>

                    <!-- Individual orders on master meal (individual_order or mixed, detailed mode only) -->
                    <div v-if="cb.participantMode === 'detailed' && (meal.serviceType === 'individual_order' || meal.serviceType === 'mixed')" class="pt-3 border-t border-(--color-outline-variant)">
                      <div class="flex items-center gap-2 mb-2">
                        <span class="material-symbols-outlined text-sm text-(--color-primary)">person_pin</span>
                        <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant)">
                          {{ meal.serviceType === 'mixed' ? 'Buffet Exceptions / Individual Orders' : 'Individual Meal Assignments' }}
                        </p>
                      </div>
                      <p class="font-sans text-xs text-(--color-on-surface-variant) mb-3">
                        {{ meal.serviceType === 'mixed'
                          ? 'Assign specific menu items to attendees who require something different from the buffet.'
                          : 'Assign menu items directly to each attendee.' }}
                      </p>
                      <div v-if="!cb.attendants.length || (cb.attendants.length === 1 && !cb.attendants[0].fullName)"
                        class="flex items-start gap-2 p-3 bg-(--color-surface-container) rounded-lg">
                        <span class="material-symbols-outlined text-base text-(--color-outline) shrink-0 mt-0.5">info</span>
                        <p class="font-sans text-xs text-(--color-on-surface-variant)">
                          Register attendees in the <button type="button" class="text-(--color-primary) font-semibold hover:underline" @click="activeTab = 'organisation'">Organisation tab</button> first.
                        </p>
                      </div>
                      <div v-else class="space-y-3">
                        <!-- Bulk quick-fill -->
                        <div class="flex items-center gap-2 p-3 bg-(--color-surface-container) rounded-lg flex-wrap sm:flex-nowrap">
                          <span class="material-symbols-outlined text-base text-(--color-on-surface-variant) shrink-0">flash_on</span>
                          <select v-model="getBulk(`master-${i}`).menuItemId"
                            class="flex-1 min-w-0 bg-(--color-savannah-mist) rounded-lg px-3 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                            <option value="">Quick-fill all attendees…</option>
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
                        <!-- Per-attendant rows -->
                        <div v-for="(att, attIdx) in cb.attendants" :key="attIdx"
                          class="rounded-lg border border-(--color-outline-variant) overflow-hidden">
                          <div class="flex items-center justify-between px-4 py-2.5 bg-(--color-surface-container)">
                            <div class="flex items-center gap-2">
                              <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-bold text-(--color-primary)">{{ attIdx + 1 }}</span>
                              <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ att.fullName || `Attendant ${attIdx + 1}` }}</p>
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
              <button type="button" class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline" @click="cb.addMasterMeal()">
                <span class="material-symbols-outlined text-base">add</span> Add Meal Type
              </button>

              <!-- Per-Day Meal Overrides -->
              <div v-if="cb.meals.scheduleMode === 'per_day' && mealDayRange.length > 0" class="mt-8 pt-6 border-t border-(--color-outline-variant)">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-1">
                  Day-by-Day Meals <span class="text-(--color-outline) font-normal normal-case tracking-normal">({{ mealDayRange.length }} day{{ mealDayRange.length !== 1 ? 's' : '' }})</span>
                </p>
                <p class="font-sans text-xs text-(--color-on-surface-variant) mb-4">Skip days with no meals, or replace the default plan for individual days.</p>
                <div class="space-y-2">
                  <div v-for="date in mealDayRange" :key="date" class="border rounded-xl overflow-hidden transition-all"
                    :class="mealDayStatus(date) === 'skipped' ? 'border-(--color-outline-variant) opacity-60' : 'border-(--color-outline-variant)'">
                    <!-- Day row -->
                    <div class="flex items-center justify-between px-4 py-3 bg-(--color-surface-container)">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="font-sans text-sm font-semibold text-(--color-on-surface) shrink-0">{{ fmtDayLabel(date) }}</span>
                        <span v-if="mealDayStatus(date) === 'overridden'"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary) shrink-0">
                          {{ cb.meals.mealOverrides[date].sessions.length }} override{{ cb.meals.mealOverrides[date].sessions.length !== 1 ? 's' : '' }}
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
                          @click="cb.toggleMealDayExcluded(date)">
                          <span class="material-symbols-outlined text-base">{{ mealDayStatus(date) === 'skipped' ? 'undo' : 'no_meals' }}</span>
                        </button>
                      </div>
                    </div>
                    <!-- Expanded override editor -->
                    <div v-if="expandedMealDayOverride === date && mealDayStatus(date) === 'overridden'" class="p-4 bg-(--color-surface-container-low) space-y-3">
                      <div v-for="(m, mi) in cb.meals.mealOverrides[date].sessions" :key="mi" class="border border-(--color-outline-variant) rounded-xl overflow-hidden">
                        <div class="flex items-center justify-between px-4 py-2.5 bg-(--color-surface-container)">
                          <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ masterMealLabel(m, mi) }}</span>
                          <button type="button" :disabled="cb.meals.mealOverrides[date].sessions.length === 1"
                            class="h-7 w-7 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                            @click="cb.removeOverrideMeal(date, mi)">
                            <span class="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                        <div class="p-4 bg-(--color-savannah-mist) space-y-3">
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div class="flex flex-col gap-1 md:col-span-2">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Session Name</label>
                              <input v-model="m.sessionName" type="text" placeholder="e.g. Gala Dinner, Farewell Lunch, Special Banquet"
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
                          <!-- Individual orders (individual_order or mixed service types, detailed mode only) -->
                          <div v-if="cb.participantMode === 'detailed' && (m.serviceType === 'individual_order' || m.serviceType === 'mixed')">
                            <div class="flex items-center gap-2 mb-3 pt-2 border-t border-(--color-outline-variant)">
                              <span class="material-symbols-outlined text-sm text-(--color-primary)">person_pin</span>
                              <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant)">
                                {{ m.serviceType === 'mixed' ? 'Buffet Exceptions / Individual Orders' : 'Individual Meal Assignments' }}
                              </p>
                            </div>
                            <p class="font-sans text-xs text-(--color-on-surface-variant) mb-3">
                              {{ m.serviceType === 'mixed'
                                ? 'Assign specific menu items to attendees who require something different from the buffet.'
                                : 'Assign menu items directly to each attendee.' }}
                            </p>
                            <div v-if="!cb.attendants.length || (cb.attendants.length === 1 && !cb.attendants[0].fullName)"
                              class="flex items-start gap-2 p-3 bg-(--color-surface-container) rounded-lg">
                              <span class="material-symbols-outlined text-base text-(--color-outline) shrink-0 mt-0.5">info</span>
                              <p class="font-sans text-xs text-(--color-on-surface-variant)">
                                Register attendees in the <button type="button" class="text-(--color-primary) font-semibold hover:underline" @click="activeTab = 'organisation'">Organisation tab</button> first.
                              </p>
                            </div>
                            <div v-else class="space-y-3">
                              <!-- Bulk quick-fill -->
                              <div class="flex items-center gap-2 p-3 bg-(--color-surface-container) rounded-lg flex-wrap sm:flex-nowrap">
                                <span class="material-symbols-outlined text-base text-(--color-on-surface-variant) shrink-0">flash_on</span>
                                <select v-model="getBulk(`${date}-${mi}`).menuItemId"
                                  class="flex-1 min-w-0 bg-white rounded-lg px-3 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                                  <option value="">Quick-fill all attendees…</option>
                                  <option v-for="item in menuItemsForPeriod(m.mealPeriod)" :key="item.id" :value="item.id">{{ item.name }} — K {{ item.price }}</option>
                                </select>
                                <input type="number" min="1" v-model.number="getBulk(`${date}-${mi}`).quantity"
                                  class="w-16 shrink-0 bg-white rounded-lg px-2 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors text-center" />
                                <button type="button" @click="applyBulkToAll(m, `${date}-${mi}`)"
                                  :disabled="!getBulk(`${date}-${mi}`).menuItemId"
                                  class="shrink-0 px-3 py-2 rounded-lg bg-(--color-primary) text-white font-sans text-xs font-semibold hover:bg-(--color-clay-earth) transition-colors disabled:opacity-40">
                                  Apply to All
                                </button>
                              </div>
                              <!-- Per-attendant rows -->
                              <div v-for="(att, attIdx) in cb.attendants" :key="attIdx"
                                class="rounded-lg border border-(--color-outline-variant) overflow-hidden">
                                <div class="flex items-center justify-between px-4 py-2.5 bg-(--color-surface-container)">
                                  <div class="flex items-center gap-2">
                                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-bold text-(--color-primary)">{{ attIdx + 1 }}</span>
                                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ att.fullName || `Attendant ${attIdx + 1}` }}</p>
                                    <span v-if="att.isLead" class="font-sans text-xs text-(--color-primary) opacity-70">· Lead</span>
                                    <span v-if="att.dietaryNotes" class="font-sans text-xs text-(--color-on-surface-variant) opacity-70 truncate max-w-32">· {{ att.dietaryNotes }}</span>
                                  </div>
                                  <button type="button" @click="addOrderItem(m, attIdx)"
                                    class="flex items-center gap-1 text-(--color-primary) font-sans text-xs font-semibold hover:underline shrink-0">
                                    <span class="material-symbols-outlined text-sm">add</span> Add item
                                  </button>
                                </div>
                                <div class="p-3 space-y-2 bg-(--color-surface-container-low)">
                                  <p v-if="!m.individualOrders.some(o => o.attendantIdx === attIdx)"
                                    class="font-sans text-xs text-(--color-outline) text-center py-1">No items assigned yet</p>
                                  <template v-for="(order, orderIdx) in m.individualOrders" :key="orderIdx">
                                    <div v-if="order.attendantIdx === attIdx" class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                      <select v-model="order.menuItemId"
                                        class="flex-1 min-w-0 bg-(--color-savannah-mist) rounded-lg px-3 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                                        <option value="">Select menu item…</option>
                                        <option v-for="item in menuItemsForPeriod(m.mealPeriod)" :key="item.id" :value="item.id">
                                          {{ item.name }} — K {{ item.price }}
                                        </option>
                                      </select>
                                      <input type="number" min="1" v-model.number="order.quantity"
                                        class="w-16 shrink-0 bg-(--color-savannah-mist) rounded-lg px-2 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors text-center" />
                                      <input type="text" placeholder="Notes…" v-model="order.notes"
                                        class="flex-1 min-w-0 sm:w-32 sm:flex-none bg-(--color-savannah-mist) rounded-lg px-2 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                                      <button type="button" @click="removeOrderItem(m, orderIdx)"
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
                      <button type="button" class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline"
                        @click="cb.addOverrideMeal(date)">
                        <span class="material-symbols-outlined text-base">add</span> Add Meal for This Day
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Hint when per_day but no dates yet -->
              <div v-else-if="cb.meals.scheduleMode === 'per_day' && mealDayRange.length === 0" class="mt-6 flex items-start gap-2 p-3 bg-(--color-surface-container) rounded-xl">
                <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0 mt-0.5">info</span>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">
                  {{ cb.meals.mealMode === 'standalone' ? 'Set a start and end date above to unlock per-day scheduling.' : 'Set event dates to unlock per-day scheduling.' }}
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

          <!-- CTA -->
          <div class="flex justify-between items-center pt-4">
            <button type="button" @click="goBack" class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold px-6 py-3 border border-(--color-primary) rounded-lg hover:bg-(--color-surface-container-low) transition-all">
              <span class="material-symbols-outlined text-base">arrow_back</span> Back
            </button>
            <button type="button" @click="goToConfirm" class="px-8 py-3 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-lg hover:bg-(--color-clay-earth) transition-all">
              Review Booking
            </button>
          </div>

        </template>

        <!-- ══════════════════════ STEP 2: CONFIRM ══════════════════════ -->
        <template v-else>

          <!-- Company summary -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center justify-between mb-5">
              <h2 class="font-serif text-xl flex items-center gap-2 text-(--color-on-surface)">
                <span class="material-symbols-outlined text-(--color-primary)">business</span> Company Details
              </h2>
              <button class="font-sans text-sm text-(--color-primary) font-semibold hover:underline" @click="step = 1">Edit</button>
            </div>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
              <div><dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Company</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.companyName || '—' }}</dd></div>
              <div v-if="cb.tpin"><dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">TPIN</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.tpin }}</dd></div>
              <div v-if="cb.companyEmail"><dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Company Email</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.companyEmail }}</dd></div>
              <div v-if="cb.companyPhone"><dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Company Phone</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.companyPhone }}</dd></div>
              <div v-if="cb.city || cb.streetAddress" class="sm:col-span-2">
                <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Address</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ [cb.streetAddress, cb.city].filter(Boolean).join(', ') }}</dd>
              </div>
              <div v-if="cb.branchName"><dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Branch</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.branchName }}</dd></div>
              <div v-if="cb.departmentName"><dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Department</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.departmentName }}</dd></div>
              <div v-if="cb.costCenter"><dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Cost Centre</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.costCenter }}</dd></div>
              <div v-if="cb.glCode"><dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">GL Code</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.glCode }}</dd></div>
              <div v-if="cb.approverName" class="sm:col-span-2 pt-3 border-t border-(--color-outline-variant)">
                <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Approver</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.approverName }}<span v-if="cb.approverTitle" class="text-(--color-on-surface-variant)"> · {{ cb.approverTitle }}</span></dd>
                <p v-if="cb.approverEmail" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">{{ cb.approverEmail }}<span v-if="cb.approverPhone"> · {{ cb.approverPhone }}</span></p>
              </div>
            </dl>
          </section>

          <!-- Booked By summary -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center justify-between mb-5">
              <h2 class="font-serif text-xl flex items-center gap-2 text-(--color-on-surface)">
                <span class="material-symbols-outlined text-(--color-primary)">person</span> Booked By
              </h2>
              <button class="font-sans text-sm text-(--color-primary) font-semibold hover:underline" @click="step = 1">Edit</button>
            </div>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
              <div><dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Name</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.bookedBy.name }}</dd></div>
              <div><dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Email</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.bookedBy.email }}</dd></div>
              <div v-if="cb.bookedBy.phone"><dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Phone</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.bookedBy.phone }}</dd></div>
              <div v-if="cb.bookedBy.jobTitle"><dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Job Title</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.bookedBy.jobTitle }}</dd></div>
            </dl>
          </section>

          <!-- Attendants summary -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center justify-between mb-5">
              <h2 class="font-serif text-xl flex items-center gap-2 text-(--color-on-surface)">
                <span class="material-symbols-outlined text-(--color-primary)">groups</span>
                {{ cb.participantMode === 'headcount' ? 'Attendees' : 'Attendants (' + cb.attendants.length + ')' }}
              </h2>
              <button class="font-sans text-sm text-(--color-primary) font-semibold hover:underline" @click="step = 1">Edit</button>
            </div>
            <template v-if="cb.participantMode === 'headcount'">
              <p class="font-sans text-sm text-(--color-on-surface)">
                <strong>{{ cb.participantCount }}</strong> attendee{{ cb.participantCount !== 1 ? 's' : '' }} expected
              </p>
            </template>
            <div v-else class="space-y-2">
              <div v-for="(att, i) in cb.attendants" :key="i" class="flex items-center justify-between p-3 bg-(--color-surface-container-low) rounded-lg">
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ att.fullName }}</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ att.email || '—' }}<span v-if="att.dietaryNotes"> · {{ att.dietaryNotes }}</span></p>
                </div>
                <span v-if="att.isLead" class="font-sans text-xs font-semibold text-(--color-primary) shrink-0">Lead Contact</span>
              </div>
            </div>
          </section>

          <!-- Services summary -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center justify-between mb-5">
              <h2 class="font-serif text-xl flex items-center gap-2 text-(--color-on-surface)">
                <span class="material-symbols-outlined text-(--color-primary)">checklist</span> Booked Services
              </h2>
              <button class="font-sans text-sm text-(--color-primary) font-semibold hover:underline" @click="step = 1">Edit</button>
            </div>

            <!-- Accommodation -->
            <div v-if="cb.accommodationEnabled" class="mb-6 pb-6 border-b border-(--color-outline-variant)">
              <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) flex items-center gap-1 mb-3">
                <span class="material-symbols-outlined text-sm text-(--color-primary)">bed</span> Accommodation
              </p>
              <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
                <div v-if="cb.accommodation.roomType"><dt class="font-sans text-xs text-(--color-on-surface-variant) mb-0.5">Room Type</dt><dd class="font-sans text-sm text-(--color-on-surface) capitalize">{{ cb.accommodation.roomType }}</dd></div>
                <div><dt class="font-sans text-xs text-(--color-on-surface-variant) mb-0.5">Rooms</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.accommodation.roomCount }}</dd></div>
                <div v-if="cb.accommodation.checkIn"><dt class="font-sans text-xs text-(--color-on-surface-variant) mb-0.5">Check-in</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ fmt(cb.accommodation.checkIn) }}</dd></div>
                <div v-if="cb.accommodation.checkOut"><dt class="font-sans text-xs text-(--color-on-surface-variant) mb-0.5">Check-out</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ fmt(cb.accommodation.checkOut) }}<span v-if="nights(cb.accommodation.checkIn, cb.accommodation.checkOut)" class="text-(--color-on-surface-variant) ml-1">({{ nights(cb.accommodation.checkIn, cb.accommodation.checkOut) }} night{{ nights(cb.accommodation.checkIn, cb.accommodation.checkOut) !== 1 ? 's' : '' }})</span></dd></div>
                <div v-if="cb.accommodation.notes" class="sm:col-span-2"><dt class="font-sans text-xs text-(--color-on-surface-variant) mb-0.5">Notes</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.accommodation.notes }}</dd></div>
              </dl>
            </div>

            <!-- Events -->
            <div v-if="cb.eventsEnabled" class="mb-6 pb-6 border-b border-(--color-outline-variant) last:border-0 last:pb-0 last:mb-0">
              <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) flex items-center gap-1 mb-2">
                <span class="material-symbols-outlined text-sm text-(--color-primary)">event</span>
                Events · {{ cb.events.masterSessions.length }} session{{ cb.events.masterSessions.length !== 1 ? 's' : '' }} per day
                <span v-if="dayRange.length" class="font-normal normal-case tracking-normal">
                  ({{ dayRange.length - Object.values(cb.events.dayOverrides).filter(o => o.excluded).length }} active day{{ (dayRange.length - Object.values(cb.events.dayOverrides).filter(o => o.excluded).length) !== 1 ? 's' : '' }})
                </span>
              </p>
              <p v-if="cb.events.startDate" class="font-sans text-xs text-(--color-on-surface-variant) mb-3">
                {{ fmt(cb.events.startDate) }}<span v-if="cb.events.endDate && cb.events.endDate !== cb.events.startDate"> — {{ fmt(cb.events.endDate) }}</span>
                <span v-if="cb.events.scheduleMode === 'per_day'" class="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">Per-day schedule</span>
              </p>
              <div class="space-y-3 mb-3">
                <div v-for="(s, i) in cb.events.masterSessions" :key="i" class="p-3 bg-(--color-surface-container-low) rounded-lg">
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface) mb-1">{{ sessionLabel(s, i) }}</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">
                    {{ EVENT_TYPES.find(t => t.value === s.eventType)?.label }}
                    <span v-if="s.startTime"> · {{ s.startTime }}–{{ s.endTime }}</span>
                  </p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">
                    {{ s.expectedAttendees }} attendees
                    · {{ SETUP_TYPES.find(t => t.value === s.setupType)?.label }} setup
                    · {{ PRICING_BASIS.find(p => p.value === s.pricingBasis)?.label }}
                  </p>
                  <p v-if="s.venueName" class="font-sans text-xs text-(--color-primary) mt-0.5">{{ s.venueName }}</p>
                </div>
              </div>
              <p v-if="cb.events.scheduleMode === 'per_day' && Object.values(cb.events.dayOverrides).filter(o => !o.excluded).length > 0"
                class="font-sans text-xs text-(--color-on-surface-variant)">
                + {{ Object.values(cb.events.dayOverrides).filter(o => !o.excluded).length }} day{{ Object.values(cb.events.dayOverrides).filter(o => !o.excluded).length !== 1 ? 's' : '' }} with custom sessions
              </p>
            </div>

            <!-- Meals -->
            <div v-if="cb.mealsEnabled" class="last:border-0 last:pb-0 last:mb-0">
              <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) flex items-center gap-1 mb-2">
                <span class="material-symbols-outlined text-sm text-(--color-primary)">restaurant</span>
                Meals · {{ cb.meals.masterMeals.length }} meal type{{ cb.meals.masterMeals.length !== 1 ? 's' : '' }} per day
                <span v-if="mealDayRange.length" class="font-normal normal-case tracking-normal">
                  ({{ mealDayRange.length - Object.values(cb.meals.mealOverrides).filter(o => o.excluded).length }} active day{{ (mealDayRange.length - Object.values(cb.meals.mealOverrides).filter(o => o.excluded).length) !== 1 ? 's' : '' }})
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-sans text-xs font-semibold"
                  :class="cb.meals.mealMode === 'standalone' ? 'bg-(--color-surface-container) text-(--color-on-surface-variant)' : 'bg-(--color-savannah-mist) text-(--color-primary)'">
                  {{ cb.meals.mealMode === 'standalone' ? 'Standalone' : 'Event-linked' }}
                </span>
              </p>
              <p v-if="cb.meals.mealMode === 'standalone' && cb.meals.startDate" class="font-sans text-xs text-(--color-on-surface-variant) mb-3">
                {{ fmt(cb.meals.startDate) }}<span v-if="cb.meals.endDate && cb.meals.endDate !== cb.meals.startDate"> — {{ fmt(cb.meals.endDate) }}</span>
              </p>
              <div class="space-y-3 mb-2">
                <div v-for="(m, i) in cb.meals.masterMeals" :key="i" class="p-3 bg-(--color-surface-container-low) rounded-lg">
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface) mb-1">{{ masterMealLabel(m, i) }}</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">
                    {{ SERVICE_TYPES.find(t => t.value === m.serviceType)?.label }}
                    · {{ m.paxCount }} covers
                    <span v-if="cb.meals.mealMode === 'event_linked' && m.linkedMasterSessionIndex !== null && cb.events.masterSessions[m.linkedMasterSessionIndex]">
                      · paired with {{ sessionLabel(cb.events.masterSessions[m.linkedMasterSessionIndex], m.linkedMasterSessionIndex) }}
                    </span>
                    <span v-if="(m.serviceType === 'individual_order' || m.serviceType === 'mixed') && m.individualOrders?.filter(o => o.menuItemId).length">
                      · {{ m.individualOrders.filter(o => o.menuItemId).length }} individual order{{ m.individualOrders.filter(o => o.menuItemId).length !== 1 ? 's' : '' }}
                    </span>
                  </p>
                  <p v-if="m.dietaryNotes" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">{{ m.dietaryNotes }}</p>
                </div>
              </div>
              <p v-if="cb.meals.scheduleMode === 'per_day' && Object.values(cb.meals.mealOverrides).filter(o => !o.excluded).length > 0"
                class="font-sans text-xs text-(--color-on-surface-variant)">
                + {{ Object.values(cb.meals.mealOverrides).filter(o => !o.excluded).length }} day{{ Object.values(cb.meals.mealOverrides).filter(o => !o.excluded).length !== 1 ? 's' : '' }} with custom meals
              </p>
            </div>
          </section>

          <!-- Documents summary -->
          <div v-if="docFiles.filter(d => d.url).length" class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-3">Supporting Documents ({{ docFiles.filter(d => d.url).length }})</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <a v-for="doc in docFiles.filter(d => d.url)" :key="doc.url" :href="doc.url" target="_blank" rel="noopener"
                class="group flex flex-col items-center gap-2 p-3 rounded-lg border border-(--color-outline-variant) hover:border-(--color-primary) bg-(--color-surface-container-low) transition-colors overflow-hidden">
                <img v-if="/\.(jpe?g|png)$/i.test(doc.name)" :src="doc.url" :alt="doc.name" class="w-full h-24 object-cover rounded-md" />
                <span v-else class="material-symbols-outlined text-4xl text-(--color-outline) group-hover:text-(--color-primary) transition-colors">picture_as_pdf</span>
                <p class="font-sans text-xs text-(--color-on-surface-variant) group-hover:text-(--color-primary) text-center truncate w-full transition-colors">{{ doc.name }}</p>
              </a>
            </div>
          </div>

          <!-- Approval note -->
          <div class="flex items-start gap-3 p-4 bg-(--color-surface-container) rounded-xl">
            <span class="material-symbols-outlined text-base text-(--color-primary) mt-0.5 shrink-0">schedule</span>
            <div>
              <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Pending Approval Workflow</p>
              <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5 leading-relaxed">This booking will be sent to <strong>{{ cb.approverName || 'your approver' }}</strong> for authorisation. The booking is confirmed only once approval is granted. Your approver will receive an email at <strong>{{ cb.approverEmail || '—' }}</strong>.</p>
            </div>
          </div>

          <!-- Submit error -->
          <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
            <div v-if="submitError" class="flex items-start gap-2 p-4 rounded-lg bg-(--color-error-container) text-(--color-on-error-container)">
              <span class="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
              <p class="font-sans text-sm">{{ submitError }}</p>
            </div>
          </Transition>

          <!-- CTAs -->
          <div class="flex justify-between items-center pt-2">
            <button type="button" @click="goBack" class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold px-6 py-3 border border-(--color-primary) rounded-lg hover:bg-(--color-surface-container-low) transition-all">
              <span class="material-symbols-outlined text-base">arrow_back</span> Back to Services
            </button>
            <button type="button" :disabled="loading" @click="submit"
              class="px-8 py-3 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-lg hover:bg-(--color-clay-earth) transition-all disabled:opacity-60 flex items-center gap-2">
              <span v-if="loading" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
              {{ loading ? 'Submitting…' : 'Submit Corporate Booking' }}
            </button>
          </div>

          <p class="font-sans text-xs text-(--color-on-surface-variant)">
            By confirming you agree to our
            <a href="#" class="text-(--color-primary) hover:underline">cancellation policy</a>
            and <a href="#" class="text-(--color-primary) hover:underline">terms of service</a>.
          </p>

        </template>
      </div>

      <!-- ── Sidebar ──────────────────────────────────────────────── -->
      <aside class="lg:col-span-4 lg:sticky lg:top-8 space-y-4">
        <div class="bg-(--color-surface-container-lowest) rounded-xl p-5 border border-(--color-outline-variant)">
          <h3 class="font-serif text-lg text-(--color-on-surface) mb-4">Booking Summary</h3>
          <div class="space-y-4">
            <!-- Property -->
            <div class="flex items-start gap-3 pb-4 border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-(--color-primary) text-base mt-0.5">home_work</span>
              <div>
                <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">Property</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ lodge?.name ?? '—' }}</p>
                <p v-if="selectedBranch" class="font-sans text-xs text-(--color-primary) font-semibold mt-0.5 flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">location_on</span>{{ selectedBranch.name }}
                </p>
              </div>
            </div>

            <!-- Company -->
            <div v-if="cb.companyName" class="flex items-start gap-3 pb-4 border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-(--color-primary) text-base mt-0.5">business</span>
              <div class="min-w-0">
                <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">Company</p>
                <p class="font-sans text-sm text-(--color-on-surface) truncate">{{ cb.companyName }}</p>
                <p v-if="cb.tpin" class="font-sans text-xs text-(--color-primary) font-semibold mt-0.5">{{ cb.tpin }}</p>
                <p v-if="cb.departmentName" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">{{ cb.departmentName }}</p>
              </div>
            </div>

            <!-- Services enabled -->
            <div v-if="cb.hasAnyService">
              <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-3">Services</p>
              <div class="space-y-3">
                <div v-if="cb.accommodationEnabled" class="flex items-start gap-3">
                  <span class="material-symbols-outlined text-(--color-primary) text-base mt-0.5">bed</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Accommodation</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ cb.accommodation.roomCount }} room{{ cb.accommodation.roomCount !== 1 ? 's' : '' }}<span v-if="cb.accommodation.checkIn"> · {{ fmt(cb.accommodation.checkIn) }}</span><span v-if="cb.accommodation.checkOut"> – {{ fmt(cb.accommodation.checkOut) }}</span></p>
                  </div>
                </div>
                <div v-if="cb.eventsEnabled" class="flex items-start gap-3">
                  <span class="material-symbols-outlined text-(--color-primary) text-base mt-0.5">event</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Events</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">
                      {{ cb.events.masterSessions.length }} session{{ cb.events.masterSessions.length !== 1 ? 's' : '' }} per day
                      <span v-if="dayRange.length"> · {{ dayRange.length - Object.values(cb.events.dayOverrides).filter(o => o.excluded).length }} day{{ (dayRange.length - Object.values(cb.events.dayOverrides).filter(o => o.excluded).length) !== 1 ? 's' : '' }}</span>
                    </p>
                  </div>
                </div>
                <div v-if="cb.mealsEnabled" class="flex items-start gap-3">
                  <span class="material-symbols-outlined text-(--color-primary) text-base mt-0.5">restaurant</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Meals</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">
                      {{ cb.meals.masterMeals.length }} meal type{{ cb.meals.masterMeals.length !== 1 ? 's' : '' }}
                      <span v-if="mealDayRange.length"> · {{ mealDayRange.length - Object.values(cb.meals.mealOverrides).filter(o => o.excluded).length }} day{{ (mealDayRange.length - Object.values(cb.meals.mealOverrides).filter(o => o.excluded).length) !== 1 ? 's' : '' }}</span>
                      <span v-if="cb.meals.mealMode === 'standalone' && cb.meals.startDate"> · {{ fmt(cb.meals.startDate) }}<span v-if="cb.meals.endDate && cb.meals.endDate !== cb.meals.startDate"> – {{ fmt(cb.meals.endDate) }}</span></span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="py-4 text-center">
              <span class="material-symbols-outlined text-2xl text-(--color-outline) block mb-1">tab</span>
              <p class="font-sans text-xs text-(--color-on-surface-variant)">Use the Accommodation, Events, or Meals tabs to include services</p>
            </div>

            <!-- Attendants count -->
            <div v-if="cb.hasAnyService && cb.attendants.length" class="flex items-center gap-2 pt-3 border-t border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-(--color-primary) text-base">groups</span>
              <p class="font-sans text-sm text-(--color-on-surface)">{{ cb.attendants.length }} attendant{{ cb.attendants.length !== 1 ? 's' : '' }}</p>
            </div>
          </div>
        </div>

        <div class="flex items-start gap-2 p-4 bg-(--color-surface-container) rounded-xl">
          <span class="material-symbols-outlined text-base text-(--color-primary) mt-0.5 shrink-0">info</span>
          <p class="font-sans text-xs text-(--color-on-surface-variant) leading-relaxed">Pricing is confirmed by the property team. A proforma invoice is issued once your approver authorises the booking.</p>
        </div>
      </aside>

    </div>
  </div>
</template>

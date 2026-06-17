<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLodgesStore } from '@/stores/lodges'
import { useAuthStore } from '@/stores/auth'
import { useCorporateBookingStore, flattenSessions } from '@/stores/corporateBooking'
import { uploadBookingDocument } from '@/services/storage'
import api from '@/lib/api'
import {
  searchCompanies,
  getBranchesForCompany,
  getProfilesForBranch,
  DUMMY_CONFERENCE_ROOMS,
  DUMMY_MENU_ITEMS,
} from '@/data/dummyCorporateData'

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
    .some(k => errors.value[k]) || Object.keys(errors.value).some(k => k.startsWith('att_')),
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

function doCompanySearch() {
  const q = companyQuery.value.trim()
  if (q.length < 2) { companyResults.value = []; return }
  companySearchState.value = 'searching'
  setTimeout(() => {
    const results = searchCompanies(q)
    companyResults.value    = results
    companySearchState.value = results.length ? 'found' : 'not_found'
  }, 300)
}

function selectCompany(company) {
  cb.fillFromProfile(company, null, null)
  companyQuery.value       = company.name
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

const EVENT_TYPES = [
  { value: 'conference',  label: 'Conference' },
  { value: 'seminar',     label: 'Seminar' },
  { value: 'workshop',    label: 'Workshop' },
  { value: 'gala',        label: 'Gala / Dinner' },
  { value: 'wedding',     label: 'Wedding' },
  { value: 'training',    label: 'Training' },
]

const SETUP_TYPES = [
  { value: 'boardroom',  label: 'Boardroom' },
  { value: 'theatre',    label: 'Theatre' },
  { value: 'classroom',  label: 'Classroom' },
  { value: 'u_shape',    label: 'U-Shape' },
  { value: 'banquet',    label: 'Banquet' },
  { value: 'cocktail',   label: 'Cocktail' },
]

const PRICING_BASIS = [
  { value: 'half_day',  label: 'Half Day' },
  { value: 'full_day',  label: 'Full Day' },
  { value: 'hourly',    label: 'Hourly' },
  { value: 'flat_rate', label: 'Flat Rate' },
]

const MEAL_PERIODS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch',     label: 'Lunch' },
  { value: 'dinner',    label: 'Dinner' },
  { value: 'tea_break', label: 'Tea Break' },
  { value: 'cocktail',  label: 'Cocktail' },
]

const SERVICE_TYPES = [
  { value: 'buffet',           label: 'Buffet' },
  { value: 'set_menu',         label: 'Set Menu' },
  { value: 'individual_order', label: 'À la Carte (Individual Orders)' },
  { value: 'mixed',            label: 'Mixed (Set Menu + Exceptions)' },
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

  cb.attendants.forEach((a, i) => {
    if (!a.fullName) e[`att_${i}_name`] = 'Required'
  })

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
function menuItemsForPeriod(mealPeriod) {
  const catMap = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', tea_break: 'tea_break', cocktail: 'beverage' }
  const cat = catMap[mealPeriod]
  return cat ? DUMMY_MENU_ITEMS.filter(m => m.category === cat || m.category === 'beverage') : DUMMY_MENU_ITEMS
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

function mealSessionLabel(s, i) {
  if (s.sessionName) return s.sessionName
  const period = MEAL_PERIODS.find(p => p.value === s.mealPeriod)?.label ?? ''
  if (s.mealDate) return `${period} — ${fmt(s.mealDate)}`
  return `${period || 'Meal Session'} ${i + 1}`
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
  if (lodge.value) cb.setLodge(lodgeId, lodge.value.name)
  if (route.query.branchId && !cb.branchId) cb.branchId = route.query.branchId
  fetchRoomTypes()
  if (auth.user) {
    if (!cb.bookedBy.name && auth.user.firstName)
      cb.bookedBy.name = `${auth.user.firstName} ${auth.user.lastName ?? ''}`.trim()
    if (!cb.bookedBy.email && auth.user.email)
      cb.bookedBy.email = auth.user.email
  }
})

watch(() => cb.branchId, fetchRoomTypes)
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

          <!-- ── Company Profile ─────────────────────────────── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-(--color-primary)">business</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Company Profile</h2>
            </div>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Search for your company, select a branch and department profile — details will auto-fill and can be overridden.</p>

            <!-- Company search -->
            <div class="space-y-4">
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Search Company <span class="text-(--color-error)">*</span></label>
                <div class="relative">
                  <input v-model="companyQuery" type="text" placeholder="Type company name or registration number…"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 pr-10 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.companyName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'"
                    @input="doCompanySearch" @keydown.escape="companyResults = []" />
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
                      <p class="font-sans text-sm font-semibold text-(--color-on-surface) truncate">{{ c.name }}</p>
                      <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ c.registrationNo }} · {{ c.industry }}</p>
                    </div>
                  </button>
                </div>

                <!-- Not found banner -->
                <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
                  <div v-if="companySearchState === 'not_found'" class="mt-2 flex items-start justify-between gap-3 p-3 rounded-lg bg-(--color-surface-container-low) border border-(--color-outline-variant)">
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-base text-(--color-on-surface-variant) shrink-0">domain_add</span>
                      <p class="font-sans text-sm text-(--color-on-surface)">No company found. <span class="text-(--color-on-surface-variant)">Fill in the details below.</span></p>
                    </div>
                    <button type="button" class="font-sans text-xs font-semibold text-(--color-primary) hover:underline shrink-0" @click="useNewCompany">Enter details</button>
                  </div>
                </Transition>

                <!-- Company found -->
                <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
                  <div v-if="companySearchState === 'found' && cb.selectedCompanyId" class="mt-2 flex items-center justify-between gap-3 p-3 rounded-lg bg-(--color-savannah-mist) border border-(--color-primary)">
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0" style="font-variation-settings: 'FILL' 1">check_circle</span>
                      <p class="font-sans text-sm text-(--color-on-surface)">Company selected — details pre-filled. You may edit any field.</p>
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
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Registration / TPIN</label>
                  <input v-model="cb.registrationNo" type="text" placeholder="e.g. ZRA-001"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Branch / Office</label>
                  <input v-model="cb.branchName" type="text" placeholder="e.g. Lusaka Head Office"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Department</label>
                  <input v-model="cb.departmentName" type="text" placeholder="e.g. Finance, Human Resources"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Industry</label>
                  <select v-model="cb.industry"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                    <option value="">Select industry</option>
                    <option v-for="ind in INDUSTRIES" :key="ind" :value="ind">{{ ind }}</option>
                  </select>
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
                    {{ cb.attendants.filter(a => a.fullName).length > 0
                      ? cb.attendants.filter(a => a.fullName).length + ' attendant' + (cb.attendants.filter(a => a.fullName).length !== 1 ? 's' : '') + ' registered'
                      : 'No attendants registered yet — expand to add' }}
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0 mr-2">
                  <span v-if="!attendantsExpanded && cb.attendants.filter(a => a.fullName).length > 0"
                    class="px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                    {{ cb.attendants.filter(a => a.fullName).length }}
                  </span>
                  <span v-if="Object.keys(errors).some(k => k.startsWith('att_'))"
                    class="material-symbols-outlined text-sm text-(--color-error)" style="font-variation-settings: 'FILL' 1">error</span>
                  <span class="material-symbols-outlined text-(--color-on-surface-variant) transition-transform duration-200"
                    :style="{ transform: attendantsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }">expand_more</span>
                </div>
              </button>
              <div v-if="attendantsExpanded" class="flex items-center px-4 border-l border-(--color-outline-variant)">
                <button type="button" class="flex items-center gap-1 text-(--color-primary) font-sans text-sm font-semibold hover:underline shrink-0" @click="cb.addAttendant()">
                  <span class="material-symbols-outlined text-base">person_add</span> Add Attendant
                </button>
              </div>
            </div>
            <div v-if="attendantsExpanded" class="px-6 pb-6 border-t border-(--color-outline-variant)">
              <p class="font-sans text-sm text-(--color-on-surface-variant) mb-5 pt-4">Register everyone attending under this booking. This list is shared across all included services.</p>
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
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email</label>
                      <input v-model="att.email" type="email"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Phone</label>
                      <input v-model="att.phone" type="tel"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Passport / ID</label>
                      <input v-model="att.idNumber" type="text"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
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
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Cost Centre <span class="text-(--color-error)">*</span></label>
                  <input v-model="cb.costCenter" type="text" placeholder="e.g. CC-FIN-001"
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
              <!-- Schedule Mode Selector -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <button type="button" @click="cb.events.scheduleMode = 'uniform'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="cb.events.scheduleMode === 'uniform'
                    ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                    : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                  <span class="material-symbols-outlined text-xl mt-0.5"
                    :class="cb.events.scheduleMode === 'uniform' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">calendar_view_week</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Uniform Schedule</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">All days follow the same session plan</p>
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
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Customise sessions for individual days</p>
                  </div>
                </button>
              </div>

              <!-- Master Session Plan -->
              <div class="mb-3">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                  {{ cb.events.scheduleMode === 'per_day' ? 'Default Session Plan' : 'Session Plan' }}
                </p>
                <p v-if="cb.events.scheduleMode === 'per_day'" class="font-sans text-xs text-(--color-on-surface-variant) mt-1">Applied to all days unless you override a specific day below.</p>
              </div>
              <div class="space-y-4 mb-4">
                <div v-for="(session, i) in cb.events.masterSessions" :key="i" class="border border-(--color-outline-variant) rounded-xl overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-3 bg-(--color-surface-container)">
                    <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ sessionLabel(session, i) }}</span>
                    <div class="flex items-center gap-2">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">Session {{ i + 1 }}</span>
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
              <button type="button" class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline" @click="cb.addMasterSession()">
                <span class="material-symbols-outlined text-base">add</span> Add Session
              </button>

              <!-- Per-Day Overrides (per_day mode only, requires dates) -->
              <div v-if="cb.events.scheduleMode === 'per_day' && dayRange.length > 0" class="mt-8 pt-6 border-t border-(--color-outline-variant)">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-1">
                  Day-by-Day Schedule <span class="text-(--color-outline) font-normal normal-case tracking-normal">({{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }})</span>
                </p>
                <p class="font-sans text-xs text-(--color-on-surface-variant) mb-4">Skip days your event doesn't run, or customise sessions for individual days.</p>
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
                        <span v-else class="font-sans text-xs text-(--color-on-surface-variant) hidden sm:inline">Using master schedule</span>
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
                    {{ cb.mealsEnabled ? 'Configure meal sessions below.' : 'Include to add catering — buffet, set menu, or individual orders.' }}
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

            <!-- Meals fields -->
            <section v-if="cb.mealsEnabled" class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-(--color-primary)">restaurant</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Meal Sessions</h2>
              </div>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Add a session for each meal service — morning buffet, team lunch, gala dinner, etc.</p>
              <div>
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) block mb-2">Reason for Booking</label>
                <textarea v-model="cb.meals.reasonForBooking" rows="2" placeholder="e.g. Team retreat, client dinner, conference catering…"
                  class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none mb-5"></textarea>
              </div>
              <div class="space-y-4">
                <div v-for="(session, i) in cb.meals.sessions" :key="i" class="border border-(--color-outline-variant) rounded-xl overflow-hidden">
                  <!-- Session header -->
                  <div class="flex items-center justify-between px-4 py-3 bg-(--color-surface-container)">
                    <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ mealSessionLabel(session, i) }}</span>
                    <div class="flex items-center gap-2">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                        {{ SERVICE_TYPES.find(t => t.value === session.serviceType)?.label ?? session.serviceType }}
                      </span>
                      <button type="button" :disabled="cb.meals.sessions.length === 1"
                        class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                        @click="cb.removeMealSession(i)">
                        <span class="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                  <!-- Session fields -->
                  <div class="p-4 bg-(--color-surface-container-low) space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Session Name</label>
                        <input v-model="session.sessionName" type="text" placeholder="e.g. Day 1 Lunch, Welcome Dinner, Morning Tea Break"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Meal Period</label>
                        <select v-model="session.mealPeriod"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                          <option v-for="p in MEAL_PERIODS" :key="p.value" :value="p.value">{{ p.label }}</option>
                        </select>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Date</label>
                        <input v-model="session.mealDate" type="date"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Service Type</label>
                        <select v-model="session.serviceType"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                          <option v-for="t in SERVICE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                        </select>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                          {{ session.serviceType === 'individual_order' ? 'Number of Diners' : 'Cover Count (Pax)' }}
                        </label>
                        <input v-model.number="session.paxCount" type="number" min="1"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                      </div>
                      <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Dietary & Arrangements Notes</label>
                        <textarea v-model="session.dietaryNotes" rows="2" placeholder="Vegetarian/halal options, allergen-free stations, replenish times, table setup…"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors resize-none"></textarea>
                      </div>
                    </div>

                    <!-- ── Individual Meal Assignments ──────────────────── -->
                    <div v-if="session.serviceType === 'individual_order' || session.serviceType === 'mixed'">
                      <div class="flex items-center gap-2 mb-3 pt-2 border-t border-(--color-outline-variant)">
                        <span class="material-symbols-outlined text-sm text-(--color-primary)">person_pin</span>
                        <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant)">
                          {{ session.serviceType === 'mixed' ? 'Exception / Individual Orders' : 'Individual Meal Assignments' }}
                        </p>
                      </div>
                      <p class="font-sans text-xs text-(--color-on-surface-variant) mb-3">
                        {{ session.serviceType === 'mixed'
                          ? 'Assign specific menu items to attendees who require something different from the set menu.'
                          : 'Assign menu items directly to each attendee. Items are sourced from this session\'s meal period.' }}
                      </p>
                      <!-- No attendants registered yet -->
                      <div v-if="!cb.attendants.length || (cb.attendants.length === 1 && !cb.attendants[0].fullName)"
                        class="flex items-start gap-2 p-3 bg-(--color-surface-container) rounded-lg">
                        <span class="material-symbols-outlined text-base text-(--color-outline) shrink-0 mt-0.5">info</span>
                        <p class="font-sans text-xs text-(--color-on-surface-variant)">
                          Register attendees in the <button type="button" class="text-(--color-primary) font-semibold hover:underline" @click="activeTab = 'organisation'">Organisation tab</button> first, then return here to assign their meals.
                        </p>
                      </div>
                      <!-- Per-attendant rows -->
                      <div v-else class="space-y-3">
                        <div v-for="(att, attIdx) in cb.attendants" :key="attIdx"
                          class="rounded-lg border border-(--color-outline-variant) overflow-hidden">
                          <!-- Attendant header -->
                          <div class="flex items-center justify-between px-4 py-2.5 bg-(--color-surface-container)">
                            <div class="flex items-center gap-2">
                              <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-bold text-(--color-primary)">{{ attIdx + 1 }}</span>
                              <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ att.fullName || `Attendant ${attIdx + 1}` }}</p>
                              <span v-if="att.isLead" class="font-sans text-xs text-(--color-primary) opacity-70">· Lead</span>
                              <span v-if="att.dietaryNotes" class="font-sans text-xs text-(--color-on-surface-variant) opacity-70 hidden sm:inline truncate max-w-32">· {{ att.dietaryNotes }}</span>
                            </div>
                            <button type="button" @click="addOrderItem(session, attIdx)"
                              class="flex items-center gap-1 text-(--color-primary) font-sans text-xs font-semibold hover:underline shrink-0">
                              <span class="material-symbols-outlined text-sm">add</span> Add item
                            </button>
                          </div>
                          <!-- Order items for this attendant -->
                          <div class="p-3 space-y-2 bg-(--color-surface-container-low)">
                            <p v-if="!session.individualOrders.some(o => o.attendantIdx === attIdx)"
                              class="font-sans text-xs text-(--color-outline) text-center py-1">No items assigned yet</p>
                            <template v-for="(order, orderIdx) in session.individualOrders" :key="orderIdx">
                              <div v-if="order.attendantIdx === attIdx" class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <select v-model="order.menuItemId"
                                  class="flex-1 min-w-0 bg-(--color-savannah-mist) rounded-lg px-3 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                                  <option value="">Select menu item…</option>
                                  <option v-for="mi in menuItemsForPeriod(session.mealPeriod)" :key="mi.id" :value="mi.id">
                                    {{ mi.name }} — K {{ mi.price }}
                                  </option>
                                </select>
                                <input type="number" min="1" v-model.number="order.quantity"
                                  class="w-16 shrink-0 bg-(--color-savannah-mist) rounded-lg px-2 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors text-center" />
                                <input type="text" placeholder="Notes…" v-model="order.notes"
                                  class="flex-1 min-w-0 sm:w-32 sm:flex-none bg-(--color-savannah-mist) rounded-lg px-2 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                                <button type="button" @click="removeOrderItem(session, orderIdx)"
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
              <button type="button" class="mt-4 flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline" @click="cb.addMealSession()">
                <span class="material-symbols-outlined text-base">add</span> Add Meal Session
              </button>
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
                <span class="material-symbols-outlined text-(--color-primary)">business</span> Company Profile
              </h2>
              <button class="font-sans text-sm text-(--color-primary) font-semibold hover:underline" @click="step = 1">Edit</button>
            </div>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
              <div><dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Company</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.companyName || '—' }}</dd></div>
              <div v-if="cb.registrationNo"><dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Reg. / TPIN</dt><dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.registrationNo }}</dd></div>
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
                <span class="material-symbols-outlined text-(--color-primary)">groups</span> Attendants ({{ cb.attendants.length }})
              </h2>
              <button class="font-sans text-sm text-(--color-primary) font-semibold hover:underline" @click="step = 1">Edit</button>
            </div>
            <div class="space-y-2">
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
                  <p v-if="s.venueId" class="font-sans text-xs text-(--color-primary) mt-0.5">
                    Venue: {{ DUMMY_CONFERENCE_ROOMS.find(r => r.id === s.venueId)?.name }}
                  </p>
                </div>
              </div>
              <p v-if="cb.events.scheduleMode === 'per_day' && Object.values(cb.events.dayOverrides).filter(o => !o.excluded).length > 0"
                class="font-sans text-xs text-(--color-on-surface-variant)">
                + {{ Object.values(cb.events.dayOverrides).filter(o => !o.excluded).length }} day{{ Object.values(cb.events.dayOverrides).filter(o => !o.excluded).length !== 1 ? 's' : '' }} with custom sessions
              </p>
            </div>

            <!-- Meals -->
            <div v-if="cb.mealsEnabled" class="last:border-0 last:pb-0 last:mb-0">
              <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) flex items-center gap-1 mb-3">
                <span class="material-symbols-outlined text-sm text-(--color-primary)">restaurant</span> Meals ({{ cb.meals.sessions.length }} session{{ cb.meals.sessions.length !== 1 ? 's' : '' }})
              </p>
              <div class="space-y-3">
                <div v-for="(s, i) in cb.meals.sessions" :key="i" class="p-3 bg-(--color-surface-container-low) rounded-lg">
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface) mb-1">{{ mealSessionLabel(s, i) }}</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">
                    {{ SERVICE_TYPES.find(t => t.value === s.serviceType)?.label }}
                    · {{ s.paxCount }} covers
                    <span v-if="s.mealDate"> · {{ fmt(s.mealDate) }}</span>
                  </p>
                  <p v-if="s.dietaryNotes" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">{{ s.dietaryNotes }}</p>
                </div>
              </div>
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
                      <span v-if="dayRange.length"> · {{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }}</span>
                    </p>
                  </div>
                </div>
                <div v-if="cb.mealsEnabled" class="flex items-start gap-3">
                  <span class="material-symbols-outlined text-(--color-primary) text-base mt-0.5">restaurant</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Meals</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ cb.meals.sessions.length }} meal session{{ cb.meals.sessions.length !== 1 ? 's' : '' }}</p>
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

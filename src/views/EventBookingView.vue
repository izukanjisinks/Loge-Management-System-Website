<script setup>
import { ref, computed, watch, watchEffect, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLodgesStore } from '@/stores/lodges'
import { useAuthStore } from '@/stores/auth'
import { useEventBookingStore } from '@/stores/eventBooking'
import { flattenSessions } from '@/stores/corporateBooking'
import { useRebookStore } from '@/stores/rebook'
import { uploadBookingDocument } from '@/services/storage'
import { EVENT_TYPES, SETUP_TYPES, PRICING_BASIS } from '@/data/bookingConstants'
import api from '@/lib/api'

const route       = useRoute()
const router      = useRouter()
const lodgesStore = useLodgesStore()
const auth        = useAuthStore()
const eb          = useEventBookingStore()
const rebookStore = useRebookStore()

const lodgeId        = route.params.id
const lodge          = computed(() => lodgesStore.lodges.find(l => String(l.id) === String(lodgeId)))
const branches       = computed(() => lodgesStore.branchesFor(lodgeId))
const selectedBranch = computed(() => branches.value?.find(b => String(b.id) === String(eb.branchId)) ?? null)

// ── Multi-step ─────────────────────────────────────────────────────────────
const step        = ref(1)
const loading     = ref(false)
const today       = new Date().toISOString().slice(0, 10)
const uploading   = ref(false)
const success     = ref(false)
const errors      = ref({})
const submitError = ref('')

// ── UI state ───────────────────────────────────────────────────────────────
const attendantsExpanded = ref(false)
const bookedByEditing    = ref(false)

// ── Approval documents (corporate only) ───────────────────────────────────
const approvalDocs   = ref([])
const docDragOver    = ref(false)
const ACCEPTED_TYPES = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png']
const MAX_FILE_SIZE  = 10 * 1024 * 1024

function addDocFiles(files) {
  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type)) continue
    if (file.size > MAX_FILE_SIZE) continue
    if (approvalDocs.value.some(d => d.file.name === file.name && d.file.size === file.size)) continue
    approvalDocs.value.push({ file, id: `${file.name}-${file.size}-${Date.now()}`, progress: 0 })
  }
}

function onDocInput(e) { addDocFiles(e.target.files); e.target.value = '' }
function onDocDrop(e)  { docDragOver.value = false; addDocFiles(e.dataTransfer.files) }
function removeDoc(id) { approvalDocs.value = approvalDocs.value.filter(d => d.id !== id) }

function docIcon(type) {
  if (type === 'application/pdf') return 'picture_as_pdf'
  if (type.startsWith('image/')) return 'image'
  return 'description'
}
function docSize(bytes) {
  return bytes < 1024 * 1024
    ? (bytes / 1024).toFixed(1) + ' KB'
    : (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

// ── Venue availability ─────────────────────────────────────────────────────
const availableVenues  = ref([])
const venuesLoading    = ref(false)
const venuesError      = ref(false)
const expandedVenueKey = ref(null)
const expandedDayOverride = ref(null)

async function fetchAvailableVenues() {
  if (!lodgeId) return
  venuesLoading.value = true
  venuesError.value   = false
  try {
    // No venue_type filter — any available venue (conference hall, boardroom,
    // outdoor, etc.) can host an event, so show all of the lodge's venues.
    const params = { org_id: lodgeId, page_size: 100 }
    if (eb.branchId)   params.branch_id = eb.branchId
    if (eb.startDate)  params.from      = eb.startDate
    if (eb.endDate)    params.to        = eb.endDate
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
  () => [eb.startDate, eb.endDate],
  () => {
    expandedVenueKey.value  = null
    availableVenues.value   = []
  }
)

// ── Day-range helpers ───────────────────────────────────────────────────────
const dayRange = computed(() => {
  if (!eb.startDate || !eb.endDate || eb.endDate < eb.startDate) return []
  const [sy, sm, sd] = eb.startDate.split('-').map(Number)
  const [ey, em, ed] = eb.endDate.split('-').map(Number)
  const start = new Date(Date.UTC(sy, sm - 1, sd))
  const end   = new Date(Date.UTC(ey, em - 1, ed))
  const dates = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1))
    dates.push(d.toISOString().slice(0, 10))
  return dates
})

watch(dayRange, range => { if (range.length <= 1) eb.scheduleMode = 'uniform' })

const ZAMBIA_SUGAR_TPIN = '1001757365'
const isZS = computed(() => eb.isCorporate && eb.tpin === ZAMBIA_SUGAR_TPIN)
watch(() => eb.tpin, tpin => {
  if (tpin === ZAMBIA_SUGAR_TPIN && !eb.companyName) eb.companyName = 'Zambia Sugar PLC'
})

watchEffect(() => {
  if (eb.participantMode === 'detailed') eb.participantCount = eb.attendants.length
})

watchEffect(() => {
  const count = eb.participantMode === 'detailed' ? eb.attendants.length : (eb.participantCount || 0)
  eb.masterSessions.forEach(s => { s.expectedAttendees = count })
  Object.values(eb.dayOverrides).forEach(ov => {
    ;(ov.sessions ?? []).forEach(s => { s.expectedAttendees = count })
  })
})

const eventDaySummary = computed(() => {
  const total      = dayRange.value.length
  const skipped    = Object.values(eb.dayOverrides).filter(o =>  o.excluded).length
  const customised = Object.values(eb.dayOverrides).filter(o => !o.excluded).length
  return { total, skipped, customised, defaultCount: total - skipped - customised }
})

const confirmedSessions = computed(() => flattenSessions({
  startDate:      eb.startDate,
  endDate:        eb.endDate,
  masterSessions: eb.masterSessions,
  dayOverrides:   eb.dayOverrides,
}))

const sessionsByDay = computed(() => {
  const map = {}
  for (const s of confirmedSessions.value) {
    if (!map[s.eventDate]) map[s.eventDate] = []
    map[s.eventDate].push(s)
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
})

function fmtDayLabel(iso) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function dayStatus(date) {
  const ov = eb.dayOverrides[date]
  if (!ov) return 'default'
  return ov.excluded ? 'skipped' : 'overridden'
}

function startDayOverride(date) {
  eb.setDayOverride(date)
  expandedDayOverride.value = expandedDayOverride.value === date ? null : date
}

function collapseDayOverride(date) {
  eb.clearDayOverride(date)
  if (expandedDayOverride.value === date) expandedDayOverride.value = null
}

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function sessionsOverlap(a, b) {
  if (!a.startTime || !a.endTime || !b.startTime || !b.endTime) return false
  const aStart = timeToMin(a.startTime), aEnd = timeToMin(a.endTime)
  const bStart = timeToMin(b.startTime), bEnd = timeToMin(b.endTime)
  if (aEnd <= aStart || bEnd <= bStart) return false
  return aStart < bEnd && bStart < aEnd
}

function sessionLabel(s, i) {
  return s.sessionName || (s.eventType
    ? (EVENT_TYPES.find(t => t.value === s.eventType)?.label ?? s.eventType)
    : `Session ${i + 1}`)
}

// ── Validation ──────────────────────────────────────────────────────────────
function validate() {
  const e = {}

  if (!eb.bookedBy.name)  e.bookedByName  = 'Required'
  if (!eb.bookedBy.email) e.bookedByEmail = 'Required'
  else if (!/\S+@\S+\.\S+/.test(eb.bookedBy.email)) e.bookedByEmail = 'Enter a valid email'

  if (!eb.startDate)             e.startDate = 'Required'
  else if (eb.startDate < today) e.startDate = 'Date cannot be in the past'

  if (!eb.endDate)                                        e.endDate = 'Required'
  else if (eb.endDate < today)                            e.endDate = 'Date cannot be in the past'
  else if (eb.startDate && eb.endDate < eb.startDate)     e.endDate = 'End date must be after start date'

  if (eb.isCorporate) {
    if (!eb.companyName)  e.companyName  = 'Required'
    if (!eb.tpin)         e.tpin         = 'Required'
    if (!eb.industry)     e.industry     = 'Required'
    if (!eb.companyEmail) e.companyEmail = 'Required'
    else if (!/\S+@\S+\.\S+/.test(eb.companyEmail)) e.companyEmail = 'Enter a valid email'
    if (!eb.companyPhone) e.companyPhone = 'Required'

    if (!eb.approverName)  e.approverName  = 'Required'
    if (!eb.approverTitle) e.approverTitle = 'Required'
    if (!eb.approverEmail) e.approverEmail = 'Required'
    else if (!/\S+@\S+\.\S+/.test(eb.approverEmail)) e.approverEmail = 'Enter a valid email'
    if (!eb.approverPhone) e.approverPhone = 'Required'

    if (isZS.value) {
      if (!eb.branchName)         e.branchName        = 'Required'
      if (!eb.departmentName)     e.departmentName    = 'Required'
      if (!eb.costCenter)         e.costCenter        = 'Required'
      if (!eb.glCode)             e.glCode            = 'Required'
      if (!eb.bookedBy.jobTitle)  e.bookedByJobTitle  = 'Required'
      if (!eb.bookedBy.manNumber) e.bookedByManNumber = 'Required'
    }
  }

  if (eb.participantMode === 'detailed') {
    eb.attendants.forEach((a, i) => {
      if (!a.fullName) e[`att_${i}_name`] = 'Required'
      if (!a.idNumber) e[`att_${i}_id`]   = 'Required'
      if (a.isLead) {
        if (!a.email)    e[`att_${i}_email`]  = 'Required'
        else if (!/\S+@\S+\.\S+/.test(a.email)) e[`att_${i}_email`] = 'Enter a valid email'
        if (!a.phone)    e[`att_${i}_phone`]  = 'Required'
      }
    })
  }

  eb.masterSessions.forEach((s, i) => {
    if (!s.startTime) e[`ms_${i}_start`] = 'Required'
    if (!s.endTime)   e[`ms_${i}_end`]   = 'Required'
  })

  Object.entries(eb.dayOverrides).forEach(([date, ov]) => {
    if (ov.excluded) return
    ov.sessions.forEach((s, si) => {
      if (!s.startTime) e[`ov_${date}_${si}_start`] = 'Required'
      if (!s.endTime)   e[`ov_${date}_${si}_end`]   = 'Required'
    })
  })

  // Overlap detection — master sessions
  if (eb.masterSessions.length > 1) {
    for (let i = 0; i < eb.masterSessions.length; i++) {
      for (let j = i + 1; j < eb.masterSessions.length; j++) {
        if (sessionsOverlap(eb.masterSessions[i], eb.masterSessions[j])) {
          if (!e[`ms_${i}_start`]) e[`ms_${i}_start`] = `Time overlaps with session ${j + 1}`
          if (!e[`ms_${j}_start`]) e[`ms_${j}_start`] = `Time overlaps with session ${i + 1}`
        }
      }
    }
  }

  // Overlap detection — day override sessions
  Object.entries(eb.dayOverrides).forEach(([date, ov]) => {
    if (ov.excluded || ov.sessions.length < 2) return
    for (let si = 0; si < ov.sessions.length; si++) {
      for (let sj = si + 1; sj < ov.sessions.length; sj++) {
        if (sessionsOverlap(ov.sessions[si], ov.sessions[sj])) {
          if (!e[`ov_${date}_${si}_start`]) e[`ov_${date}_${si}_start`] = `Time overlaps with session ${sj + 1}`
          if (!e[`ov_${date}_${sj}_start`]) e[`ov_${date}_${sj}_start`] = `Time overlaps with session ${si + 1}`
        }
      }
    }
  })

  if (eb.participantMode === 'detailed' && eb.attendants.length > 1) {
    const emailsSeen = new Map()
    const phonesSeen = new Map()
    const idsSeen    = new Map()
    eb.attendants.forEach((a, i) => {
      if (a.email && !e[`att_${i}_email`]) {
        const k = a.email.toLowerCase().trim()
        if (emailsSeen.has(k)) {
          const j = emailsSeen.get(k)
          if (!e[`att_${j}_email`]) e[`att_${j}_email`] = `Duplicate — same as attendant ${i + 1}`
          e[`att_${i}_email`] = `Duplicate — same as attendant ${j + 1}`
        } else emailsSeen.set(k, i)
      }
      if (a.phone && !e[`att_${i}_phone`]) {
        const k = a.phone.replace(/\s+/g, '')
        if (phonesSeen.has(k)) {
          const j = phonesSeen.get(k)
          if (!e[`att_${j}_phone`]) e[`att_${j}_phone`] = `Duplicate — same as attendant ${i + 1}`
          e[`att_${i}_phone`] = `Duplicate — same as attendant ${j + 1}`
        } else phonesSeen.set(k, i)
      }
      if (a.idNumber && !e[`att_${i}_id`]) {
        const k = a.idNumber.trim()
        if (idsSeen.has(k)) {
          const j = idsSeen.get(k)
          if (!e[`att_${j}_id`]) e[`att_${j}_id`] = `Duplicate — same as attendant ${i + 1}`
          e[`att_${i}_id`] = `Duplicate — same as attendant ${j + 1}`
        } else idsSeen.set(k, i)
      }
    })
  }

  errors.value = e
  return Object.keys(e).length === 0
}

function goToReview() {
  if (!validate()) {
    if (Object.keys(errors.value).some(k => k.startsWith('att_'))) attendantsExpanded.value = true
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
    // Upload approval documents to Firebase first, then attach their URLs.
    let documentUrls = []
    if (approvalDocs.value.length) {
      uploading.value = true
      try {
        documentUrls = await Promise.all(
          approvalDocs.value.map(d => uploadBookingDocument(d.file, p => { d.progress = p })),
        )
      } catch {
        submitError.value = 'Failed to upload documents. Please try again.'
        return
      } finally {
        uploading.value = false
      }
    }

    await eb.submit(documentUrls)
    success.value = true
    eb.reset()
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

// ── Session panel component (reusable inline) ───────────────────────────────
// (rendered inline via template; no separate component needed at this scale)

// ── Init ────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await lodgesStore.fetchLodges()
  lodgesStore.fetchLodgeDetail(lodgeId)
  eb.setLodge(lodgeId, lodge.value?.name ?? '')

  const q = route.query
  if (q.branchId && !eb.branchId) eb.branchId = q.branchId
  if (q.context === 'corporate')  eb.bookingContext = 'corporate'

  eb.fillFromAuth(auth.user)

  // Prefill from a "Book Again" navigation
  const rd = rebookStore.drain()
  if (rd && rd.bookingType === 'event') {
    if (rd.branchId)       eb.branchId       = rd.branchId
    if (rd.bookingContext) eb.bookingContext  = rd.bookingContext
    if (rd.bookedBy?.name)  eb.bookedBy.name  = rd.bookedBy.name
    if (rd.bookedBy?.email) eb.bookedBy.email = rd.bookedBy.email
    if (rd.bookedBy?.phone) eb.bookedBy.phone = rd.bookedBy.phone
    if (rd.event?.startDate)        eb.startDate        = rd.event.startDate
    if (rd.event?.endDate)          eb.endDate          = rd.event.endDate
    if (rd.event?.reasonForBooking) eb.reasonForBooking = rd.event.reasonForBooking
    if (rd.company) {
      eb.companyName  = rd.company.name  || ''
      eb.tpin         = rd.company.tpin  || ''
      eb.companyEmail = rd.company.email || ''
      eb.companyPhone = rd.company.phone || ''
    }
    if (rd.approver) {
      eb.approverName  = rd.approver.name  || ''
      eb.approverEmail = rd.approver.email || ''
      eb.approverPhone = rd.approver.phone || ''
      eb.approverTitle = rd.approver.title || ''
    }
    if (rd.attendants?.length) {
      eb.attendants = rd.attendants.map((a, i) => ({
        fullName: a.fullName || '', email: a.email || '', phone: a.phone || '',
        idNumber: a.idNumber || '', dietaryNotes: '', company: '', isLead: a.isLead || i === 0,
      }))
    }
    if (rd.event?.sessions?.length) {
      eb.masterSessions = rd.event.sessions.map(s => ({
        venueId: s.venueId || '', venueName: s.venueName || '',
        eventType: s.eventType || '', eventDate: s.eventDate || '',
        startTime: s.startTime || '', endTime: s.endTime || '',
        expectedAttendees: s.expectedAttendees || '', setupType: s.setupType || '',
        specialRequirements: s.specialRequirements || '',
      }))
    }
  }

  // Pre-populate venue and dates from VenueDetailView
  if (q.venueId && eb.masterSessions.length) {
    const s = eb.masterSessions[0]
    if (!s.venueId) {
      s.venueId       = q.venueId
      s.venueName     = q.venueName || ''
      s.venueCapacity = q.venueCapacity ? Number(q.venueCapacity) : null
    }
  }
  if (q.startDate && !eb.startDate) eb.startDate = q.startDate
  if (q.endDate   && !eb.endDate)   eb.endDate   = q.endDate
})
</script>

<template>
  <!-- Success overlay -->
  <Transition enter-active-class="transition duration-500" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
    <div v-if="success" class="fixed inset-0 z-50 bg-(--color-background) flex items-center justify-center px-5">
      <div class="text-center max-w-sm">
        <span class="material-symbols-outlined text-6xl text-(--color-primary) mb-6 block" style="font-variation-settings: 'FILL' 1">check_circle</span>
        <h2 class="font-serif text-3xl text-(--color-on-surface) mb-3">Event Booking Submitted</h2>
        <p class="font-sans text-base text-(--color-on-surface-variant) leading-relaxed">Your event booking request has been received. The property team will confirm your schedule and venue arrangements. Redirecting…</p>
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
        <span class="material-symbols-outlined text-(--color-primary)" style="font-variation-settings: 'FILL' 1">event</span>
        <h1 class="font-serif text-3xl font-semibold text-(--color-on-surface)">Event Booking</h1>
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
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-5">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-3">Booking Type</p>
            <div class="grid grid-cols-2 gap-3">
              <button type="button" @click="eb.bookingContext = 'individual'"
                class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                :class="!eb.isCorporate
                  ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                  : 'border-(--color-outline-variant) hover:border-(--color-primary)'">
                <span class="material-symbols-outlined text-xl mt-0.5 shrink-0"
                  :class="!eb.isCorporate ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">person</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Individual / Guest</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5 leading-snug">Personal event, small group, or private function</p>
                </div>
              </button>
              <button type="button" @click="eb.bookingContext = 'corporate'"
                class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                :class="eb.isCorporate
                  ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                  : 'border-(--color-outline-variant) hover:border-(--color-primary)'">
                <span class="material-symbols-outlined text-xl mt-0.5 shrink-0"
                  :class="eb.isCorporate ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">corporate_fare</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Corporate / Group</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5 leading-snug">Conference, training, board meeting, delegate event</p>
                </div>
              </button>
            </div>
          </section>

          <!-- ─── Corporate: Company ─── -->
          <section v-if="eb.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl overflow-hidden">
            <div class="flex items-center gap-3 px-6 py-5 border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-(--color-primary)">business</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Company Information</h2>
            </div>
            <div class="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1 sm:col-span-2">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Company Name <span class="text-(--color-error)">*</span></label>
                <input v-model="eb.companyName" type="text"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.companyName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.companyName" class="font-sans text-xs text-(--color-error)">{{ errors.companyName }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">TPIN <span class="text-(--color-error)">*</span></label>
                <input v-model="eb.tpin" type="text" placeholder="e.g. 1234567890"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.tpin ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.tpin" class="font-sans text-xs text-(--color-error)">{{ errors.tpin }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Industry <span class="text-(--color-error)">*</span></label>
                <select v-model="eb.industry"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm border-2 focus:outline-none transition-colors appearance-none"
                  :class="errors.industry
                    ? 'border-(--color-error) text-(--color-on-surface)'
                    : 'border-transparent focus:border-(--color-primary) text-(--color-on-surface)'"
                  :style="!eb.industry ? 'color: var(--color-on-surface-variant)' : ''">
                  <option value="" disabled>Select industry…</option>
                  <option value="Agriculture & Agribusiness">Agriculture & Agribusiness</option>
                  <option value="Banking & Finance">Banking & Finance</option>
                  <option value="Construction & Infrastructure">Construction & Infrastructure</option>
                  <option value="Education & Training">Education & Training</option>
                  <option value="Energy & Utilities">Energy & Utilities</option>
                  <option value="Government & Public Sector">Government & Public Sector</option>
                  <option value="Healthcare & Medical">Healthcare & Medical</option>
                  <option value="Hospitality & Tourism">Hospitality & Tourism</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Legal & Professional Services">Legal & Professional Services</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Media & Communications">Media & Communications</option>
                  <option value="Mining & Extractives">Mining & Extractives</option>
                  <option value="NGO & Non-profit">NGO & Non-profit</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Retail & Trade">Retail & Trade</option>
                  <option value="Telecommunications">Telecommunications</option>
                  <option value="Transportation & Logistics">Transportation & Logistics</option>
                  <option value="Other">Other</option>
                </select>
                <span v-if="errors.industry" class="font-sans text-xs text-(--color-error)">{{ errors.industry }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Billing Email <span class="text-(--color-error)">*</span></label>
                <input v-model="eb.companyEmail" type="email" placeholder="e.g. accounts@company.com"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.companyEmail ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.companyEmail" class="font-sans text-xs text-(--color-error)">{{ errors.companyEmail }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Company Phone <span class="text-(--color-error)">*</span></label>
                <input v-model="eb.companyPhone" type="tel" placeholder="e.g. +260 211 000000"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.companyPhone ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.companyPhone" class="font-sans text-xs text-(--color-error)">{{ errors.companyPhone }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Branch <span v-if="isZS" class="text-(--color-error)">*</span></label>
                <input v-model="eb.branchName" type="text"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.branchName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.branchName" class="font-sans text-xs text-(--color-error)">{{ errors.branchName }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Department <span v-if="isZS" class="text-(--color-error)">*</span></label>
                <input v-model="eb.departmentName" type="text"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.departmentName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.departmentName" class="font-sans text-xs text-(--color-error)">{{ errors.departmentName }}</span>
              </div>
              <div class="flex flex-col gap-2">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                  {{ eb.costCenterType === 'internal_order' ? 'Internal Order No.' : 'Cost Centre' }} <span v-if="isZS" class="text-(--color-error)">*</span>
                </label>
                <div class="flex w-full bg-(--color-surface-container) rounded-xl p-1 gap-1">
                  <button type="button"
                    @click="eb.costCenterType = 'cost_center'"
                    class="flex-1 py-2 px-3 font-sans text-xs font-semibold rounded-lg transition-all duration-150 text-center"
                    :class="eb.costCenterType === 'cost_center'
                      ? 'bg-(--color-primary) text-white shadow-sm'
                      : 'text-(--color-on-surface-variant) hover:text-(--color-on-surface)'">
                    Cost Centre
                  </button>
                  <button type="button"
                    @click="eb.costCenterType = 'internal_order'"
                    class="flex-1 py-2 px-3 font-sans text-xs font-semibold rounded-lg transition-all duration-150 text-center"
                    :class="eb.costCenterType === 'internal_order'
                      ? 'bg-(--color-primary) text-white shadow-sm'
                      : 'text-(--color-on-surface-variant) hover:text-(--color-on-surface)'">
                    Internal Order No.
                  </button>
                </div>
                <input v-model="eb.costCenter" type="text"
                  :placeholder="eb.costCenterType === 'cost_center' ? 'e.g. CC-1234' : 'e.g. IO-5678'"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.costCenter ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.costCenter" class="font-sans text-xs text-(--color-error)">{{ errors.costCenter }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">GL Code <span v-if="isZS" class="text-(--color-error)">*</span></label>
                <input v-model="eb.glCode" type="text"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.glCode ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.glCode" class="font-sans text-xs text-(--color-error)">{{ errors.glCode }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Country</label>
                <input v-model="eb.country" type="text" placeholder="e.g. Zambia"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
            </div>
          </section>

                    <!-- ─── Booked By ─── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl overflow-hidden">
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
                <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">
                  {{ eb.isCorporate ? 'Company representative submitting this booking.' : 'Auto-filled from your account — you are the booking contact.' }}
                </p>
              </div>
            </div>

            <!-- Read-only -->
            <div v-if="!bookedByEditing" class="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-(--color-outline-variant) pt-4">
              <div>
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-0.5">Full Name</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ eb.bookedBy.name || '—' }}</p>
                <p v-if="errors.bookedByName" class="font-sans text-xs text-(--color-error) mt-0.5">{{ errors.bookedByName }}</p>
              </div>
              <div>
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-0.5">Email</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ eb.bookedBy.email || '—' }}</p>
                <p v-if="errors.bookedByEmail" class="font-sans text-xs text-(--color-error) mt-0.5">{{ errors.bookedByEmail }}</p>
              </div>
              <div>
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-0.5">Phone</p>
                <p class="font-sans text-sm" :class="eb.bookedBy.phone ? 'text-(--color-on-surface)' : 'text-(--color-outline) italic'">
                  {{ eb.bookedBy.phone || 'Not provided' }}
                </p>
              </div>
              <div v-if="eb.isCorporate">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-0.5">Job Title</p>
                <p class="font-sans text-sm" :class="eb.bookedBy.jobTitle ? 'text-(--color-on-surface)' : 'text-(--color-outline) italic'">
                  {{ eb.bookedBy.jobTitle || 'Not provided' }}
                </p>
              </div>
              <div v-if="eb.isCorporate">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-0.5">Employee / Man No.</p>
                <p class="font-sans text-sm" :class="eb.bookedBy.manNumber ? 'text-(--color-on-surface)' : 'text-(--color-outline) italic'">
                  {{ eb.bookedBy.manNumber || 'Not provided' }}
                </p>
              </div>
            </div>

            <!-- Editable -->
            <div v-else class="px-6 pb-6 border-t border-(--color-outline-variant) pt-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full Name <span class="text-(--color-error)">*</span></label>
                  <input v-model="eb.bookedBy.name" type="text"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.bookedByName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.bookedByName" class="font-sans text-xs text-(--color-error)">{{ errors.bookedByName }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email <span class="text-(--color-error)">*</span></label>
                  <input v-model="eb.bookedBy.email" type="email"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.bookedByEmail ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.bookedByEmail" class="font-sans text-xs text-(--color-error)">{{ errors.bookedByEmail }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Phone</label>
                  <input v-model="eb.bookedBy.phone" type="tel"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div v-if="eb.isCorporate" class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Job Title <span v-if="isZS" class="text-(--color-error)">*</span></label>
                  <input v-model="eb.bookedBy.jobTitle" type="text"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.bookedByJobTitle ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.bookedByJobTitle" class="font-sans text-xs text-(--color-error)">{{ errors.bookedByJobTitle }}</span>
                </div>
                <div v-if="eb.isCorporate" class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Employee / Man Number <span v-if="isZS" class="text-(--color-error)">*</span></label>
                  <input v-model="eb.bookedBy.manNumber" type="text" placeholder="e.g. EMP-00123"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.bookedByManNumber ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.bookedByManNumber" class="font-sans text-xs text-(--color-error)">{{ errors.bookedByManNumber }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- ─── Corporate: Approver ─── -->
          <section v-if="eb.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl overflow-hidden">
            <div class="flex items-center gap-3 px-6 py-5 border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-(--color-primary)">verified_user</span>
              <div>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Approver</h2>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">Person authorising this booking on behalf of the company</p>
              </div>
            </div>
            <div class="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full Name <span class="text-(--color-error)">*</span></label>
                <input v-model="eb.approverName" type="text" placeholder="e.g. John Banda"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.approverName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.approverName" class="font-sans text-xs text-(--color-error)">{{ errors.approverName }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Job Title <span class="text-(--color-error)">*</span></label>
                <input v-model="eb.approverTitle" type="text" placeholder="e.g. Finance Manager"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.approverTitle ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.approverTitle" class="font-sans text-xs text-(--color-error)">{{ errors.approverTitle }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email <span class="text-(--color-error)">*</span></label>
                <input v-model="eb.approverEmail" type="email" placeholder="e.g. approver@company.com"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.approverEmail ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.approverEmail" class="font-sans text-xs text-(--color-error)">{{ errors.approverEmail }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Phone <span class="text-(--color-error)">*</span></label>
                <input v-model="eb.approverPhone" type="tel" placeholder="e.g. +260 97 0000000"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.approverPhone ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.approverPhone" class="font-sans text-xs text-(--color-error)">{{ errors.approverPhone }}</span>
              </div>
            </div>
          </section>



          <!-- ─── Individual: Attendees ─── -->
          <section v-if="!eb.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl overflow-hidden">
            <div class="flex items-stretch">
              <button type="button"
                class="flex items-center gap-2 flex-1 px-6 py-5 text-left hover:bg-(--color-surface-container-low) transition-colors min-w-0"
                @click="attendantsExpanded = !attendantsExpanded">
                <span class="material-symbols-outlined text-(--color-primary) shrink-0">group</span>
                <div class="min-w-0 flex-1">
                  <h2 class="font-serif text-xl text-(--color-on-surface)">Attendees</h2>
                  <p v-if="!attendantsExpanded" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">
                    {{ eb.participantMode === 'headcount'
                      ? 'Party of ' + eb.participantCount
                      : eb.attendants.filter(a => a.fullName).length + ' registered' }}
                  </p>
                </div>
                <span class="material-symbols-outlined text-(--color-on-surface-variant) transition-transform duration-200 shrink-0 mr-2"
                  :style="{ transform: attendantsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }">expand_more</span>
              </button>
            </div>
            <div v-if="attendantsExpanded" class="px-6 pb-6 border-t border-(--color-outline-variant)">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 mb-5">
                <button type="button" @click="eb.participantMode = 'headcount'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="eb.participantMode === 'headcount'
                    ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                    : 'border-(--color-outline-variant) hover:border-(--color-primary)'">
                  <span class="material-symbols-outlined text-xl mt-0.5 shrink-0"
                    :class="eb.participantMode === 'headcount' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">group</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Headcount Only</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Total attendee count — no individual details</p>
                  </div>
                </button>
                <button type="button" @click="eb.participantMode = 'detailed'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="eb.participantMode === 'detailed'
                    ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                    : 'border-(--color-outline-variant) hover:border-(--color-primary)'">
                  <span class="material-symbols-outlined text-xl mt-0.5 shrink-0"
                    :class="eb.participantMode === 'detailed' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">format_list_bulleted</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Individual Records</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Register each attendee with name and contact</p>
                  </div>
                </button>
              </div>
              <div>
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Total Attendees <span v-if="eb.participantMode === 'headcount'" class="text-(--color-error)">*</span></label>
                <div class="flex items-center gap-3 mt-2">
                  <input type="number" min="1" v-model.number="eb.participantCount"
                    :disabled="eb.participantMode === 'detailed'"
                    class="w-28 rounded-lg px-3 py-3 font-sans text-sm border-2 border-transparent text-center transition-colors focus:outline-none"
                    :class="eb.participantMode === 'detailed'
                      ? 'bg-(--color-surface-container) text-(--color-on-surface-variant) opacity-60 cursor-not-allowed'
                      : 'bg-(--color-savannah-mist) text-(--color-on-surface) focus:border-(--color-primary)'" />
                  <p v-if="eb.participantMode === 'detailed'" class="font-sans text-xs text-(--color-on-surface-variant)">Set to number of attendees</p>
                </div>
              </div>
              <div v-if="eb.participantMode === 'detailed'" class="space-y-3">
                <div v-for="(att, i) in eb.attendants" :key="i" class="p-4 bg-(--color-surface-container-low) rounded-xl">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <span class="inline-flex items-center justify-center w-7 h-7 rounded-full font-sans text-xs font-bold shrink-0"
                        :class="att.isLead ? 'bg-(--color-primary) text-white' : 'bg-(--color-surface-container-high) text-(--color-on-surface-variant)'">{{ i + 1 }}</span>
                      <span v-if="att.isLead" class="font-sans text-xs font-semibold text-(--color-primary)">Lead Contact</span>
                      <span v-else class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ att.fullName || `Guest ${i + 1}` }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <button v-if="!att.isLead" type="button"
                        class="h-8 px-2 flex items-center gap-1 rounded-lg font-sans text-xs font-semibold text-(--color-on-surface-variant) hover:text-(--color-primary) hover:bg-(--color-savannah-mist) transition-colors"
                        @click="eb.setLead(i)">
                        <span class="material-symbols-outlined text-base">star</span>
                        Make Lead
                      </button>
                      <button type="button" :disabled="eb.attendants.length === 1"
                        class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                        @click="eb.removeAttendant(i)">
                        <span class="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                        Full Name <span class="text-(--color-error)">*</span>
                      </label>
                      <input v-model="att.fullName" type="text"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                        :class="errors[`att_${i}_name`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                      <span v-if="errors[`att_${i}_name`]" class="font-sans text-xs text-(--color-error)">{{ errors[`att_${i}_name`] }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                        Email <span v-if="att.isLead" class="text-(--color-error)">*</span>
                      </label>
                      <input v-model="att.email" type="email"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                        :class="errors[`att_${i}_email`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                      <span v-if="errors[`att_${i}_email`]" class="font-sans text-xs text-(--color-error)">{{ errors[`att_${i}_email`] }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                        Phone <span v-if="att.isLead" class="text-(--color-error)">*</span>
                      </label>
                      <input v-model="att.phone" type="tel"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                        :class="errors[`att_${i}_phone`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                      <span v-if="errors[`att_${i}_phone`]" class="font-sans text-xs text-(--color-error)">{{ errors[`att_${i}_phone`] }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                        Passport / ID <span class="text-(--color-error)">*</span>
                      </label>
                      <input v-model="att.idNumber" type="text"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                        :class="errors[`att_${i}_id`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                      <span v-if="errors[`att_${i}_id`]" class="font-sans text-xs text-(--color-error)">{{ errors[`att_${i}_id`] }}</span>
                    </div>
                  </div>
                </div>
                <button type="button" @click="eb.addAttendant()"
                  class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline">
                  <span class="material-symbols-outlined text-base">person_add</span> Add Attendee
                </button>
              </div>
            </div>
          </section>

          <!-- ─── Corporate: Delegates ─── -->
          <section v-if="eb.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl overflow-hidden">
            <div class="flex items-stretch">
              <button type="button"
                class="flex items-center gap-2 flex-1 px-6 py-5 text-left hover:bg-(--color-surface-container-low) transition-colors min-w-0"
                @click="attendantsExpanded = !attendantsExpanded">
                <span class="material-symbols-outlined text-(--color-primary) shrink-0">groups</span>
                <div class="min-w-0 flex-1">
                  <h2 class="font-serif text-xl text-(--color-on-surface)">Delegates</h2>
                  <p v-if="!attendantsExpanded" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">
                    {{ eb.participantMode === 'headcount'
                      ? eb.participantCount + ' delegate' + (eb.participantCount !== 1 ? 's' : '') + ' — headcount only'
                      : eb.attendants.filter(a => a.fullName).length + ' delegate' + (eb.attendants.filter(a => a.fullName).length !== 1 ? 's' : '') + ' registered' }}
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0 mr-2">
                  <span v-if="!attendantsExpanded && eb.participantMode === 'headcount'"
                    class="px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                    {{ eb.participantCount }}
                  </span>
                  <span v-else-if="!attendantsExpanded && eb.attendants.filter(a => a.fullName).length > 0"
                    class="px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                    {{ eb.attendants.filter(a => a.fullName).length }}
                  </span>
                  <span class="material-symbols-outlined text-(--color-on-surface-variant) transition-transform duration-200"
                    :style="{ transform: attendantsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }">expand_more</span>
                </div>
              </button>
            </div>

            <div v-if="attendantsExpanded" class="px-6 pb-6 border-t border-(--color-outline-variant)">
              <!-- Mode toggle -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 mb-5">
                <button type="button" @click="eb.participantMode = 'headcount'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="eb.participantMode === 'headcount'
                    ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                    : 'border-(--color-outline-variant) hover:border-(--color-primary)'">
                  <span class="material-symbols-outlined text-xl mt-0.5 shrink-0"
                    :class="eb.participantMode === 'headcount' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">groups</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Headcount Only</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Total delegate count — no individual details needed</p>
                  </div>
                </button>
                <button type="button" @click="eb.participantMode = 'detailed'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="eb.participantMode === 'detailed'
                    ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                    : 'border-(--color-outline-variant) hover:border-(--color-primary)'">
                  <span class="material-symbols-outlined text-xl mt-0.5 shrink-0"
                    :class="eb.participantMode === 'detailed' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">format_list_bulleted</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Individual Records</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Register each delegate with their details</p>
                  </div>
                </button>
              </div>

              <!-- Headcount -->
              <div class="flex items-center gap-4">
                <input type="number" min="1" v-model.number="eb.participantCount"
                  :disabled="eb.participantMode === 'detailed'"
                  class="w-28 rounded-lg px-3 py-3 font-sans text-sm border-2 border-transparent text-center transition-colors focus:outline-none"
                  :class="eb.participantMode === 'detailed'
                    ? 'bg-(--color-surface-container) text-(--color-on-surface-variant) opacity-60 cursor-not-allowed'
                    : 'bg-(--color-savannah-mist) text-(--color-on-surface) focus:border-(--color-primary)'" />
                <p class="font-sans text-sm text-(--color-on-surface-variant)">
                  {{ eb.participantMode === 'detailed' ? 'Set to number of registered delegates' : 'Total delegates attending across all sessions' }}
                </p>
              </div>

              <!-- Detailed -->
              <div v-if="eb.participantMode === 'detailed'" class="space-y-3">
                <p v-if="errors.delegateRecords" class="font-sans text-sm text-(--color-error) font-semibold">{{ errors.delegateRecords }}</p>
                <p class="font-sans text-sm text-(--color-on-surface-variant) mb-4">Register each delegate. The lead contact receives all booking communications.</p>
                <div v-for="(att, i) in eb.attendants" :key="i" class="p-4 bg-(--color-surface-container-low) rounded-xl">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <span class="inline-flex items-center justify-center w-7 h-7 rounded-full font-sans text-xs font-bold shrink-0"
                        :class="att.isLead ? 'bg-(--color-primary) text-white' : 'bg-(--color-surface-container-high) text-(--color-on-surface-variant)'">{{ i + 1 }}</span>
                      <span v-if="att.isLead" class="font-sans text-xs font-semibold text-(--color-primary)">Lead Contact</span>
                      <span v-else class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ att.fullName || `Delegate ${i + 1}` }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <button v-if="!att.isLead" type="button"
                        class="h-8 px-2 flex items-center gap-1 rounded-lg font-sans text-xs font-semibold text-(--color-on-surface-variant) hover:text-(--color-primary) hover:bg-(--color-savannah-mist) transition-colors"
                        @click="eb.setLead(i)">
                        <span class="material-symbols-outlined text-base">star</span>
                        Make Lead
                      </button>
                      <button type="button" :disabled="eb.attendants.length === 1"
                        class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                        @click="eb.removeAttendant(i)">
                        <span class="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                        Full Name <span class="text-(--color-error)">*</span>
                      </label>
                      <input v-model="att.fullName" type="text"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                        :class="errors[`att_${i}_name`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                      <span v-if="errors[`att_${i}_name`]" class="font-sans text-xs text-(--color-error)">{{ errors[`att_${i}_name`] }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                        Email <span v-if="att.isLead" class="text-(--color-error)">*</span>
                      </label>
                      <input v-model="att.email" type="email"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                        :class="errors[`att_${i}_email`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                      <span v-if="errors[`att_${i}_email`]" class="font-sans text-xs text-(--color-error)">{{ errors[`att_${i}_email`] }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                        Phone <span v-if="att.isLead" class="text-(--color-error)">*</span>
                      </label>
                      <input v-model="att.phone" type="tel"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                        :class="errors[`att_${i}_phone`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                      <span v-if="errors[`att_${i}_phone`]" class="font-sans text-xs text-(--color-error)">{{ errors[`att_${i}_phone`] }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                        ID / Passport <span class="text-(--color-error)">*</span>
                      </label>
                      <input v-model="att.idNumber" type="text"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                        :class="errors[`att_${i}_id`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                      <span v-if="errors[`att_${i}_id`]" class="font-sans text-xs text-(--color-error)">{{ errors[`att_${i}_id`] }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Job Title</label>
                      <input v-model="att.company" type="text" placeholder="e.g. Finance Analyst"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                    </div>
                  </div>
                </div>
                <button type="button"
                  class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline mt-3"
                  @click="eb.addAttendant()">
                  <span class="material-symbols-outlined text-base">person_add</span> Add Delegate
                </button>
              </div>
            </div>
          </section>

          <!-- ─── Event Schedule ─── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl overflow-hidden">
            <div class="flex items-center gap-3 px-6 py-5 border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-(--color-primary)">event_note</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Event Schedule</h2>
            </div>
            <div class="px-6 py-5 space-y-6">

              <!-- Reason -->
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Reason for Booking</label>
                <textarea v-model="eb.reasonForBooking" rows="2"
                  placeholder="e.g. Annual strategy conference, product launch, board meeting, team retreat…"
                  class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
              </div>

              <!-- Date range -->
              <div class="p-4 bg-(--color-surface-container) rounded-xl">
                <div class="flex items-start gap-2 mb-4">
                  <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0 mt-0.5">date_range</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Event Date Range</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Generates one session per day. All sessions remain fully editable.</p>
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Start Date <span class="text-(--color-error)">*</span></label>
                    <input v-model="eb.startDate" type="date" :min="today"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.startDate ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors.startDate" class="font-sans text-xs text-(--color-error)">{{ errors.startDate }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">End Date <span class="text-(--color-error)">*</span></label>
                    <input v-model="eb.endDate" type="date" :min="eb.startDate || today"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.endDate ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors.endDate" class="font-sans text-xs text-(--color-error)">{{ errors.endDate }}</span>
                  </div>
                </div>
                <div v-if="dayRange.length > 0" class="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--color-savannah-mist) border border-(--color-primary)">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">event</span>
                  <span class="font-sans text-xs font-semibold text-(--color-primary)">
                    {{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }} · {{ fmt(eb.startDate) }}
                    <template v-if="eb.endDate && eb.endDate !== eb.startDate"> – {{ fmt(eb.endDate) }}</template>
                  </span>
                </div>
              </div>

              <!-- Schedule mode (multi-day only) -->
              <div v-if="dayRange.length > 1" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" @click="eb.scheduleMode = 'uniform'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="eb.scheduleMode === 'uniform' ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                  <span class="material-symbols-outlined text-xl mt-0.5"
                    :class="eb.scheduleMode === 'uniform' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">calendar_view_week</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Uniform Schedule</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Same schedule repeated across all event days</p>
                  </div>
                </button>
                <button type="button" @click="eb.scheduleMode = 'per_day'"
                  class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                  :class="eb.scheduleMode === 'per_day' ? 'border-(--color-primary) bg-(--color-savannah-mist)' : 'border-(--color-outline-variant) hover:border-(--color-outline)'">
                  <span class="material-symbols-outlined text-xl mt-0.5"
                    :class="eb.scheduleMode === 'per_day' ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">event_note</span>
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Per-Day Schedule</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Start from a default, then customise or skip individual days</p>
                  </div>
                </button>
              </div>

              <!-- Scope banner -->
              <div class="p-4 rounded-xl border"
                :class="dayRange.length > 0 ? 'bg-(--color-savannah-mist) border-(--color-primary)' : 'bg-(--color-surface-container) border-(--color-outline-variant)'">
                <div class="flex items-start gap-2">
                  <span class="material-symbols-outlined text-base shrink-0 mt-0.5"
                    :class="dayRange.length > 0 ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">copy_all</span>
                  <div class="flex-1 min-w-0">
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">
                      {{ eb.scheduleMode === 'per_day' ? 'Default Daily Schedule' : 'Daily Schedule Template' }}
                    </p>
                    <template v-if="dayRange.length > 0">
                      <p v-if="eb.scheduleMode === 'uniform'" class="font-sans text-xs text-(--color-on-surface-variant) mt-1">
                        Applied to all <strong class="text-(--color-on-surface)">{{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }}</strong>
                        · {{ fmt(eb.startDate) }}<template v-if="eb.endDate && eb.endDate !== eb.startDate"> – {{ fmt(eb.endDate) }}</template>.
                      </p>
                      <p v-else class="font-sans text-xs text-(--color-on-surface-variant) mt-1">
                        Fallback for days without a custom plan — covering
                        <strong class="text-(--color-on-surface)">{{ eventDaySummary.defaultCount }} of {{ eventDaySummary.total }}</strong> day{{ eventDaySummary.total !== 1 ? 's' : '' }}.
                      </p>
                    </template>
                    <p v-else class="font-sans text-xs text-(--color-on-surface-variant) mt-1">Set a date range above to see how this schedule is applied.</p>
                  </div>
                </div>
              </div>

              <!-- ── Master sessions ── -->
              <div class="space-y-4">
                <div v-for="(session, i) in eb.masterSessions" :key="i"
                  class="border border-(--color-outline-variant) rounded-xl overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-3 bg-(--color-surface-container)">
                    <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ sessionLabel(session, i) }}</span>
                    <div class="flex items-center gap-2">
                      <span v-if="dayRange.length > 0 && eb.scheduleMode === 'uniform'"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                        × {{ dayRange.length }} days
                      </span>
                      <span v-else-if="dayRange.length > 0 && eb.scheduleMode === 'per_day'"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-surface-container-high) font-sans text-xs font-semibold text-(--color-on-surface-variant)">
                        default
                      </span>
                      <span v-else class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                        Session {{ i + 1 }}
                      </span>
                      <button type="button" :disabled="eb.masterSessions.length === 1"
                        class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                        @click="eb.removeMasterSession(i)">
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
                      <!-- Venue picker -->
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
                          <!-- Venue list -->
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
                              <button v-for="venue in availableVenues" :key="venue.id" type="button"
                                class="group text-left rounded-xl border-2 transition-all overflow-hidden"
                                :class="session.venueId === venue.id
                                  ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                                  : 'border-(--color-outline-variant) hover:border-(--color-primary) bg-(--color-surface-container-lowest)'"
                                @click="selectVenueForSession(session, venue)">
                                <div v-if="venue.images?.[0]" class="w-full h-24 overflow-hidden">
                                  <img :src="venue.images[0]" :alt="venue.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                </div>
                                <div class="p-3">
                                  <div class="flex items-start justify-between gap-2 mb-1">
                                    <p class="font-sans text-sm font-semibold text-(--color-on-surface) leading-tight">{{ venue.name }}</p>
                                    <span v-if="session.venueId === venue.id"
                                      class="material-symbols-outlined text-base text-(--color-primary) shrink-0" style="font-variation-settings: 'FILL' 1">check_circle</span>
                                  </div>
                                  <div class="flex items-center gap-3 flex-wrap">
                                    <span class="flex items-center gap-1 font-sans text-xs text-(--color-on-surface-variant)">
                                      <span class="material-symbols-outlined text-sm">group</span>Cap. {{ venue.capacity }}
                                    </span>
                                    <span class="px-1.5 py-0.5 rounded-full bg-(--color-surface-container) font-sans text-xs text-(--color-on-surface-variant) capitalize">{{ (venue.type ?? '').replace(/_/g, ' ') }}</span>
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
                          :class="errors[`ms_${i}_start`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                        <span v-if="errors[`ms_${i}_start`]" class="font-sans text-xs text-(--color-error)">{{ errors[`ms_${i}_start`] }}</span>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">End Time <span class="text-(--color-error)">*</span></label>
                        <input v-model="session.endTime" type="time"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                          :class="errors[`ms_${i}_end`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                        <span v-if="errors[`ms_${i}_end`]" class="font-sans text-xs text-(--color-error)">{{ errors[`ms_${i}_end`] }}</span>
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
                        <textarea v-model="session.specialRequirements" rows="2"
                          placeholder="AV equipment, branding, flowers, signage, live streaming…"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors resize-none"></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button type="button"
                class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline"
                @click="eb.addMasterSession()">
                <span class="material-symbols-outlined text-base">add</span>
                {{ eb.scheduleMode === 'per_day' ? 'Add Session to Default Schedule' : 'Add Another Session' }}
              </button>

              <!-- ── Per-day overrides ── -->
              <div v-if="eb.scheduleMode === 'per_day' && dayRange.length > 0" class="mt-6 pt-6 border-t border-(--color-outline-variant)">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-1">
                  Day-by-Day Schedule
                  <span class="text-(--color-outline) font-normal normal-case tracking-normal">({{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }})</span>
                </p>
                <p class="font-sans text-xs text-(--color-on-surface-variant) mb-3">Skip days your event doesn't run, or customise sessions for individual days.</p>
                <!-- Status strip -->
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
                          {{ eb.dayOverrides[date].sessions.length }} override{{ eb.dayOverrides[date].sessions.length !== 1 ? 's' : '' }}
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
                            ? 'text-(--color-primary) bg-(--color-savannah-mist)'
                            : 'text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container)'"
                          :title="dayStatus(date) === 'skipped' ? 'Restore day' : 'Skip this day'"
                          @click="eb.toggleDayExcluded(date)">
                          <span class="material-symbols-outlined text-base">{{ dayStatus(date) === 'skipped' ? 'undo' : 'block' }}</span>
                        </button>
                      </div>
                    </div>
                    <!-- Expanded override editor -->
                    <div v-if="expandedDayOverride === date && dayStatus(date) === 'overridden'"
                      class="p-4 bg-(--color-surface-container-low) space-y-3">
                      <div v-for="(s, si) in eb.dayOverrides[date].sessions" :key="si"
                        class="border border-(--color-outline-variant) rounded-xl overflow-hidden">
                        <div class="flex items-center justify-between px-4 py-2.5 bg-(--color-surface-container)">
                          <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ sessionLabel(s, si) }}</span>
                          <button type="button" :disabled="eb.dayOverrides[date].sessions.length === 1"
                            class="h-7 w-7 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                            @click="eb.removeOverrideSession(date, si)">
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
                            <!-- Venue picker (override) -->
                            <div class="flex flex-col gap-1 md:col-span-2">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Venue</label>
                              <div class="border rounded-xl overflow-hidden transition-all"
                                :class="expandedVenueKey === `ov_${date}_${si}` ? 'border-(--color-primary)' : 'border-(--color-outline-variant)'">
                                <div class="flex items-center justify-between gap-3 px-3 py-2.5 bg-(--color-surface-container)">
                                  <div v-if="s.venueId" class="flex items-center gap-2 min-w-0">
                                    <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0" style="font-variation-settings: 'FILL' 1">check_circle</span>
                                    <p class="font-sans text-sm font-semibold text-(--color-on-surface) truncate">{{ s.venueName }}</p>
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
                                  <div v-if="venuesLoading" class="flex items-center justify-center py-4 gap-2 text-(--color-on-surface-variant)">
                                    <span class="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                                    <p class="font-sans text-sm">Loading venues…</p>
                                  </div>
                                  <div v-else-if="!availableVenues.length" class="py-4 text-center">
                                    <p class="font-sans text-sm text-(--color-on-surface-variant)">No venues found</p>
                                  </div>
                                  <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button v-for="venue in availableVenues" :key="venue.id" type="button"
                                      class="group text-left rounded-xl border-2 transition-all overflow-hidden"
                                      :class="s.venueId === venue.id
                                        ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                                        : 'border-(--color-outline-variant) hover:border-(--color-primary) bg-(--color-surface-container-lowest)'"
                                      @click="selectVenueForSession(s, venue)">
                                      <div class="p-3">
                                        <p class="font-sans text-sm font-semibold text-(--color-on-surface) leading-tight">{{ venue.name }}</p>
                                        <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">Cap. {{ venue.capacity }}</p>
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
                                :class="errors[`ov_${date}_${si}_start`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                              <span v-if="errors[`ov_${date}_${si}_start`]" class="font-sans text-xs text-(--color-error)">{{ errors[`ov_${date}_${si}_start`] }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">End Time <span class="text-(--color-error)">*</span></label>
                              <input v-model="s.endTime" type="time"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                                :class="errors[`ov_${date}_${si}_end`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                              <span v-if="errors[`ov_${date}_${si}_end`]" class="font-sans text-xs text-(--color-error)">{{ errors[`ov_${date}_${si}_end`] }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Room Setup</label>
                              <select v-model="s.setupType"
                                class="w-full bg-white rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                                <option v-for="st in SETUP_TYPES" :key="st.value" :value="st.value">{{ st.label }}</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button type="button"
                        class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline"
                        @click="eb.addOverrideSession(date)">
                        <span class="material-symbols-outlined text-base">add</span> Add Session to {{ fmtDayLabel(date) }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          <!-- ─── Approval Documents (corporate only) ─── -->
          <section v-if="eb.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl overflow-hidden">
            <div class="flex items-start gap-3 px-6 py-5 border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-(--color-primary) mt-0.5">attach_file</span>
              <div>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Supporting Documents</h2>
                <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">
                  Attach any internal approval documents — LPOs, authorisation letters, budget approvals, or travel requests. Accepted: PDF, Word, JPG, PNG · Max 10 MB per file.
                </p>
              </div>
            </div>
            <div class="px-6 py-5 space-y-4">
              <label
                class="flex flex-col items-center justify-center gap-3 w-full rounded-xl border-2 border-dashed py-10 cursor-pointer transition-all"
                :class="docDragOver
                  ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                  : 'border-(--color-outline-variant) hover:border-(--color-primary) hover:bg-(--color-surface-container-low)'"
                @dragover.prevent="docDragOver = true"
                @dragleave.prevent="docDragOver = false"
                @drop.prevent="onDocDrop">
                <span class="material-symbols-outlined text-4xl"
                  :class="docDragOver ? 'text-(--color-primary)' : 'text-(--color-outline)'"
                  style="font-variation-settings: 'FILL' 1">upload_file</span>
                <div class="text-center">
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Drop files here or <span class="text-(--color-primary)">browse</span></p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">PDF, Word, JPG or PNG up to 10 MB each</p>
                </div>
                <input type="file" class="hidden" multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  @change="onDocInput" />
              </label>
              <TransitionGroup
                enter-active-class="transition duration-150"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition duration-100"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
                tag="div" class="space-y-2">
                <div v-for="doc in approvalDocs" :key="doc.id"
                  class="flex items-center gap-3 px-4 py-3 bg-(--color-surface-container-low) rounded-xl">
                  <span class="material-symbols-outlined text-xl text-(--color-primary) shrink-0"
                    style="font-variation-settings: 'FILL' 1">{{ docIcon(doc.file.type) }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface) truncate">{{ doc.file.name }}</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ docSize(doc.file.size) }}</p>
                  </div>
                  <button type="button" @click="removeDoc(doc.id)"
                    class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors shrink-0">
                    <span class="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </TransitionGroup>
              <p v-if="approvalDocs.length" class="font-sans text-xs text-(--color-on-surface-variant) text-center">
                {{ approvalDocs.length }} file{{ approvalDocs.length !== 1 ? 's' : '' }} attached
              </p>
            </div>
          </section>

          <!-- ─── Notes ─── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6">
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-(--color-primary)">notes</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Additional Requests</h2>
            </div>
            <textarea v-model="eb.notes" rows="3"
              placeholder="Dietary requirements for catering, decoration preferences, branding guidelines, accessibility needs…"
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

          <!-- Type badges -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-sans text-xs font-semibold"
              :class="eb.isCorporate ? 'bg-(--color-primary) text-white' : 'bg-(--color-savannah-mist) text-(--color-primary) border border-(--color-primary)'">
              <span class="material-symbols-outlined text-sm">{{ eb.isCorporate ? 'corporate_fare' : 'person' }}</span>
              {{ eb.isCorporate ? 'Corporate Event' : 'Individual Event' }}
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
              <span class="material-symbols-outlined text-sm">event</span>
              Event Booking
            </span>
          </div>

          <!-- Booked By -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-4">Booking Contact</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
              <div><p class="font-sans text-xs text-(--color-on-surface-variant)">Name</p><p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ eb.bookedBy.name || '—' }}</p></div>
              <div><p class="font-sans text-xs text-(--color-on-surface-variant)">Email</p><p class="font-sans text-sm text-(--color-on-surface)">{{ eb.bookedBy.email || '—' }}</p></div>
              <div><p class="font-sans text-xs text-(--color-on-surface-variant)">Phone</p><p class="font-sans text-sm text-(--color-on-surface)">{{ eb.bookedBy.phone || '—' }}</p></div>
              <div>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ eb.isCorporate ? 'Delegates' : 'Attendees' }}</p>
                <p class="font-sans text-sm text-(--color-on-surface)">
                  {{ eb.participantMode === 'headcount'
                    ? eb.participantCount + ' attendee' + (eb.participantCount !== 1 ? 's' : '')
                    : eb.attendants.length + ' registered' }}
                </p>
              </div>
            </div>
          </section>

          <!-- Corporate company -->
          <section v-if="eb.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl p-6">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-4">Company</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
              <div class="sm:col-span-2"><p class="font-sans text-xs text-(--color-on-surface-variant)">Company Name</p><p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ eb.companyName || '—' }}</p></div>
              <div v-if="eb.departmentName"><p class="font-sans text-xs text-(--color-on-surface-variant)">Department</p><p class="font-sans text-sm text-(--color-on-surface)">{{ eb.departmentName }}</p></div>
              <div v-if="eb.costCenter"><p class="font-sans text-xs text-(--color-on-surface-variant)">Cost Centre</p><p class="font-sans text-sm text-(--color-on-surface)">{{ eb.costCenter }}</p></div>
            </div>
            <div v-if="eb.approverName" class="mt-4 pt-4 border-t border-(--color-outline-variant)">
              <p class="font-sans text-xs text-(--color-on-surface-variant) mb-1">Approver</p>
              <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ eb.approverName }}
                <span v-if="eb.approverTitle" class="font-sans text-xs font-normal text-(--color-on-surface-variant)"> · {{ eb.approverTitle }}</span>
              </p>
            </div>
          </section>

          <!-- Event schedule summary -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-4">Event Schedule</p>
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div><p class="font-sans text-xs text-(--color-on-surface-variant)">Start Date</p><p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ fmt(eb.startDate) }}</p></div>
              <div><p class="font-sans text-xs text-(--color-on-surface-variant)">End Date</p><p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ fmt(eb.endDate) }}</p></div>
              <div><p class="font-sans text-xs text-(--color-on-surface-variant)">Days</p><p class="font-sans text-sm text-(--color-on-surface)">{{ dayRange.length || '—' }}</p></div>
              <div><p class="font-sans text-xs text-(--color-on-surface-variant)">Schedule</p><p class="font-sans text-sm text-(--color-on-surface) capitalize">{{ eb.scheduleMode.replace('_', '-') }}</p></div>
            </div>
            <div v-if="eb.reasonForBooking" class="mb-4 pb-4 border-b border-(--color-outline-variant)">
              <p class="font-sans text-xs text-(--color-on-surface-variant) mb-1">Reason</p>
              <p class="font-sans text-sm text-(--color-on-surface)">{{ eb.reasonForBooking }}</p>
            </div>
            <!-- Sessions summary — all expanded sessions grouped by day -->
            <div class="space-y-4 pt-2">
              <p class="font-sans text-xs font-semibold text-(--color-on-surface-variant)">
                Sessions ({{ confirmedSessions.length }} across {{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }})
              </p>
              <div v-for="[date, sessions] in sessionsByDay" :key="date" class="space-y-0">
                <p class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) mb-2">
                  {{ fmtDayLabel(date) }}
                </p>
                <div v-for="(s, si) in sessions" :key="si"
                  class="flex items-start justify-between gap-3 py-2.5 border-b border-(--color-outline-variant) last:border-0 pl-3 border-l-2 border-l-(--color-primary)">
                  <div class="min-w-0">
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ sessionLabel(s, si) }}</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">
                      {{ s.startTime }} – {{ s.endTime }}
                      <template v-if="s.setupType"> · {{ SETUP_TYPES.find(st => st.value === s.setupType)?.label ?? s.setupType }}</template>
                    </p>
                    <p v-if="s.venueName" class="font-sans text-xs text-(--color-primary) mt-0.5">
                      <span class="material-symbols-outlined text-sm align-[-4px]">location_on</span> {{ s.venueName }}
                    </p>
                  </div>
                  <span class="font-sans text-xs text-(--color-on-surface-variant) shrink-0 mt-0.5">
                    {{ s.expectedAttendees }} attendee{{ s.expectedAttendees !== 1 ? 's' : '' }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="eventDaySummary.customised > 0" class="mt-3 flex items-center gap-2">
              <span class="material-symbols-outlined text-sm text-(--color-primary)">event_note</span>
              <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ eventDaySummary.customised }} day{{ eventDaySummary.customised !== 1 ? 's' : '' }} with custom schedule</p>
            </div>
            <div v-if="eventDaySummary.skipped > 0" class="mt-1 flex items-center gap-2">
              <span class="material-symbols-outlined text-sm text-(--color-outline)">block</span>
              <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ eventDaySummary.skipped }} day{{ eventDaySummary.skipped !== 1 ? 's' : '' }} skipped</p>
            </div>
            <div v-if="eb.notes" class="mt-4 pt-4 border-t border-(--color-outline-variant)">
              <p class="font-sans text-xs text-(--color-on-surface-variant) mb-1">Additional Requests</p>
              <p class="font-sans text-sm text-(--color-on-surface)">{{ eb.notes }}</p>
            </div>
            <div v-if="eb.isCorporate && approvalDocs.length" class="mt-4 pt-4 border-t border-(--color-outline-variant)">
              <p class="font-sans text-xs text-(--color-on-surface-variant) mb-2">Supporting Documents</p>
              <div class="space-y-1.5">
                <div v-for="doc in approvalDocs" :key="doc.id" class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-base text-(--color-primary)" style="font-variation-settings: 'FILL' 1">{{ docIcon(doc.file.type) }}</span>
                  <span class="font-sans text-sm text-(--color-on-surface) truncate">{{ doc.file.name }}</span>
                  <span class="font-sans text-xs text-(--color-on-surface-variant) shrink-0">{{ docSize(doc.file.size) }}</span>
                </div>
              </div>
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
              {{ uploading ? 'Uploading documents…' : loading ? 'Submitting…' : 'Confirm Booking' }}
            </button>
          </div>

        </template>
      </div>

      <!-- ── Sidebar ───────────────────────────────────────────────────────── -->
      <aside class="lg:col-span-4 lg:sticky lg:top-8 space-y-4">
        <div class="bg-(--color-surface-container-lowest) rounded-xl p-5">
          <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-4">Booking Summary</p>

          <div class="flex items-center gap-3 mb-4 pb-4 border-b border-(--color-outline-variant)">
            <span class="material-symbols-outlined text-(--color-primary)">villa</span>
            <div class="min-w-0">
              <p class="font-sans text-sm font-semibold text-(--color-on-surface) truncate">{{ lodge?.name ?? '—' }}</p>
              <p v-if="selectedBranch" class="font-sans text-xs text-(--color-on-surface-variant)">{{ selectedBranch.name }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 mb-4">
            <span class="material-symbols-outlined text-sm" :class="eb.isCorporate ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">
              {{ eb.isCorporate ? 'corporate_fare' : 'person' }}
            </span>
            <span class="font-sans text-sm text-(--color-on-surface)">{{ eb.isCorporate ? 'Corporate Event' : 'Individual Event' }}</span>
          </div>

          <div v-if="eb.startDate || eb.endDate" class="space-y-2 mb-4 pb-4 border-b border-(--color-outline-variant)">
            <div class="flex justify-between items-center">
              <span class="font-sans text-xs text-(--color-on-surface-variant)">Start</span>
              <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ fmt(eb.startDate) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="font-sans text-xs text-(--color-on-surface-variant)">End</span>
              <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ fmt(eb.endDate) }}</span>
            </div>
            <div v-if="dayRange.length > 0" class="flex justify-between items-center">
              <span class="font-sans text-xs text-(--color-on-surface-variant)">Duration</span>
              <span class="font-sans text-sm text-(--color-primary) font-semibold">{{ dayRange.length }} day{{ dayRange.length !== 1 ? 's' : '' }}</span>
            </div>
          </div>
          <div v-else class="mb-4 pb-4 border-b border-(--color-outline-variant)">
            <p class="font-sans text-sm text-(--color-outline) italic">No dates selected yet</p>
          </div>

          <div class="space-y-1">
            <p class="font-sans text-xs font-semibold text-(--color-on-surface-variant)">Sessions</p>
            <div v-for="(s, i) in eb.masterSessions" :key="i" class="flex items-center gap-2 py-1">
              <span class="material-symbols-outlined text-sm text-(--color-primary)">event</span>
              <div class="min-w-0 flex-1">
                <p class="font-sans text-xs font-semibold text-(--color-on-surface) truncate">{{ sessionLabel(s, i) }}</p>
                <p v-if="s.startTime && s.endTime" class="font-sans text-xs text-(--color-on-surface-variant)">{{ s.startTime }} – {{ s.endTime }}</p>
              </div>
            </div>
            <p v-if="eb.masterSessions.length === 0" class="font-sans text-sm text-(--color-outline) italic">No sessions yet</p>
          </div>

          <div v-if="eb.participantCount" class="mt-4 pt-4 border-t border-(--color-outline-variant) flex justify-between items-center">
            <span class="font-sans text-xs text-(--color-on-surface-variant)">{{ eb.isCorporate ? 'Delegates' : 'Attendees' }}</span>
            <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ eb.participantCount }}</span>
          </div>
        </div>
      </aside>

    </div>
  </div>
</template>

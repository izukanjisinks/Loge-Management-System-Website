<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLodgesStore } from '@/stores/lodges'
import { useAuthStore } from '@/stores/auth'
import { useAccommodationBookingStore } from '@/stores/accommodationBooking'
import { useRebookStore } from '@/stores/rebook'
import { uploadBookingDocument } from '@/services/storage'
import api from '@/lib/api'
import { PDFDownloadLink } from '@ceereals/vue-pdf'
import BookingInvoiceDocument from '@/components/reservation/BookingInvoiceDocument.vue'

const route       = useRoute()
const router      = useRouter()
const lodgesStore = useLodgesStore()
const auth        = useAuthStore()
const ab          = useAccommodationBookingStore()
const rebookStore = useRebookStore()

const lodgeId        = route.params.id
const lodge          = computed(() => lodgesStore.lodges.find(l => String(l.id) === String(lodgeId)))
const branches       = computed(() => lodgesStore.branchesFor(lodgeId))
const selectedBranch = computed(() => branches.value.find(b => String(b.id) === String(ab.branchId)) ?? null)

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
const approvalDocs  = ref([])   // [{ file: File, id: string }]
const docDragOver   = ref(false)
const ACCEPTED_TYPES = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png']
const MAX_FILE_SIZE  = 10 * 1024 * 1024 // 10 MB

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

// ── Room availability ──────────────────────────────────────────────────────
const availableRooms   = ref([])
const roomsLoading     = ref(false)
const roomsError       = ref(false)
const expandedPickerIdx  = ref(null)

async function fetchAvailableRooms() {
  if (!ab.checkIn || !ab.checkOut || ab.checkOut <= ab.checkIn) {
    availableRooms.value = []
    return
  }
  roomsLoading.value = true
  roomsError.value   = false
  try {
    const params = { org_id: lodgeId, check_in: ab.checkIn, check_out: ab.checkOut, page_size: 100 }
    if (ab.branchId) params.branch_id = ab.branchId
    const { data } = await api.get('/guest/rooms', { params })
    availableRooms.value = (data.data ?? data).filter(r => r.available !== false)
  } catch {
    roomsError.value   = true
    availableRooms.value = []
  } finally {
    roomsLoading.value = false
  }
}

function togglePicker(idx) {
  expandedPickerIdx.value = expandedPickerIdx.value === idx ? null : idx
  if (expandedPickerIdx.value !== null && !availableRooms.value.length && !roomsLoading.value) {
    if (ab.checkIn && ab.checkOut && ab.checkOut > ab.checkIn) fetchAvailableRooms()
  }
}

function selectRoom(idx, room) {
  ab.setAttendantRoom(idx, room)
  expandedPickerIdx.value = null
}

watch(
  () => [ab.checkIn, ab.checkOut],
  ([ci, co]) => {
    ab.clearAllRooms()
    expandedPickerIdx.value = null
    if (ci && co && co > ci) fetchAvailableRooms()
    else availableRooms.value = []
  }
)

const ZAMBIA_SUGAR_TPIN = '1001757365'
const isZS = computed(() => ab.isCorporate && ab.tpin.trim() === ZAMBIA_SUGAR_TPIN)
watch(() => ab.tpin, tpin => {
  if (tpin.trim() !== ZAMBIA_SUGAR_TPIN) return
  if (!ab.companyName) ab.companyName = 'Zambia Sugar PLC'
  if (!ab.industry)    ab.industry    = 'Agriculture & Agribusiness'
  if (!ab.city)        ab.city        = 'Mazabuka'
  if (!ab.country)     ab.country     = 'Zambia'
})

// Default Number of Rooms to participant/guest count
watch(
  () => ab.participantMode === 'headcount' ? ab.participantCount : ab.attendants.length,
  (count) => { ab.roomCount = Math.max(1, count) },
  { immediate: true }
)

// ── Live validation clearing ───────────────────────────────────────────────
watch(() => ab.bookedBy.name,      v => { if (v) delete errors.value.bookedByName })
watch(() => ab.bookedBy.email,     v => { if (v) delete errors.value.bookedByEmail })
watch(() => ab.bookedBy.jobTitle,  v => { if (v) delete errors.value.bookedByJobTitle })
watch(() => ab.bookedBy.manNumber, v => { if (v) delete errors.value.bookedByManNumber })
watch(() => ab.checkIn,            v => { if (v) delete errors.value.checkIn })
watch(() => ab.checkOut,           v => { if (v) delete errors.value.checkOut })
watch(() => ab.companyName,        v => { if (v) delete errors.value.companyName })
watch(() => ab.tpin,               v => { if (v) delete errors.value.tpin })
watch(() => ab.industry,           v => { if (v) delete errors.value.industry })
watch(() => ab.companyEmail,       v => { if (v) delete errors.value.companyEmail })
watch(() => ab.companyPhone,       v => { if (v) delete errors.value.companyPhone })
watch(() => ab.approverName,       v => { if (v) delete errors.value.approverName })
watch(() => ab.approverTitle,      v => { if (v) delete errors.value.approverTitle })
watch(() => ab.approverEmail,      v => { if (v) delete errors.value.approverEmail })
watch(() => ab.approverPhone,      v => { if (v) delete errors.value.approverPhone })
watch(() => ab.branchName,         v => { if (v) delete errors.value.branchName })
watch(() => ab.departmentName,     v => { if (v) delete errors.value.departmentName })
watch(() => ab.costCenter,         v => { if (v) delete errors.value.costCenter })
watch(() => ab.glCode,             v => { if (v) delete errors.value.glCode })
watch(() => ab.roomCount,          v => { if (v >= 1) delete errors.value.roomCount })
watch(() => ab.reasonForBooking,   v => { if (v) delete errors.value.reasonForBooking })
watch(approvalDocs,                v => { if (v.length) delete errors.value.approvalDocs }, { deep: true })
watch(() => ab.attendants, () => {
  for (const key of Object.keys(errors.value)) {
    if (!key.startsWith('att_')) continue
    const [, idxStr, field] = key.split('_')
    const a = ab.attendants[Number(idxStr)]
    if (!a) { delete errors.value[key]; continue }
    if (field === 'name'  && a.fullName) delete errors.value[key]
    if (field === 'id'    && a.idNumber) delete errors.value[key]
    if (field === 'email' && a.email)    delete errors.value[key]
    if (field === 'phone' && a.phone)    delete errors.value[key]
  }
}, { deep: true })

// ── Helpers ────────────────────────────────────────────────────────────────
function nights(a, b) {
  if (!a || !b) return 0
  return Math.max(0, Math.floor((new Date(b) - new Date(a)) / 86400000))
}

const invoiceSnapshot = ref(null)

function buildInvoiceSnapshot() {
  const nameParts  = (ab.bookedBy.name || '').trim().split(' ')
  const nightCount = nights(ab.checkIn, ab.checkOut)
  const rooms      = ab.attendantRooms
    .filter(r => r.rate)
    .map(r => ({ name: r.roomName, rate: Number(r.rate), total: Number(r.rate) * nightCount }))
  const baseRatePerNight = rooms.reduce((s, r) => s + r.rate, 0)
  const baseTotal  = baseRatePerNight * nightCount
  const taxes      = Math.round(baseTotal * 0.16 * 100) / 100
  const grandTotal = baseTotal + taxes
  return {
    bookingType:      ab.isCorporate ? 'corporate' : 'individual',
    lodgeName:        lodge.value?.name ?? '',
    lodgeAddress:     lodge.value?.address ?? '',
    lodgeEmail:       lodge.value?.email ?? '',
    lodgePhone:       lodge.value?.phone ?? '',
    roomCount:        ab.isCorporate ? ab.roomCount : null,
    roomType:         ab.isCorporate ? (ab.roomTypePreference || 'Corporate Accommodation') : (ab.attendantRooms[0]?.roomName || 'Accommodation'),
    checkIn:          ab.checkIn,
    checkOut:         ab.checkOut,
    nightCount,
    guestCount:       ab.attendants.length,
    rooms,
    baseRatePerNight,
    baseTotal,
    mealPlanName:     '',
    mealCost:         0,
    taxes,
    grandTotal,
    specialRequests:  ab.notes,
    guestInfo: {
      firstName:   nameParts[0] ?? '',
      lastName:    nameParts.slice(1).join(' ') ?? '',
      email:       ab.bookedBy.email ?? '',
      phone:       ab.bookedBy.phone ?? '',
      nationality: '',
      passportId:  '',
    },
    corporateClient: {
      companyName:      ab.companyName ?? '',
      contactPerson:    ab.approverName ?? '',
      email:            ab.companyEmail ?? '',
      phone:            ab.companyPhone ?? '',
      regNumber:        ab.tpin ?? '',
      industry:         ab.industry ?? '',
      tpin:             ab.tpin ?? '',
      costCenter:       ab.costCenter ?? '',
      costCenterType:   ab.costCenterType ?? '',
      glCode:           ab.glCode ?? '',
    },
    corporateGuests: ab.attendants.map(a => ({ fullName: a.fullName, email: a.email, idNumber: a.idNumber })),
  }
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Validation ─────────────────────────────────────────────────────────────
function validate() {
  const e = {}

  if (!ab.bookedBy.name)  e.bookedByName  = 'Required'
  if (!ab.bookedBy.email) e.bookedByEmail = 'Required'
  else if (!/\S+@\S+\.\S+/.test(ab.bookedBy.email)) e.bookedByEmail = 'Enter a valid email'

  if (!ab.checkIn)                     e.checkIn  = 'Required'
  else if (ab.checkIn < today)         e.checkIn  = 'Date cannot be in the past'

  if (!ab.checkOut)                    e.checkOut = 'Required'
  else if (ab.checkOut < today)        e.checkOut = 'Date cannot be in the past'
  else if (ab.checkIn && ab.checkOut <= ab.checkIn) e.checkOut = 'Check-out must be at least 1 night after check-in'

  if (ab.isCorporate) {
    if (!ab.companyName)      e.companyName      = 'Required'
    if (ab.roomCount < 1)     e.roomCount        = 'Enter at least 1 room'
    if (!ab.reasonForBooking) e.reasonForBooking = 'Required'
  }

  if (!ab.isCorporate && ab.checkIn && ab.checkOut && ab.attendantRooms.length === 0) {
    e.roomSelection = 'Please select at least one room before continuing'
  }

  if (!ab.isCorporate) {
    ab.attendants.forEach((a, i) => {
      if (!a.fullName) e[`att_${i}_name`] = 'Required'
      if (!a.idNumber) e[`att_${i}_id`]   = 'Required'
      if (a.isLead) {
        if (!a.email)    e[`att_${i}_email`] = 'Required'
        else if (!/\S+@\S+\.\S+/.test(a.email)) e[`att_${i}_email`] = 'Enter a valid email'
        if (!a.phone)    e[`att_${i}_phone`] = 'Required'
      }
    })
  }

  if (ab.isCorporate) {
    if (!ab.tpin)         e.tpin         = 'Required'
    if (!ab.industry)     e.industry     = 'Required'
    if (!ab.companyEmail) e.companyEmail = 'Required'
    else if (!/\S+@\S+\.\S+/.test(ab.companyEmail)) e.companyEmail = 'Enter a valid email'
    if (!ab.companyPhone) e.companyPhone = 'Required'

    if (!ab.approverName)  e.approverName  = 'Required'
    if (!ab.approverTitle) e.approverTitle = 'Required'
    if (!ab.approverEmail) e.approverEmail = 'Required'
    else if (!/\S+@\S+\.\S+/.test(ab.approverEmail)) e.approverEmail = 'Enter a valid email'
    if (!ab.approverPhone) e.approverPhone = 'Required'

    if (isZS.value) {
      if (!ab.branchName)                e.branchName        = 'Required'
      if (!ab.departmentName)            e.departmentName    = 'Required'
      if (!ab.costCenter)                e.costCenter        = 'Required'
      if (!ab.glCode)                    e.glCode            = 'Required'
      if (!ab.bookedBy.jobTitle)         e.bookedByJobTitle  = 'Required'
      if (!ab.bookedBy.manNumber)        e.bookedByManNumber = 'Required'
      if (!approvalDocs.value.length)    e.approvalDocs      = 'At least one supporting document is required'
    }

    ab.attendants.forEach((a, i) => {
      if (!a.fullName) e[`att_${i}_name`] = 'Required'
      if (!a.idNumber) e[`att_${i}_id`]   = 'Required'
      if (a.isLead) {
        if (!a.email)    e[`att_${i}_email`] = 'Required'
        else if (!/\S+@\S+\.\S+/.test(a.email)) e[`att_${i}_email`] = 'Enter a valid email'
        if (!a.phone)    e[`att_${i}_phone`] = 'Required'
      }
    })
    if (!ab.attendants.some(a => a.fullName))
      e.delegateRecords = 'At least one delegate record must be completed'
  }

  if (ab.attendants.length > 1) {
    const emailsSeen = new Map()
    const phonesSeen = new Map()
    const idsSeen    = new Map()
    ab.attendants.forEach((a, i) => {
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

async function goToReview() {
  if (!validate()) {
    if (Object.keys(errors.value).some(k => k.startsWith('bookedBy'))) bookedByEditing.value = true
    if (Object.keys(errors.value).some(k => k.startsWith('att_')))    attendantsExpanded.value = true
    await nextTick()
    const first = document.querySelector('[class*="border-(--color-error)"]')
      ?? document.querySelector('span[class*="text-(--color-error)"]')
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  invoiceSnapshot.value = buildInvoiceSnapshot()
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

    await ab.submit(documentUrls)
    success.value = true
    setTimeout(() => { router.push({ name: 'bookings' }); ab.reset() }, 2500)
  } catch (err) {
    submitError.value = err.response?.data?.error?.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

function goBack() {
  if (step.value === 2) { step.value = 1; invoiceSnapshot.value = null; return }
  router.push({ name: 'lodge-detail', params: { id: lodgeId } })
}

// ── Init ───────────────────────────────────────────────────────────────────
onMounted(async () => {
  await lodgesStore.fetchLodges()
  lodgesStore.fetchLodgeDetail(lodgeId)
  ab.setLodge(lodgeId, lodge.value?.name ?? '')

  const q = route.query
  if (q.branchId && !ab.branchId) ab.branchId = q.branchId
  if (q.context === 'corporate')  ab.bookingContext = 'corporate'
  if (q.context === 'individual') ab.bookingContext = 'individual'

  ab.fillFromAuth(auth.user)

  // Prefill from a "Book Again" navigation
  const rd = rebookStore.drain()
  if (rd && rd.bookingType === 'accommodation') {
    if (rd.branchId)      ab.branchId        = rd.branchId
    if (rd.bookingContext) ab.bookingContext  = rd.bookingContext
    if (rd.bookedBy?.name)      ab.bookedBy.name      = rd.bookedBy.name
    if (rd.bookedBy?.email)     ab.bookedBy.email     = rd.bookedBy.email
    if (rd.bookedBy?.phone)     ab.bookedBy.phone     = rd.bookedBy.phone
    if (rd.bookedBy?.jobTitle)  ab.bookedBy.jobTitle  = rd.bookedBy.jobTitle
    if (rd.bookedBy?.manNumber) ab.bookedBy.manNumber = rd.bookedBy.manNumber
    if (rd.accommodation?.checkIn)  ab.checkIn  = rd.accommodation.checkIn
    if (rd.accommodation?.checkOut) ab.checkOut = rd.accommodation.checkOut
    if (rd.company) {
      ab.bookingContext  = 'corporate'
      ab.companyName     = rd.company.name       || ''
      ab.tpin            = rd.company.tpin        || ''
      ab.companyEmail    = rd.company.email       || ''
      ab.companyPhone    = rd.company.phone       || ''
      ab.industry        = rd.company.industry    || ''
      ab.branchName      = rd.company.branch      || ''
      ab.departmentName  = rd.company.department  || ''
      ab.costCenter      = rd.company.costCenter  || ''
      ab.glCode          = rd.company.glCode      || ''
    }
    if (rd.approver) {
      ab.approverName  = rd.approver.name  || ''
      ab.approverEmail = rd.approver.email || ''
      ab.approverPhone = rd.approver.phone || ''
      ab.approverTitle = rd.approver.title || ''
    }
    if (rd.attendants?.length) {
      ab.attendants = rd.attendants.map((a, i) => ({
        fullName:     a.fullName  || '',
        email:        a.email     || '',
        phone:        a.phone     || '',
        idNumber:     a.idNumber  || '',
        dietaryNotes: '',
        company:      '',
        isLead:       a.isLead || i === 0,
      }))
    }
  }

  // Restore room availability if dates already set
  if (ab.checkIn && ab.checkOut && ab.checkOut > ab.checkIn) fetchAvailableRooms()

  // Pre-populate from room query params (e.g. from RoomDetailView)
  if (q.roomId) {
    if (q.checkIn)  ab.checkIn  = q.checkIn
    if (q.checkOut) ab.checkOut = q.checkOut
    await nextTick()
    ab.setAttendantRoom(0, {
      id:              q.roomId,
      name:            q.roomName || 'Selected Room',
      type:            q.roomType || '',
      price_per_night: q.rate     || '0',
    })
  }
})
</script>

<template>
  <!-- ── Success overlay ──────────────────────────────────────────────────── -->
  <Transition enter-active-class="transition duration-500" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
    <div v-if="success" class="fixed inset-0 z-50 bg-(--color-background) flex items-center justify-center px-5">
      <div class="text-center max-w-sm">
        <span class="material-symbols-outlined text-6xl text-(--color-primary) mb-6 block" style="font-variation-settings: 'FILL' 1">check_circle</span>
        <h2 class="font-serif text-3xl text-(--color-on-surface) mb-3">Booking Submitted</h2>
        <p class="font-sans text-base text-(--color-on-surface-variant) leading-relaxed">Your accommodation request has been received. The property team will be in touch to confirm your reservation. Redirecting…</p>
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
        <span class="material-symbols-outlined text-(--color-primary)" style="font-variation-settings: 'FILL' 1">bed</span>
        <h1 class="font-serif text-3xl font-semibold text-(--color-on-surface)">Accommodation Booking</h1>
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
          :class="step === i + 1 ? 'text-(--color-primary)' : step > i + 1 ? 'text-(--color-primary)' : 'text-(--color-outline)'">
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

        <!-- ══════════════ STEP 1: DETAILS ════════════════════════════════ -->
        <template v-if="step === 1">

          <!-- ─── Context selector ─── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) p-5">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-3">Booking Type</p>
            <div class="grid grid-cols-2 gap-3">
              <button type="button"
                @click="ab.bookingContext = 'individual'"
                class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                :class="!ab.isCorporate
                  ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                  : 'border-(--color-outline-variant) hover:border-(--color-primary)'">
                <span class="material-symbols-outlined text-xl mt-0.5 shrink-0"
                  :class="!ab.isCorporate ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">person</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Individual / Guest</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5 leading-snug">Personal travel, family stays, small groups</p>
                </div>
              </button>
              <button type="button"
                @click="ab.bookingContext = 'corporate'"
                class="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
                :class="ab.isCorporate
                  ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                  : 'border-(--color-outline-variant) hover:border-(--color-primary)'">
                <span class="material-symbols-outlined text-xl mt-0.5 shrink-0"
                  :class="ab.isCorporate ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">corporate_fare</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Corporate / Group</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5 leading-snug">Company stays, conferences, delegate accommodation</p>
                </div>
              </button>
            </div>
          </section>

          <!-- ─── Corporate: Company Information ─── -->
          <section v-if="ab.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
            <div class="flex items-center gap-3 px-6 py-5 border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-(--color-primary)">business</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Company Information</h2>
            </div>
            <div class="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1 sm:col-span-2">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Company Name <span class="text-(--color-error)">*</span></label>
                <input v-model="ab.companyName" type="text"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.companyName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.companyName" class="font-sans text-xs text-(--color-error)">{{ errors.companyName }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">TPIN <span class="text-(--color-error)">*</span></label>
                <input v-model.trim="ab.tpin" type="text" placeholder="e.g. 1234567890"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.tpin ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.tpin" class="font-sans text-xs text-(--color-error)">{{ errors.tpin }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Industry <span class="text-(--color-error)">*</span></label>
                <select v-model="ab.industry"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm border-2 focus:outline-none transition-colors appearance-none"
                  :class="errors.industry
                    ? 'border-(--color-error) text-(--color-on-surface)'
                    : 'border-transparent focus:border-(--color-primary) text-(--color-on-surface)'"
                  :style="!ab.industry ? 'color: var(--color-on-surface-variant)' : ''">
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
                <input v-model="ab.companyEmail" type="email" placeholder="e.g. accounts@company.com"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.companyEmail ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.companyEmail" class="font-sans text-xs text-(--color-error)">{{ errors.companyEmail }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Company Phone <span class="text-(--color-error)">*</span></label>
                <input v-model="ab.companyPhone" type="tel" placeholder="e.g. +260 211 000000"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.companyPhone ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.companyPhone" class="font-sans text-xs text-(--color-error)">{{ errors.companyPhone }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Branch <span v-if="isZS" class="text-(--color-error)">*</span></label>
                <input v-model="ab.branchName" type="text"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.branchName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.branchName" class="font-sans text-xs text-(--color-error)">{{ errors.branchName }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Department <span v-if="isZS" class="text-(--color-error)">*</span></label>
                <input v-model="ab.departmentName" type="text"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.departmentName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.departmentName" class="font-sans text-xs text-(--color-error)">{{ errors.departmentName }}</span>
              </div>
              <div class="flex flex-col gap-2">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
                  {{ ab.costCenterType === 'internal_order' ? 'Internal Order No.' : 'Cost Centre' }} <span v-if="isZS" class="text-(--color-error)">*</span>
                </label>
                <div class="flex w-full bg-(--color-surface-container) rounded-xl p-1 gap-1">
                  <button type="button"
                    @click="ab.costCenterType = 'cost_center'"
                    class="flex-1 py-2 px-3 font-sans text-xs font-semibold rounded-lg transition-all duration-150 text-center"
                    :class="ab.costCenterType === 'cost_center'
                      ? 'bg-(--color-primary) text-white shadow-sm'
                      : 'text-(--color-on-surface-variant) hover:text-(--color-on-surface)'">
                    Cost Centre
                  </button>
                  <button type="button"
                    @click="ab.costCenterType = 'internal_order'"
                    class="flex-1 py-2 px-3 font-sans text-xs font-semibold rounded-lg transition-all duration-150 text-center"
                    :class="ab.costCenterType === 'internal_order'
                      ? 'bg-(--color-primary) text-white shadow-sm'
                      : 'text-(--color-on-surface-variant) hover:text-(--color-on-surface)'">
                    Internal Order No.
                  </button>
                </div>
                <input v-model="ab.costCenter" type="text"
                  :placeholder="ab.costCenterType === 'cost_center' ? 'e.g. CC-1234' : 'e.g. IO-5678'"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.costCenter ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.costCenter" class="font-sans text-xs text-(--color-error)">{{ errors.costCenter }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">GL Code <span v-if="isZS" class="text-(--color-error)">*</span></label>
                <input v-model="ab.glCode" type="text"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.glCode ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.glCode" class="font-sans text-xs text-(--color-error)">{{ errors.glCode }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Country</label>
                <input v-model="ab.country" type="text" placeholder="e.g. Zambia"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
            </div>
          </section>

                    <!-- ─── Booked By ─── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
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
                  {{ ab.isCorporate ? 'Company representative submitting this booking.' : 'Auto-filled from your account — you are the booking contact.' }}
                </p>
              </div>
            </div>

            <!-- Read-only -->
            <div v-if="!bookedByEditing" class="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-(--color-outline-variant) pt-4">
              <div>
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-0.5">Full Name</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ ab.bookedBy.name || '—' }}</p>
                <p v-if="errors.bookedByName" class="font-sans text-xs text-(--color-error) mt-0.5">{{ errors.bookedByName }}</p>
              </div>
              <div>
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-0.5">Email</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ ab.bookedBy.email || '—' }}</p>
                <p v-if="errors.bookedByEmail" class="font-sans text-xs text-(--color-error) mt-0.5">{{ errors.bookedByEmail }}</p>
              </div>
              <div>
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-0.5">Phone</p>
                <p class="font-sans text-sm" :class="ab.bookedBy.phone ? 'text-(--color-on-surface)' : 'text-(--color-outline) italic'">
                  {{ ab.bookedBy.phone || 'Not provided' }}
                </p>
              </div>
              <div v-if="ab.isCorporate">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-0.5">Job Title</p>
                <p class="font-sans text-sm" :class="ab.bookedBy.jobTitle ? 'text-(--color-on-surface)' : 'text-(--color-outline) italic'">
                  {{ ab.bookedBy.jobTitle || 'Not provided' }}
                </p>
              </div>
              <div v-if="ab.isCorporate">
                <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-0.5">Employee / Man No.</p>
                <p class="font-sans text-sm" :class="ab.bookedBy.manNumber ? 'text-(--color-on-surface)' : 'text-(--color-outline) italic'">
                  {{ ab.bookedBy.manNumber || 'Not provided' }}
                </p>
              </div>
            </div>

            <!-- Editable -->
            <div v-else class="px-6 pb-6 border-t border-(--color-outline-variant) pt-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full Name <span class="text-(--color-error)">*</span></label>
                  <input v-model="ab.bookedBy.name" type="text"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.bookedByName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.bookedByName" class="font-sans text-xs text-(--color-error)">{{ errors.bookedByName }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email <span class="text-(--color-error)">*</span></label>
                  <input v-model="ab.bookedBy.email" type="email"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.bookedByEmail ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.bookedByEmail" class="font-sans text-xs text-(--color-error)">{{ errors.bookedByEmail }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Phone</label>
                  <input v-model="ab.bookedBy.phone" type="tel"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div v-if="ab.isCorporate" class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Job Title <span v-if="isZS" class="text-(--color-error)">*</span></label>
                  <input v-model="ab.bookedBy.jobTitle" type="text"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.bookedByJobTitle ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.bookedByJobTitle" class="font-sans text-xs text-(--color-error)">{{ errors.bookedByJobTitle }}</span>
                </div>
                <div v-if="ab.isCorporate" class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Employee / Man Number <span v-if="isZS" class="text-(--color-error)">*</span></label>
                  <input v-model="ab.bookedBy.manNumber" type="text" placeholder="e.g. EMP-00123"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.bookedByManNumber ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.bookedByManNumber" class="font-sans text-xs text-(--color-error)">{{ errors.bookedByManNumber }}</span>
                </div>
              </div>
            </div>
          </section>


          <!-- ─── Corporate: Approver ─── -->
          <section v-if="ab.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
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
                <input v-model="ab.approverName" type="text" placeholder="e.g. John Banda"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.approverName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.approverName" class="font-sans text-xs text-(--color-error)">{{ errors.approverName }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Job Title <span class="text-(--color-error)">*</span></label>
                <input v-model="ab.approverTitle" type="text" placeholder="e.g. Finance Manager"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.approverTitle ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.approverTitle" class="font-sans text-xs text-(--color-error)">{{ errors.approverTitle }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email <span class="text-(--color-error)">*</span></label>
                <input v-model="ab.approverEmail" type="email" placeholder="e.g. approver@company.com"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.approverEmail ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.approverEmail" class="font-sans text-xs text-(--color-error)">{{ errors.approverEmail }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Phone <span class="text-(--color-error)">*</span></label>
                <input v-model="ab.approverPhone" type="tel" placeholder="e.g. +260 97 0000000"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.approverPhone ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.approverPhone" class="font-sans text-xs text-(--color-error)">{{ errors.approverPhone }}</span>
              </div>
            </div>
          </section>

          <!-- ─── Individual: Additional Guests ─── -->
          <section v-if="!ab.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
            <div class="flex items-stretch">
              <button type="button"
                class="flex items-center gap-2 flex-1 px-6 py-5 text-left hover:bg-(--color-surface-container-low) transition-colors min-w-0"
                @click="attendantsExpanded = !attendantsExpanded">
                <span class="material-symbols-outlined text-(--color-primary) shrink-0">group</span>
                <div class="min-w-0 flex-1">
                  <h2 class="font-serif text-xl text-(--color-on-surface)">Guests</h2>
                  <p v-if="!attendantsExpanded" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">
                    {{ ab.attendants.filter(a => a.fullName).length + ' guest' + (ab.attendants.filter(a => a.fullName).length !== 1 ? 's' : '') + ' registered' }}
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0 mr-2">
                  <span v-if="!attendantsExpanded && ab.attendants.filter(a => a.fullName).length > 0"
                    class="px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                    {{ ab.attendants.filter(a => a.fullName).length }}
                  </span>
                  <span class="material-symbols-outlined text-(--color-on-surface-variant) transition-transform duration-200"
                    :style="{ transform: attendantsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }">expand_more</span>
                </div>
              </button>
            </div>

            <div v-if="attendantsExpanded" class="px-6 pb-6 border-t border-(--color-outline-variant)">
              <div class="space-y-3 pt-4">
                <p class="font-sans text-sm text-(--color-on-surface-variant) mb-4">Register all guests. The lead contact receives all booking communications.</p>
                <div v-for="(att, i) in ab.attendants" :key="i" class="p-4 bg-(--color-surface-container-low) rounded-xl">
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
                        @click="ab.setLead(i)">
                        <span class="material-symbols-outlined text-base">star</span>
                        Make Lead
                      </button>
                      <button type="button" :disabled="ab.attendants.length === 1"
                        class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                        @click="ab.removeAttendant(i)">
                        <span class="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full Name <span class="text-(--color-error)">*</span></label>
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
              </div>
              <button type="button"
                class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline mt-3"
                @click="ab.addAttendant()">
                <span class="material-symbols-outlined text-base">person_add</span> Add Guest
              </button>
            </div>
          </section>

          <!-- ─── Corporate: Delegates ─── -->
          <section v-if="ab.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
            <div class="flex items-stretch">
              <button type="button"
                class="flex items-center gap-2 flex-1 px-6 py-5 text-left hover:bg-(--color-surface-container-low) transition-colors min-w-0"
                @click="attendantsExpanded = !attendantsExpanded">
                <span class="material-symbols-outlined text-(--color-primary) shrink-0">groups</span>
                <div class="min-w-0 flex-1">
                  <h2 class="font-serif text-xl text-(--color-on-surface)">Delegates</h2>
                  <p v-if="!attendantsExpanded" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">
                    {{ ab.attendants.filter(a => a.fullName).length + ' delegate' + (ab.attendants.filter(a => a.fullName).length !== 1 ? 's' : '') + ' registered' }}
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0 mr-2">
                  <span v-if="!attendantsExpanded && ab.attendants.filter(a => a.fullName).length > 0"
                    class="px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
                    {{ ab.attendants.filter(a => a.fullName).length }}
                  </span>
                  <span class="material-symbols-outlined text-(--color-on-surface-variant) transition-transform duration-200"
                    :style="{ transform: attendantsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }">expand_more</span>
                </div>
              </button>
            </div>

            <div v-if="attendantsExpanded" class="px-6 pb-6 border-t border-(--color-outline-variant)">
              <div class="space-y-3 pt-4">
                <p v-if="errors.delegateRecords" class="font-sans text-sm text-(--color-error) font-semibold">{{ errors.delegateRecords }}</p>
                <p class="font-sans text-sm text-(--color-on-surface-variant) mb-4">Register each delegate. The lead contact receives all booking communications.</p>
                <div v-for="(att, i) in ab.attendants" :key="i" class="p-4 bg-(--color-surface-container-low) rounded-xl">
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
                        @click="ab.setLead(i)">
                        <span class="material-symbols-outlined text-base">star</span>
                        Make Lead
                      </button>
                      <button type="button" :disabled="ab.attendants.length === 1"
                        class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                        @click="ab.removeAttendant(i)">
                        <span class="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div class="flex flex-col gap-1">
                      <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full Name <span class="text-(--color-error)">*</span></label>
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
                      <input v-model="att.company" type="text" placeholder="e.g. Senior Engineer"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
              <button type="button"
                class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold hover:underline mt-3"
                @click="ab.addAttendant()">
                <span class="material-symbols-outlined text-base">person_add</span> Add Delegate
              </button>
            </div>
          </section>

          <!-- ─── Accommodation Details ─── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) overflow-hidden">
            <div class="flex items-center gap-3 px-6 py-5 border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-(--color-primary)">bed</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Accommodation Details</h2>
            </div>
            <div class="px-6 py-5 space-y-7">

              <!-- Date pickers -->
              <div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-in <span class="text-(--color-error)">*</span></label>
                    <input v-model="ab.checkIn" type="date" :min="today"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.checkIn ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors.checkIn" class="font-sans text-xs text-(--color-error)">{{ errors.checkIn }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-out <span class="text-(--color-error)">*</span></label>
                    <input v-model="ab.checkOut" type="date" :min="ab.checkIn || today"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.checkOut ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors.checkOut" class="font-sans text-xs text-(--color-error)">{{ errors.checkOut }}</span>
                  </div>
                </div>
                <div v-if="nights(ab.checkIn, ab.checkOut) > 0"
                  class="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--color-savannah-mist) border border-(--color-primary)">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">nights_stay</span>
                  <span class="font-sans text-xs font-semibold text-(--color-primary)">
                    {{ nights(ab.checkIn, ab.checkOut) }} night{{ nights(ab.checkIn, ab.checkOut) !== 1 ? 's' : '' }}
                    · {{ fmt(ab.checkIn) }} – {{ fmt(ab.checkOut) }}
                  </span>
                </div>
              </div>

              <!-- ══ INDIVIDUAL: Room assignments ══ -->
              <div v-if="!ab.isCorporate && ab.checkIn && ab.checkOut && ab.checkOut > ab.checkIn">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-(--color-primary)">meeting_room</span>
                    <h3 class="font-serif text-lg text-(--color-on-surface)">Room Selection</h3>
                  </div>
                  <button v-if="!roomsLoading" type="button"
                    class="flex items-center gap-1 font-sans text-xs font-semibold text-(--color-primary) hover:underline"
                    @click="fetchAvailableRooms">
                    <span class="material-symbols-outlined text-sm">refresh</span> Refresh
                  </button>
                </div>

                <!-- Loading -->
                <div v-if="roomsLoading" class="space-y-3">
                  <div class="h-16 rounded-xl bg-(--color-surface-container-low) animate-pulse"></div>
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

                <!-- Per-attendant room assignments -->
                <div v-else class="space-y-3">
                  <div v-for="(att, i) in ab.attendants" :key="i"
                    class="border rounded-xl overflow-hidden transition-all"
                    :class="expandedPickerIdx === i ? 'border-(--color-primary)' : 'border-(--color-outline-variant)'">
                    <div class="flex items-center justify-between gap-3 px-4 py-3 bg-(--color-surface-container)">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="inline-flex items-center justify-center w-7 h-7 rounded-full font-sans text-xs font-bold shrink-0"
                          :class="att.isLead ? 'bg-(--color-primary) text-white' : 'bg-(--color-surface-container-high) text-(--color-on-surface-variant)'">{{ i + 1 }}</span>
                        <div class="min-w-0">
                          <p class="font-sans text-sm font-semibold text-(--color-on-surface) truncate">{{ att.fullName || `Guest ${i + 1}` }}</p>
                          <p v-if="ab.getAttendantRoom(i)" class="font-sans text-xs text-(--color-primary)">{{ ab.getAttendantRoom(i).roomName }}</p>
                          <p v-else class="font-sans text-xs text-(--color-on-surface-variant)">No room selected</p>
                        </div>
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        <button v-if="ab.getAttendantRoom(i)" type="button" @click="ab.clearAttendantRoom(i)"
                          class="h-7 w-7 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors">
                          <span class="material-symbols-outlined text-sm">close</span>
                        </button>
                        <button type="button" @click="togglePicker(i)"
                          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-xs font-semibold transition-all"
                          :class="expandedPickerIdx === i
                            ? 'bg-(--color-surface-container-high) text-(--color-on-surface)'
                            : 'bg-(--color-primary) text-white hover:bg-(--color-clay-earth)'">
                          <span class="material-symbols-outlined text-sm">{{ expandedPickerIdx === i ? 'expand_less' : 'add' }}</span>
                          {{ expandedPickerIdx === i ? 'Close' : (ab.getAttendantRoom(i) ? 'Change' : 'Select Room') }}
                        </button>
                      </div>
                    </div>
                    <div v-if="expandedPickerIdx === i" class="p-4 bg-(--color-surface-container-low) border-t border-(--color-outline-variant)">
                      <div v-if="!availableRooms.length" class="py-8 text-center">
                        <span class="material-symbols-outlined text-3xl text-(--color-outline) mb-2 block opacity-40">bed_time</span>
                        <p class="font-sans text-sm text-(--color-on-surface-variant)">No rooms available for these dates</p>
                      </div>
                      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button v-for="room in availableRooms" :key="room.id" type="button"
                          class="group text-left rounded-xl border-2 transition-all overflow-hidden"
                          :class="ab.getAttendantRoom(i)?.roomId === room.id
                            ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                            : 'border-(--color-outline-variant) hover:border-(--color-primary) bg-(--color-surface-container-lowest)'"
                          @click="selectRoom(i, room)">
                          <div v-if="room.images?.[0]" class="w-full h-28 overflow-hidden">
                            <img :src="room.images[0]" :alt="room.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                          <div class="p-3">
                            <div class="flex items-start justify-between gap-2 mb-1">
                              <p class="font-sans text-sm font-semibold text-(--color-on-surface) leading-tight">{{ room.name }}</p>
                              <span v-if="ab.getAttendantRoom(i)?.roomId === room.id"
                                class="material-symbols-outlined text-base text-(--color-primary) shrink-0" style="font-variation-settings: 'FILL' 1">check_circle</span>
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
                </div>
              </div>

              <!-- ══ CORPORATE: Room preference ══ -->
              <div v-if="ab.isCorporate">
                <div class="flex items-start gap-3 p-4 rounded-xl bg-(--color-savannah-mist) border border-(--color-primary) mb-5">
                  <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0 mt-0.5">info</span>
                  <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed">The property team will confirm exact room assignments based on availability prior to your event. Specify your preference and required quantity below.</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Number of Rooms <span class="text-(--color-error)">*</span></label>
                    <input type="number" min="1" v-model.number="ab.roomCount"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.roomCount ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors.roomCount" class="font-sans text-xs text-(--color-error)">{{ errors.roomCount }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Room Type Preference</label>
                    <select v-model="ab.roomTypePreference"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors">
                      <option value="">No preference</option>
                      <option value="single">Single</option>
                      <option value="double">Double</option>
                      <option value="twin">Twin</option>
                      <option value="suite">Suite</option>
                    </select>
                  </div>
                </div>
                <!-- Reason for Booking -->
                <div class="flex flex-col gap-1 mt-5">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Reason for Booking <span class="text-(--color-error)">*</span></label>
                  <textarea v-model="ab.reasonForBooking" rows="2"
                    placeholder="e.g. Annual conference, board meeting, employee training, product launch…"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none transition-all resize-none border-2"
                    :class="errors.reasonForBooking ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'"></textarea>
                  <span v-if="errors.reasonForBooking" class="font-sans text-xs text-(--color-error)">{{ errors.reasonForBooking }}</span>
                </div>
              </div>

            </div>
          </section>

          <!-- ─── Approval Documents (corporate only) ─── -->
          <section v-if="ab.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl border overflow-hidden transition-colors"
            :class="errors.approvalDocs ? 'border-(--color-error)' : 'border-(--color-outline-variant)'">
            <div class="flex items-start gap-3 px-6 py-5 border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined mt-0.5" :class="errors.approvalDocs ? 'text-(--color-error)' : 'text-(--color-primary)'">attach_file</span>
              <div>
                <h2 class="font-serif text-xl text-(--color-on-surface)">
                  Supporting Documents
                  <span v-if="isZS" class="text-(--color-error)"> *</span>
                </h2>
                <p class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">
                  Attach any internal approval documents — LPOs, authorisation letters, budget approvals, or travel requests. Accepted: PDF, Word, JPG, PNG · Max 10 MB per file.
                </p>
                <p v-if="isZS && !approvalDocs.length" class="font-sans text-xs text-(--color-on-surface-variant) mt-1 flex items-center gap-1">
                  <span class="material-symbols-outlined text-[13px]">info</span>
                  Required for Zambia Sugar bookings.
                </p>
              </div>
            </div>

            <div class="px-6 py-5 space-y-4">
              <!-- Drop zone -->
              <label
                class="flex flex-col items-center justify-center gap-3 w-full rounded-xl border-2 border-dashed py-10 cursor-pointer transition-all"
                :class="errors.approvalDocs && !approvalDocs.length
                  ? 'border-(--color-error) bg-(--color-error-container)'
                  : docDragOver
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

              <!-- Attached files list -->
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
              <span v-if="errors.approvalDocs" class="font-sans text-xs text-(--color-error) text-center block">{{ errors.approvalDocs }}</span>
            </div>
          </section>

          <!-- ─── Notes ─── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-(--color-primary)">notes</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Additional Requests</h2>
            </div>
            <textarea v-model="ab.notes" rows="3" placeholder="Special requests, accessibility needs, floor preferences, early check-in requirements…"
              class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
          </section>



          <!-- Continue -->
          <div class="flex flex-col items-end gap-3 pt-2">
            <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
              <div v-if="errors.roomSelection"
                class="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-(--color-error-container) text-(--color-on-error-container)">
                <span class="material-symbols-outlined text-base shrink-0">bed</span>
                <p class="font-sans text-sm">{{ errors.roomSelection }}</p>
              </div>
            </Transition>
            <button type="button" @click="goToReview"
              class="flex items-center gap-2 px-8 py-3 rounded-full bg-(--color-primary) text-white font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors">
              Review Booking
              <span class="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>


        </template>

        <!-- ══════════════ STEP 2: REVIEW ════════════════════════════════ -->
        <template v-else>

          <!-- Submit error -->
          <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
            <div v-if="submitError" class="flex items-center gap-2 p-4 rounded-xl bg-(--color-error-container) text-(--color-on-error-container)">
              <span class="material-symbols-outlined text-base shrink-0">error</span>
              <p class="font-sans text-sm">{{ submitError }}</p>
            </div>
          </Transition>

          <!-- Booking type badge -->
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-sans text-xs font-semibold"
              :class="ab.isCorporate ? 'bg-(--color-primary) text-white' : 'bg-(--color-savannah-mist) text-(--color-primary) border border-(--color-primary)'">
              <span class="material-symbols-outlined text-sm">{{ ab.isCorporate ? 'corporate_fare' : 'person' }}</span>
              {{ ab.isCorporate ? 'Corporate Accommodation' : 'Individual Accommodation' }}
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
              <span class="material-symbols-outlined text-sm">bed</span>
              Accommodation Booking
            </span>
          </div>

          <!-- Booked By summary -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) p-6">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-4">{{ ab.isCorporate ? 'Booking Representative' : 'Booked By' }}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
              <div>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">Name</p>
                <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ ab.bookedBy.name || '—' }}</p>
              </div>
              <div>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">Email</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ ab.bookedBy.email || '—' }}</p>
              </div>
              <div>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">Phone</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ ab.bookedBy.phone || '—' }}</p>
              </div>
              <div v-if="ab.isCorporate">
                <p class="font-sans text-xs text-(--color-on-surface-variant)">Job Title</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ ab.bookedBy.jobTitle || '—' }}</p>
              </div>
              <div v-if="ab.isCorporate && ab.bookedBy.manNumber">
                <p class="font-sans text-xs text-(--color-on-surface-variant)">Employee / Man No.</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ ab.bookedBy.manNumber }}</p>
              </div>
            </div>
          </section>

          <!-- Individual guests detail -->
          <section v-if="!ab.isCorporate && ab.attendants.length"
            class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) p-6">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-4">Guests ({{ ab.attendants.length }})</p>
            <div>
              <div v-for="(att, i) in ab.attendants" :key="i"
                class="py-3 border-b border-(--color-outline-variant) last:border-0">
                <div class="flex items-center gap-3 mb-2">
                  <span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold font-sans"
                    :class="att.isLead ? 'bg-(--color-primary) text-white' : 'bg-(--color-surface-container-high) text-(--color-on-surface-variant)'">{{ i + 1 }}</span>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface) flex-1 truncate">{{ att.fullName }}</p>
                  <span v-if="att.isLead" class="font-sans text-xs text-(--color-primary) shrink-0">Lead</span>
                </div>
                <div class="pl-9 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                  <div v-if="att.email">
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">Email</p>
                    <p class="font-sans text-sm text-(--color-on-surface)">{{ att.email }}</p>
                  </div>
                  <div v-if="att.phone">
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">Phone</p>
                    <p class="font-sans text-sm text-(--color-on-surface)">{{ att.phone }}</p>
                  </div>
                  <div v-if="att.idNumber">
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">ID / Passport</p>
                    <p class="font-sans text-sm text-(--color-on-surface)">{{ att.idNumber }}</p>
                  </div>
                  <div v-if="att.dietaryNotes">
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">Dietary Notes</p>
                    <p class="font-sans text-sm text-(--color-on-surface)">{{ att.dietaryNotes }}</p>
                  </div>
                  <div v-if="ab.attendantRooms.find(r => r.attendantIdx === i)" class="sm:col-span-2">
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">Room</p>
                    <p class="font-sans text-sm text-(--color-on-surface)">
                      {{ ab.attendantRooms.find(r => r.attendantIdx === i).roomName }}
                      <span v-if="ab.attendantRooms.find(r => r.attendantIdx === i).rate" class="text-(--color-primary)">
                        · K {{ Number(ab.attendantRooms.find(r => r.attendantIdx === i).rate).toLocaleString() }}/night
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Corporate: Company summary -->
          <section v-if="ab.isCorporate" class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) p-6">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-4">Company</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
              <div class="sm:col-span-2">
                <p class="font-sans text-xs text-(--color-on-surface-variant)">Company Name</p>
                <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ ab.companyName || '—' }}</p>
              </div>
              <div v-if="ab.tpin">
                <p class="font-sans text-xs text-(--color-on-surface-variant)">TPIN</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ ab.tpin }}</p>
              </div>
              <div v-if="ab.departmentName">
                <p class="font-sans text-xs text-(--color-on-surface-variant)">Department</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ ab.departmentName }}</p>
              </div>
              <div v-if="ab.costCenter">
                <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ ab.costCenterType === 'internal_order' ? 'Internal Order No.' : 'Cost Centre' }}</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ ab.costCenter }}</p>
              </div>
              <div v-if="ab.glCode">
                <p class="font-sans text-xs text-(--color-on-surface-variant)">GL Code</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ ab.glCode }}</p>
              </div>
            </div>
            <div v-if="ab.approverName" class="mt-4 pt-4 border-t border-(--color-outline-variant)">
              <p class="font-sans text-xs text-(--color-on-surface-variant) mb-1">Approver</p>
              <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ ab.approverName }}
                <span v-if="ab.approverTitle" class="font-sans text-xs font-normal text-(--color-on-surface-variant)"> · {{ ab.approverTitle }}</span>
              </p>
              <p v-if="ab.approverEmail" class="font-sans text-sm text-(--color-on-surface)">{{ ab.approverEmail }}</p>
            </div>
          </section>

          <!-- Accommodation summary -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) p-6">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-4">Accommodation</p>
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">Check-in</p>
                <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ fmt(ab.checkIn) }}</p>
              </div>
              <div>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">Check-out</p>
                <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ fmt(ab.checkOut) }}</p>
              </div>
              <div>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">Duration</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ nights(ab.checkIn, ab.checkOut) }} night{{ nights(ab.checkIn, ab.checkOut) !== 1 ? 's' : '' }}</p>
              </div>
              <div v-if="ab.isCorporate">
                <p class="font-sans text-xs text-(--color-on-surface-variant)">Rooms Required</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ ab.roomCount }} room{{ ab.roomCount !== 1 ? 's' : '' }}
                  <span v-if="ab.roomTypePreference" class="capitalize"> · {{ ab.roomTypePreference }}</span>
                </p>
              </div>
            </div>
            <!-- Individual room assignments -->
            <div v-if="!ab.isCorporate && ab.attendantRooms.length" class="space-y-2 pt-4 border-t border-(--color-outline-variant)">
              <p class="font-sans text-xs font-semibold text-(--color-on-surface-variant)">Selected Rooms</p>
              <div v-for="(r, i) in ab.attendantRooms" :key="i" class="flex items-center justify-between py-2">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">bed</span>
                  <span class="font-sans text-sm text-(--color-on-surface)">{{ r.roomName }}</span>
                  <span v-if="r.roomType" class="px-1.5 py-0.5 rounded-full bg-(--color-surface-container) font-sans text-xs capitalize text-(--color-on-surface-variant)">{{ r.roomType }}</span>
                </div>
                <span v-if="r.rate" class="font-sans text-xs font-semibold text-(--color-primary)">K {{ Number(r.rate).toLocaleString() }}/night</span>
              </div>
            </div>
            <div v-if="ab.isCorporate && ab.reasonForBooking" class="mt-4 pt-4 border-t border-(--color-outline-variant)">
              <p class="font-sans text-xs text-(--color-on-surface-variant) mb-1">Reason for Booking</p>
              <p class="font-sans text-sm text-(--color-on-surface)">{{ ab.reasonForBooking }}</p>
            </div>
            <div v-if="ab.isCorporate" class="mt-3 p-3 rounded-lg bg-(--color-savannah-mist)">
              <p class="font-sans text-xs text-(--color-on-surface-variant)">Room assignments will be confirmed by the property team prior to arrival.</p>
            </div>
            <div v-if="ab.notes" class="mt-4 pt-4 border-t border-(--color-outline-variant)">
              <p class="font-sans text-xs text-(--color-on-surface-variant) mb-1">Additional Requests</p>
              <p class="font-sans text-sm text-(--color-on-surface)">{{ ab.notes }}</p>
            </div>
            <div v-if="ab.isCorporate && approvalDocs.length" class="mt-4 pt-4 border-t border-(--color-outline-variant)">
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
              <span class="material-symbols-outlined text-base" v-else>check</span>
              {{ uploading ? 'Uploading documents…' : loading ? 'Submitting…' : 'Confirm Booking' }}
            </button>
          </div>

          <!-- Download Invoice -->
          <PDFDownloadLink v-if="!success && invoiceSnapshot" :file-name="`Mwakwanda-Booking-${lodge?.name || 'Invoice'}.pdf`">
            <template #default>
              <BookingInvoiceDocument :booking="invoiceSnapshot" />
            </template>
            <template #label="{ blob }">
              <button type="button"
                class="w-full h-12 flex items-center justify-center gap-2 border border-(--color-primary) text-(--color-primary) rounded-lg font-sans text-sm font-semibold hover:bg-(--color-surface-container-low) transition-all">
                <span class="material-symbols-outlined text-base" :class="!blob ? 'animate-spin' : ''">
                  {{ !blob ? 'progress_activity' : 'download' }}
                </span>
                {{ !blob ? 'Generating…' : 'Download Invoice' }}
              </button>
            </template>
          </PDFDownloadLink>

        </template>
      </div>

      <!-- ── Summary sidebar ──────────────────────────────────────────────── -->
      <aside class="lg:col-span-4 lg:sticky lg:top-8 space-y-4">
        <div class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) p-5">
          <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) mb-4">Booking Summary</p>

          <!-- Property -->
          <div class="flex items-center gap-3 mb-4 pb-4 border-b border-(--color-outline-variant)">
            <span class="material-symbols-outlined text-(--color-primary)">villa</span>
            <div class="min-w-0">
              <p class="font-sans text-sm font-semibold text-(--color-on-surface) truncate">{{ lodge?.name ?? '—' }}</p>
              <p v-if="selectedBranch" class="font-sans text-xs text-(--color-on-surface-variant)">{{ selectedBranch.name }}</p>
            </div>
          </div>

          <!-- Context badge -->
          <div class="flex items-center gap-2 mb-4">
            <span class="material-symbols-outlined text-sm" :class="ab.isCorporate ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">
              {{ ab.isCorporate ? 'corporate_fare' : 'person' }}
            </span>
            <span class="font-sans text-sm text-(--color-on-surface)">{{ ab.isCorporate ? 'Corporate Booking' : 'Individual Booking' }}</span>
          </div>

          <!-- Dates -->
          <div v-if="ab.checkIn || ab.checkOut" class="space-y-2 mb-4 pb-4 border-b border-(--color-outline-variant)">
            <div class="flex justify-between items-center">
              <span class="font-sans text-xs text-(--color-on-surface-variant)">Check-in</span>
              <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ fmt(ab.checkIn) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="font-sans text-xs text-(--color-on-surface-variant)">Check-out</span>
              <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ fmt(ab.checkOut) }}</span>
            </div>
            <div v-if="nights(ab.checkIn, ab.checkOut) > 0" class="flex justify-between items-center">
              <span class="font-sans text-xs text-(--color-on-surface-variant)">Duration</span>
              <span class="font-sans text-sm text-(--color-primary) font-semibold">{{ nights(ab.checkIn, ab.checkOut) }} night{{ nights(ab.checkIn, ab.checkOut) !== 1 ? 's' : '' }}</span>
            </div>
          </div>
          <div v-else class="mb-4 pb-4 border-b border-(--color-outline-variant)">
            <p class="font-sans text-sm text-(--color-outline) italic">No dates selected yet</p>
          </div>

          <!-- Room summary: individual -->
          <div v-if="!ab.isCorporate">
            <p class="font-sans text-xs font-semibold text-(--color-on-surface-variant) mb-2">
              {{ ab.attendantRooms.length > 0 ? 'Selected Rooms' : 'No rooms selected yet' }}
            </p>
            <div v-for="(r, i) in ab.attendantRooms" :key="i" class="flex items-center gap-2 py-1.5">
              <span class="material-symbols-outlined text-sm text-(--color-primary)">bed</span>
              <div class="min-w-0 flex-1">
                <p class="font-sans text-xs font-semibold text-(--color-on-surface) truncate">{{ r.roomName }}</p>
                <p v-if="r.rate" class="font-sans text-xs text-(--color-primary)">K {{ Number(r.rate).toLocaleString() }}/night</p>
              </div>
            </div>
            <div v-if="ab.attendantRooms.some(r => r.rate) && nights(ab.checkIn, ab.checkOut) > 0"
              class="mt-3 pt-3 border-t border-(--color-outline-variant) space-y-1.5">
              <div v-for="(r, i) in ab.attendantRooms.filter(r => r.rate)" :key="i"
                class="flex items-baseline justify-between gap-2">
                <span class="font-sans text-xs text-(--color-on-surface-variant) truncate">{{ r.roomName }}</span>
                <span class="font-sans text-xs text-(--color-on-surface-variant) shrink-0">
                  K {{ Number(r.rate).toLocaleString() }} × {{ nights(ab.checkIn, ab.checkOut) }}
                </span>
              </div>
              <div class="flex items-baseline justify-between gap-2 pt-1.5 border-t border-(--color-outline-variant)">
                <span class="font-sans text-xs font-semibold text-(--color-on-surface)">Est. Total</span>
                <span class="font-sans text-sm font-semibold text-(--color-primary)">
                  K {{ (ab.attendantRooms.reduce((s, r) => s + (Number(r.rate) || 0), 0) * nights(ab.checkIn, ab.checkOut)).toLocaleString() }}
                </span>
              </div>
            </div>
          </div>

          <!-- Room summary: corporate -->
          <div v-else>
            <div class="flex justify-between items-center">
              <span class="font-sans text-xs text-(--color-on-surface-variant)">Delegates</span>
              <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ ab.attendants.length }}</span>
            </div>
            <div v-if="ab.roomTypePreference" class="flex justify-between items-center mt-1">
              <span class="font-sans text-xs text-(--color-on-surface-variant)">Type preference</span>
              <span class="font-sans text-sm text-(--color-on-surface) capitalize">{{ ab.roomTypePreference }}</span>
            </div>
            <div class="mt-3 pt-3 border-t border-(--color-outline-variant) flex justify-between items-center">
              <span class="font-sans text-xs text-(--color-on-surface-variant)">Est. Cost</span>
              <span class="font-sans text-sm text-(--color-on-surface-variant) italic">Quoted on confirmation</span>
            </div>
          </div>
        </div>
      </aside>

    </div>
  </div>
</template>

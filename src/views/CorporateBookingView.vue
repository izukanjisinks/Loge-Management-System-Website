<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLodgesStore } from '@/stores/lodges'
import { useAuthStore } from '@/stores/auth'
import { useCorporateBookingStore } from '@/stores/corporateBooking'
import { uploadBookingDocument } from '@/services/storage'
import api from '@/lib/api'

const route = useRoute()
const router = useRouter()
const lodgesStore = useLodgesStore()
const auth = useAuthStore()
const cb = useCorporateBookingStore()

const lodgeId = route.params.id
const lodge = computed(() => lodgesStore.lodges.find(l => String(l.id) === String(lodgeId)))
const branches = computed(() => lodgesStore.branchesFor(lodgeId))
const selectedBranch = computed(() => branches.value.find(b => String(b.id) === String(cb.branchId)) ?? null)

// Branch service capabilities — default true when no branch selected or field absent
const branchHasRestaurant = computed(() => selectedBranch.value?.restaurant ?? true)
const branchHasConference = computed(() => selectedBranch.value?.conference ?? true)

const step = ref(1)
const activeTab = ref('accommodation')
const loading = ref(false)
const success = ref(false)
const errors = ref({})
const submitError = ref('')

// ── Document upload ──────────────────────────────────────────────────────
const accomDocFiles = ref([])
const mealsDocFiles = ref([])
const confDocFiles = ref([])

function pickDocsFor(bucket) {
  return async (e) => {
    const arr = bucket?.value ?? bucket
    const allowed = ['application/pdf', 'image/jpeg', 'image/png']
    const maxMb = 5
    const toUpload = []
    Array.from(e.target.files).forEach(f => {
      if (!allowed.includes(f.type)) { arr.push({ name: f.name, error: 'Only PDF, JPG, PNG allowed' }); return }
      if (f.size > maxMb * 1024 * 1024) { arr.push({ name: f.name, error: `Max ${maxMb}MB` }); return }
      arr.push({ file: f, name: f.name, progress: 0, url: null, error: null })
      toUpload.push(arr[arr.length - 1])
    })
    e.target.value = ''
    await Promise.all(toUpload.map(async entry => {
      try { entry.url = await uploadBookingDocument(entry.file, p => { entry.progress = p }) }
      catch { entry.error = 'Upload failed' }
    }))
  }
}

function removeDocFrom(bucket, i) {
  const arr = bucket?.value ?? bucket
  arr.splice(i, 1)
}


async function uploadBucket(bucket) {
  const pending = bucket.value.filter(d => d.file && !d.url && !d.error)
  if (!pending.length) return null
  await Promise.all(pending.map(async d => {
    try { d.url = await uploadBookingDocument(d.file, p => { d.progress = p }) }
    catch { d.error = 'Upload failed' }
  }))
  const failed = bucket.value.filter(d => d.file && d.error)
  return failed.length ? `${failed.length} document(s) failed to upload. Remove them and try again.` : null
}

// ── Branch menu ─────────────────────────────────────────────────────────
const menu = ref([])   // [{ id, name, category, price, description }]
const menuLoading = ref(false)

async function fetchMenu(branchId) {
  menuLoading.value = true
  try {
    const params = { org_id: lodgeId }
    if (branchId) params.branch_id = branchId
    const { data } = await api.get('/guest/menu', { params })
    menu.value = (data.items?.data ?? [])
      .filter(item => item.is_available)
      .map(item => ({
        id: item.id,
        name: item.name,
        category: item.category || '',
        price: parseFloat(item.price) || 0,
        description: item.description || '',
      }))
  } catch {
    menu.value = []
  } finally {
    menuLoading.value = false
  }
}

// Grouped menu for the select: [{ category, items }]
const menuByCategory = computed(() => {
  const groups = {}
  menu.value.forEach(item => {
    const cat = item.category || 'Other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(item)
  })
  return Object.entries(groups).map(([category, items]) => ({ category, items }))
})

// Per-guest staging: { [guestIndex]: { menuItemId: '', quantity: 1 } }
const mealItemStaging = ref({})

function getMealStaging(i) {
  if (!mealItemStaging.value[i]) mealItemStaging.value[i] = { menuItemId: '', quantity: 1 }
  return mealItemStaging.value[i]
}

function addMealItem(guest, i) {
  const draft = getMealStaging(i)
  if (!draft.menuItemId) return
  const item = menu.value.find(m => m.id === draft.menuItemId)
  if (!item) return
  const existing = guest.mealItems.find(x => x.menuItemId === item.id)
  if (existing) { existing.quantity += draft.quantity }
  else guest.mealItems.push({ menuItemId: item.id, name: item.name, quantity: draft.quantity, price: item.price })
  mealItemStaging.value[i] = { menuItemId: '', quantity: 1 }
}

function removeMealItem(guest, j) { guest.mealItems.splice(j, 1) }

// ── Constants ────────────────────────────────────────────────────────────
const ALL_TABS = [
  { key: 'accommodation', label: 'Accommodation', icon: 'bed', description: 'Room bookings for employees and corporate guests' },
  { key: 'meals', label: 'Meals', icon: 'restaurant', description: 'Catered dining for teams, clients, and events' },
  { key: 'conference', label: 'Conference Room', icon: 'meeting_room', description: 'Meeting and conference room reservations' },
]
const TABS = computed(() => ALL_TABS.filter(t => {
  if (t.key === 'meals') return branchHasRestaurant.value
  if (t.key === 'conference') return branchHasConference.value
  return true
}))
const MEAL_PLANS = [
  { value: 'breakfast', label: 'Breakfast Only' },
  { value: 'lunch', label: 'Lunch Only' },
  { value: 'dinner', label: 'Dinner Only' },
  { value: 'half_board', label: 'Half Board (B&D)' },
  { value: 'full_board', label: 'Full Board (B, L & D)' },
]
const EQUIPMENT = ['Projector', 'Whiteboard', 'PA System', 'Video Conferencing', 'Screen', 'Flipchart']

onMounted(async () => {
  await lodgesStore.fetchLodges()
  lodgesStore.fetchLodgeDetail(lodgeId)
  if (lodge.value) cb.setLodge(lodgeId, lodge.value.name)
  if (route.query.branchId && !cb.branchId) cb.branchId = route.query.branchId
  cb.accommodation.enabled = false
  cb.meals.enabled = false
  cb.conference.enabled = false
  fetchMenu(cb.branchId)
  if (auth.user) {
    if (!cb.company.contactPerson && auth.user.firstName)
      cb.company.contactPerson = `${auth.user.firstName} ${auth.user.lastName ?? ''}`.trim()
    if (!cb.company.email && auth.user.email)
      cb.company.email = auth.user.email
  }
})

function selectService(key) {
  activeTab.value = key
  cb.accommodation.enabled = key === 'accommodation'
  cb.meals.enabled = key === 'meals'
  cb.conference.enabled = key === 'conference'
}

// ── Validation ───────────────────────────────────────────────────────────
function validate() {
  const e = {}
  const c = cb.company
  if (!c.name) e.companyName = 'Required'
  if (!c.regNumber) e.regNumber = 'Required'
  if (!c.contactPerson) e.contactPerson = 'Required'
  if (!c.email) e.email = 'Required'
  else if (!/\S+@\S+\.\S+/.test(c.email)) e.email = 'Enter a valid email'
  if (!c.phone) e.phone = 'Required'

  if (!activeTab.value) e.service = 'Please select a booking type above to continue'

  if (branches.value.length > 1 && !cb.branchId) e.branchId = 'A specific branch must be selected for corporate bookings'

  const a = cb.accommodation
  if (a.enabled) {
    a.guests.forEach((g, i) => {
      if (!g.fullName) e[`guest_${i}_name`] = 'Required'
      if (!g.idNumber) e[`guest_${i}_idNumber`] = 'Required'
      if (!g.checkIn) e[`guest_${i}_checkIn`] = 'Required'
      if (!g.checkOut) e[`guest_${i}_checkOut`] = 'Required'
    })
    if (!a.authoriser.name) e.authoriserName = 'Required'
    if (!a.authoriser.email) e.authoriserEmail = 'Required'
    else if (!/\S+@\S+\.\S+/.test(a.authoriser.email)) e.authoriserEmail = 'Enter a valid email'
    if (!a.costCenter) e.costCenter = 'Required'
  }

  const m = cb.meals
  if (m.enabled) {
    m.guests.forEach((g, i) => {
      if (!g.fullName) e[`mealsGuest_${i}_name`] = 'Required'
      if (!g.idNumber) e[`mealsGuest_${i}_idNumber`] = 'Required'
    })
    if (!m.authoriser.name) e.mealsAuthoriserName = 'Required'
    if (!m.authoriser.email) e.mealsAuthoriserEmail = 'Required'
    else if (!/\S+@\S+\.\S+/.test(m.authoriser.email)) e.mealsAuthoriserEmail = 'Enter a valid email'
    if (!m.costCenter) e.mealsCostCenter = 'Required'
  }

  const conf = cb.conference
  if (conf.enabled) {
    if (!conf.date) e.confDate = 'Required'
    if (!conf.startTime) e.confStartTime = 'Required'
    if (!conf.endTime) e.confEndTime = 'Required'
    conf.guests.forEach((g, i) => {
      if (!g.fullName) e[`confGuest_${i}_name`] = 'Required'
      if (!g.idNumber) e[`confGuest_${i}_idNumber`] = 'Required'
    })
    if (!conf.authoriser.name) e.confAuthoriserName = 'Required'
    if (!conf.authoriser.email) e.confAuthoriserEmail = 'Required'
    else if (!/\S+@\S+\.\S+/.test(conf.authoriser.email)) e.confAuthoriserEmail = 'Enter a valid email'
    if (!conf.costCenter) e.confCostCenter = 'Required'
  }

  errors.value = e
  return Object.keys(e).length === 0
}

function goToConfirm() {
  if (!validate()) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  step.value = 2
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function submit() {
  loading.value = true
  submitError.value = ''
  try {
    if (cb.accommodation.enabled && accomDocFiles.value.some(d => d.file && !d.url)) {
      const err = await uploadBucket(accomDocFiles)
      if (err) { submitError.value = err; return }
      cb.accommodation.documents = accomDocFiles.value.filter(d => d.url).map(d => d.url)
    }
    if (cb.meals.enabled && mealsDocFiles.value.some(d => d.file && !d.url)) {
      const err = await uploadBucket(mealsDocFiles)
      if (err) { submitError.value = err; return }
      cb.meals.documents = mealsDocFiles.value.filter(d => d.url).map(d => d.url)
    }
    if (cb.conference.enabled && confDocFiles.value.some(d => d.file && !d.url)) {
      const err = await uploadBucket(confDocFiles)
      if (err) { submitError.value = err; return }
      cb.conference.documents = confDocFiles.value.filter(d => d.url).map(d => d.url)
    }
    await cb.submit()
    success.value = true
    cb.reset()
    accomDocFiles.value = []
    mealsDocFiles.value = []
    confDocFiles.value = []
    setTimeout(() => router.push({ name: 'bookings' }), 2500)
  } catch (e) {
    submitError.value = e.response?.data?.error?.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

watch(() => cb.branchId, (id) => fetchMenu(id))

watch([branchHasRestaurant, branchHasConference], ([hasRestaurant, hasConference]) => {
  if (activeTab.value === 'meals' && !hasRestaurant) selectService('')
  if (activeTab.value === 'conference' && !hasConference) selectService('')
})

function goBack() {
  if (step.value === 2) { step.value = 1; return }
  router.push({ name: 'lodge-detail', params: { id: lodgeId } })
}

function toggleEquipment(item) {
  const list = cb.conference.equipment
  const idx = list.indexOf(item)
  if (idx === -1) list.push(item)
  else list.splice(idx, 1)
}

const stepDefs = computed(() => [
  { label: 'Services', active: step.value === 1 },
  { label: 'Confirm', active: step.value === 2 },
])

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function guestNights(g) {
  if (!g.checkIn || !g.checkOut) return 0
  return Math.max(0, Math.floor((new Date(g.checkOut) - new Date(g.checkIn)) / 86400000))
}
</script>

<template>
  <!-- Success overlay -->
  <Transition enter-active-class="transition duration-500" enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100">
    <div v-if="success" class="fixed inset-0 z-50 bg-(--color-background) flex items-center justify-center px-5">
      <div class="text-center max-w-sm">
        <span class="material-symbols-outlined text-6xl text-(--color-primary) mb-6 block"
          style="font-variation-settings: 'FILL' 1">check_circle</span>
        <h2 class="font-serif text-3xl text-(--color-on-surface) mb-3">Booking Submitted</h2>
        <p class="font-sans text-base text-(--color-on-surface-variant) leading-relaxed">Your corporate booking request
          has been received. Redirecting to your bookings…</p>
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
      <h1 class="font-serif text-3xl font-semibold text-(--color-on-surface)">Corporate Booking</h1>
      <div class="flex items-center gap-3 flex-wrap mt-1">
        <p v-if="lodge" class="font-sans text-sm text-(--color-on-surface-variant)">{{ lodge.name }}</p>
        <span v-if="selectedBranch"
          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs font-semibold text-(--color-primary)">
          <span class="material-symbols-outlined text-sm">location_on</span>
          {{ selectedBranch.name }}
        </span>
        <span v-else-if="branches.length > 1"
          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-(--color-surface-container-high) font-sans text-xs text-(--color-on-surface-variant)">
          <span class="material-symbols-outlined text-sm">location_off</span>
          All branches
        </span>
      </div>
    </div>

    <!-- Stepper -->
    <nav class="flex items-center gap-4 mb-8">
      <div v-for="(s, i) in stepDefs" :key="s.label" class="flex items-center gap-4">
        <div class="flex items-center gap-2"
          :class="s.active ? 'text-(--color-primary)' : step > i + 1 ? 'text-(--color-primary)' : 'text-(--color-outline)'">
          <span v-if="step > i + 1" class="material-symbols-outlined"
            style="font-variation-settings: 'FILL' 1">check_circle</span>
          <span v-else class="material-symbols-outlined">{{ s.active ? 'radio_button_checked' : 'radio_button_unchecked'
            }}</span>
          <span class="font-sans text-sm font-semibold">{{ s.label }}</span>
        </div>
        <div v-if="i < stepDefs.length - 1" class="h-px w-10 bg-(--color-outline-variant)"></div>
      </div>
    </nav>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      <!-- ── Left ──────────────────────────────────────────────────── -->
      <div class="lg:col-span-8 space-y-6">

        <!-- ══ STEP 1 ══ -->
        <template v-if="step === 1">

          <!-- ── Service Selection ──────────────────────────────────── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <h2 class="font-serif text-xl text-(--color-on-surface)">What would you like to book?</h2>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1 mb-5">Select one service per request. Each corporate booking is submitted separately.</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button v-for="tab in TABS" :key="tab.key" type="button"
                class="relative flex flex-col gap-3 p-5 rounded-xl border-2 text-left transition-all"
                :class="activeTab === tab.key
                  ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                  : 'border-(--color-outline-variant) bg-(--color-surface-container-low) hover:border-(--color-primary) hover:bg-(--color-surface-container)'"
                @click="selectService(tab.key)">
                <span v-if="activeTab === tab.key"
                  class="absolute top-3 right-3 material-symbols-outlined text-lg text-(--color-primary)"
                  style="font-variation-settings: 'FILL' 1">check_circle</span>
                <span class="material-symbols-outlined text-3xl transition-colors"
                  :class="activeTab === tab.key ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'">{{ tab.icon }}</span>
                <div>
                  <p class="font-sans text-sm font-semibold"
                    :class="activeTab === tab.key ? 'text-(--color-primary)' : 'text-(--color-on-surface)'">{{ tab.label }}</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant) mt-1 leading-relaxed">{{ tab.description }}</p>
                </div>
              </button>
            </div>
            <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
              <div v-if="errors.service"
                class="mt-4 flex items-center gap-2 p-3 rounded-lg bg-(--color-error-container) text-(--color-on-error-container)">
                <span class="material-symbols-outlined text-base shrink-0">error</span>
                <p class="font-sans text-sm">{{ errors.service }}</p>
              </div>
            </Transition>
          </section>

          <!-- ── Company Details (always visible below tabs) ─────────── -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center gap-2 mb-6">
              <span class="material-symbols-outlined text-(--color-primary)">business</span>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Company Details</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="flex flex-col gap-1">
                <label
                  class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Company
                  Name <span class="text-(--color-error)">*</span></label>
                <input v-model="cb.company.name" type="text" placeholder="Acme Corporation Ltd"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.companyName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.companyName" class="font-sans text-xs text-(--color-error)">{{ errors.companyName
                  }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label
                  class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">TPIN
                  <span class="text-(--color-error)">*</span></label>
                <input v-model="cb.company.regNumber" type="text" placeholder="e.g. 1234567890"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.regNumber ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.regNumber" class="font-sans text-xs text-(--color-error)">{{ errors.regNumber
                  }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label
                  class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Contact
                  Person <span class="text-(--color-error)">*</span></label>
                <input v-model="cb.company.contactPerson" type="text" placeholder="Jane Smith"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.contactPerson ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.contactPerson" class="font-sans text-xs text-(--color-error)">{{ errors.contactPerson
                  }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label
                  class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Work
                  Email <span class="text-(--color-error)">*</span></label>
                <input v-model="cb.company.email" type="email" placeholder="j.smith@acme.com"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.email ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.email" class="font-sans text-xs text-(--color-error)">{{ errors.email }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label
                  class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Phone
                  <span class="text-(--color-error)">*</span></label>
                <input v-model="cb.company.phone" type="tel" placeholder="+260 97 000 0000"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                  :class="errors.phone ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                <span v-if="errors.phone" class="font-sans text-xs text-(--color-error)">{{ errors.phone }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <label
                  class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Industry</label>
                <input v-model="cb.company.industry" type="text" placeholder="e.g. Mining, Tourism"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
              <div class="flex flex-col gap-1 md:col-span-2">
                <label
                  class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Street
                  Address</label>
                <input v-model="cb.company.address" type="text" placeholder="e.g. 5740 Cairo Road"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
              <div class="flex flex-col gap-1">
                <label
                  class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">City</label>
                <input v-model="cb.company.city" type="text" placeholder="e.g. Lusaka"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
              <div class="flex flex-col gap-1">
                <label
                  class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Country</label>
                <input v-model="cb.company.country" type="text" placeholder="e.g. Zambia"
                  class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
              </div>
              <!-- Branch error (shown when navigated here without a required branch) -->
              <div v-if="errors.branchId"
                class="md:col-span-2 flex items-center gap-2 p-3 rounded-lg bg-(--color-error-container) text-(--color-on-error-container)">
                <span class="material-symbols-outlined text-base shrink-0">warning</span>
                <p class="font-sans text-sm">{{ errors.branchId }}</p>
              </div>
            </div>
          </section>

          <!-- ══ ACCOMMODATION ══ -->
          <div v-if="activeTab === 'accommodation'" class="space-y-6">

            <!-- Reason for Booking -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-5">
                <span class="material-symbols-outlined text-(--color-primary)">description</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Reason for Booking</h2>
              </div>
              <textarea v-model="cb.accommodation.reasonForBooking" rows="3"
                placeholder="e.g. Annual conference, team training, client visit, site visit..."
                class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
            </section>

            <!-- Room Preference -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-5">
                <span class="material-symbols-outlined text-(--color-primary)">bed</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Room Preference</h2>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Room
                    Type</label>
                  <select v-model="cb.accommodation.roomType"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                    <option value="">Any</option>
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="twin">Twin</option>
                    <option value="suite">Suite</option>
                    <option value="family">Family</option>
                  </select>
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Number
                    of Rooms</label>
                  <input v-model.number="cb.accommodation.roomCount" type="number" min="1"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
              </div>
            </section>

            <!-- Employee Guest List -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-(--color-primary)">groups</span>
                  <h2 class="font-serif text-xl text-(--color-on-surface)">Employee Guest List</h2>
                </div>
                <button type="button"
                  class="flex items-center gap-1 text-(--color-primary) font-sans text-sm font-semibold hover:underline"
                  @click="cb.addGuest()">
                  <span class="material-symbols-outlined text-base">add</span> Add Employee
                </button>
              </div>

              <div class="space-y-4">
                <div v-for="(guest, i) in cb.accommodation.guests" :key="i"
                  class="p-4 bg-(--color-surface-container-low) rounded-lg space-y-4">

                  <!-- Row 1: name, email, id, delete -->
                  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div class="flex flex-col gap-1">
                      <label
                        class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full
                        Name <span class="text-(--color-error)">*</span></label>
                      <input v-model="guest.fullName" type="text"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                        :class="errors[`guest_${i}_name`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                      <span v-if="errors[`guest_${i}_name`]" class="font-sans text-xs text-(--color-error)">{{
                        errors[`guest_${i}_name`] }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label
                        class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email</label>
                      <input v-model="guest.email" type="email"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                    </div>
                    <div class="flex flex-col gap-1">
                      <label
                        class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Passport
                        / ID <span class="text-(--color-error)">*</span></label>
                      <input v-model="guest.idNumber" type="text"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                        :class="errors[`guest_${i}_idNumber`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                      <span v-if="errors[`guest_${i}_idNumber`]" class="font-sans text-xs text-(--color-error)">{{
                        errors[`guest_${i}_idNumber`] }}</span>
                    </div>
                    <button type="button"
                      class="h-10 w-10 flex items-center justify-center text-(--color-outline) hover:text-(--color-error) transition-colors disabled:opacity-30 ml-auto"
                      :disabled="cb.accommodation.guests.length === 1" @click="cb.removeGuest(i)">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>

                  <!-- Row 2: check-in, check-out -->
                  <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                      <label
                        class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-in
                        <span class="text-(--color-error)">*</span></label>
                      <input v-model="guest.checkIn" type="date"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                        :class="errors[`guest_${i}_checkIn`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                      <span v-if="errors[`guest_${i}_checkIn`]" class="font-sans text-xs text-(--color-error)">{{
                        errors[`guest_${i}_checkIn`] }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label
                        class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-out
                        <span class="text-(--color-error)">*</span></label>
                      <input v-model="guest.checkOut" type="date"
                        class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                        :class="errors[`guest_${i}_checkOut`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                      <span v-if="errors[`guest_${i}_checkOut`]" class="font-sans text-xs text-(--color-error)">{{
                        errors[`guest_${i}_checkOut`] }}</span>
                    </div>
                  </div>

                </div>
              </div>
            </section>

            <!-- Authoriser Details -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-6">
                <span class="material-symbols-outlined text-(--color-primary)">approval</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Authoriser Details</h2>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Authoriser
                    Name <span class="text-(--color-error)">*</span></label>
                  <input v-model="cb.accommodation.authoriser.name" type="text" placeholder="John Phiri"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.authoriserName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.authoriserName" class="font-sans text-xs text-(--color-error)">{{
                    errors.authoriserName
                  }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Title
                    / Position</label>
                  <input v-model="cb.accommodation.authoriser.title" type="text" placeholder="e.g. HOD"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Authoriser
                    Email <span class="text-(--color-error)">*</span></label>
                  <input v-model="cb.accommodation.authoriser.email" type="email" placeholder="j.phiri@acme.com"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.authoriserEmail ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.authoriserEmail" class="font-sans text-xs text-(--color-error)">{{
                    errors.authoriserEmail }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Authoriser
                    Phone</label>
                  <input v-model="cb.accommodation.authoriser.phone" type="tel" placeholder="+260 97 000 0000"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Department</label>
                  <input v-model="cb.accommodation.authoriser.department" type="text"
                    placeholder="e.g. Finance, HR, Operations"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Cost
                    Center <span class="text-(--color-error)">*</span></label>
                  <input v-model="cb.accommodation.costCenter" type="text" placeholder="e.g. 12345678"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.costCenter ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.costCenter" class="font-sans text-xs text-(--color-error)">{{ errors.costCenter
                    }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">GL
                    Code</label>
                  <input v-model="cb.accommodation.authoriser.glCode" type="text" placeholder="e.g. 12345678"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
              </div>
            </section>

            <!-- Supporting Documents -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-6">
                <span class="material-symbols-outlined text-(--color-primary)">attach_file</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Supporting Documents</h2>
              </div>
              <label
                class="block border-2 border-dashed border-(--color-outline-variant) rounded-xl p-8 text-center hover:bg-(--color-surface-container-low) transition-colors cursor-pointer group">
                <input type="file" class="hidden" multiple accept=".pdf,.jpg,.jpeg,.png" @change="pickDocsFor(accomDocFiles)($event)" />
                <span
                  class="material-symbols-outlined text-4xl text-(--color-outline) mb-2 block group-hover:text-(--color-primary) transition-colors">upload_file</span>
                <p class="font-sans text-sm font-semibold text-(--color-on-surface-variant)">Click to upload or drag
                  &amp; drop</p>
                <p class="font-sans text-xs text-(--color-outline) mt-1 uppercase tracking-widest">Attach any internally
                  signed and approved documentation supporting this booking</p>
                <p class="font-sans text-xs text-(--color-outline) mt-1 uppercase tracking-widest">Max 5MB · PDF, JPG,
                  PNG</p>
              </label>
              <div v-if="accomDocFiles.length" class="mt-4 space-y-3">
                <div v-for="(doc, i) in accomDocFiles" :key="i"
                  class="flex items-center gap-3 p-3 bg-(--color-surface-container-low) rounded-lg">
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
                      <div class="h-full bg-(--color-primary) transition-all duration-300 rounded-full"
                        :style="{ width: doc.progress + '%' }"></div>
                    </div>
                  </div>
                  <button type="button"
                    class="text-(--color-outline) hover:text-(--color-error) transition-colors shrink-0"
                    @click="removeDocFrom(accomDocFiles, i)">
                    <span class="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              </div>
            </section>

            <!-- Additional Requests -->
            <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-5">
                <span class="material-symbols-outlined text-(--color-primary)">notes</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Additional Requests</h2>
              </div>
              <textarea v-model="cb.accommodation.notes" rows="4"
                placeholder="Dietary requirements, preferred arrival time, accessibility needs, or special occasions"
                class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
              <p class="font-sans text-xs text-(--color-on-surface-variant) mt-2">We do our best to honour every
                request, though they cannot be guaranteed.</p>
            </section>

          </div>

          <!-- ══ MEALS ══ -->
          <div v-if="activeTab === 'meals'" class="space-y-6">

            <!-- Reason for Booking -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-5">
                <span class="material-symbols-outlined text-(--color-primary)">description</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Reason for Booking</h2>
              </div>
              <textarea v-model="cb.meals.reasonForBooking" rows="3"
                placeholder="e.g. Team retreat, client dinner, training lunch..."
                class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
            </section>

            <!-- Meal Details -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-5">
                <span class="material-symbols-outlined text-(--color-primary)">restaurant</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Meal Details</h2>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Meal
                    Plan</label>
                  <select v-model="cb.meals.planType"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                    <option v-for="p in MEAL_PLANS" :key="p.value" :value="p.value">{{ p.label }}</option>
                  </select>
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Number
                    of Guests</label>
                  <input v-model.number="cb.meals.pax" type="number" min="1"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">From
                    Date</label>
                  <input v-model="cb.meals.checkIn" type="date"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">To
                    Date</label>
                  <input v-model="cb.meals.checkOut" type="date"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1 md:col-span-2">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Dietary
                    Requirements</label>
                  <textarea v-model="cb.meals.dietaryNotes" rows="2" placeholder="Vegetarian, halal, allergies, etc."
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors resize-none"></textarea>
                </div>
              </div>
            </section>

            <!-- Attendee List -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-(--color-primary)">groups</span>
                  <h2 class="font-serif text-xl text-(--color-on-surface)">Attendee List</h2>
                </div>
                <button type="button"
                  class="flex items-center gap-1 text-(--color-primary) font-sans text-sm font-semibold hover:underline"
                  @click="cb.addMealsGuest()">
                  <span class="material-symbols-outlined text-base">add</span> Add Attendee
                </button>
              </div>
              <div class="space-y-3">
                <div v-for="(guest, i) in cb.meals.guests" :key="i"
                  class="border border-(--color-outline-variant) rounded-xl overflow-hidden">

                  <!-- Attendee header -->
                  <div class="flex items-center justify-between px-4 py-3 bg-(--color-surface-container)">
                    <div class="flex items-center gap-3">
                      <span
                        class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-(--color-primary) text-white font-sans text-xs font-bold shrink-0">
                        {{ i + 1 }}
                      </span>
                      <span class="font-sans text-sm font-semibold text-(--color-on-surface)">
                        {{ guest.fullName || `Attendee ${i + 1}` }}
                      </span>
                    </div>
                    <button type="button" :disabled="cb.meals.guests.length === 1"
                      class="h-8 w-8 flex items-center justify-center rounded-lg text-(--color-outline) hover:text-(--color-error) hover:bg-(--color-error-container) transition-colors disabled:opacity-30"
                      @click="cb.removeMealsGuest(i)">
                      <span class="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>

                  <!-- Attendee fields -->
                  <div class="p-4 bg-(--color-surface-container-low) space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div class="flex flex-col gap-1">
                        <label
                          class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full
                          Name <span class="text-(--color-error)">*</span></label>
                        <input v-model="guest.fullName" type="text"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                          :class="errors[`mealsGuest_${i}_name`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                        <span v-if="errors[`mealsGuest_${i}_name`]" class="font-sans text-xs text-(--color-error)">{{
                          errors[`mealsGuest_${i}_name`] }}</span>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label
                          class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email</label>
                        <input v-model="guest.email" type="email"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                      </div>
                      <div class="flex flex-col gap-1">
                        <label
                          class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Passport
                          / ID <span class="text-(--color-error)">*</span></label>
                        <input v-model="guest.idNumber" type="text"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                          :class="errors[`mealsGuest_${i}_idNumber`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                        <span v-if="errors[`mealsGuest_${i}_idNumber`]" class="font-sans text-xs text-(--color-error)">{{
                          errors[`mealsGuest_${i}_idNumber`] }}</span>
                      </div>
                    </div>

                  <!-- Meal items (optional) — only shown when menu is available -->
                  <div v-if="menu.length || menuLoading"
                    class="border-t border-(--color-outline-variant) pt-4 space-y-3">
                    <div class="flex items-center justify-between">
                      <p
                        class="font-sans text-xs font-semibold uppercase tracking-widest text-(--color-on-surface-variant) flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm text-(--color-primary)">restaurant_menu</span>
                        Meal Items
                        <span class="normal-case font-normal text-(--color-outline) ml-1">— optional</span>
                      </p>
                    </div>

                    <!-- Loading -->
                    <p v-if="menuLoading"
                      class="font-sans text-xs text-(--color-on-surface-variant) flex items-center gap-1">
                      <span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Loading
                      menu…
                    </p>

                    <!-- Already-added items -->
                    <div v-if="guest.mealItems.length" class="space-y-2">
                      <div v-for="(item, j) in guest.mealItems" :key="j"
                        class="flex items-center gap-3 px-3 py-2 bg-(--color-surface-container-lowest) rounded-lg">
                        <div class="flex-1 min-w-0">
                          <p class="font-sans text-sm font-semibold text-(--color-on-surface) truncate">{{ item.name }}
                          </p>
                          <p v-if="item.price" class="font-sans text-xs text-(--color-on-surface-variant)">K{{
                            item.price.toLocaleString() }} × {{ item.quantity }}</p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                          <button type="button"
                            class="w-6 h-6 rounded-full border border-(--color-outline-variant) flex items-center justify-center text-(--color-on-surface) hover:border-(--color-primary) hover:text-(--color-primary) transition-colors text-xs font-bold disabled:opacity-30"
                            :disabled="item.quantity <= 1" @click="item.quantity--">−</button>
                          <span class="font-sans text-sm font-semibold w-5 text-center">{{ item.quantity }}</span>
                          <button type="button"
                            class="w-6 h-6 rounded-full border border-(--color-outline-variant) flex items-center justify-center text-(--color-on-surface) hover:border-(--color-primary) hover:text-(--color-primary) transition-colors text-xs font-bold"
                            @click="item.quantity++">+</button>
                          <button type="button"
                            class="ml-1 text-(--color-outline) hover:text-(--color-error) transition-colors"
                            @click="removeMealItem(guest, j)">
                            <span class="material-symbols-outlined text-base">close</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Add item row -->
                    <div v-if="menu.length" class="flex gap-2 items-end">
                      <div class="flex-1 flex flex-col gap-1">
                        <label
                          class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Item</label>
                        <select v-model="getMealStaging(i).menuItemId"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors cursor-pointer">
                          <option value="">— Select item —</option>
                          <optgroup v-for="group in menuByCategory" :key="group.category" :label="group.category">
                            <option v-for="item in group.items" :key="item.id" :value="item.id">
                              {{ item.name }}{{ item.price ? ` — K${item.price.toLocaleString()}` : '' }}
                            </option>
                          </optgroup>
                        </select>
                      </div>
                      <div class="w-20 flex flex-col gap-1">
                        <label
                          class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Qty</label>
                        <input v-model.number="getMealStaging(i).quantity" type="number" min="1"
                          class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                      </div>
                      <button type="button" :disabled="!getMealStaging(i).menuItemId"
                        class="flex items-center gap-1 px-4 py-2 bg-(--color-primary) text-white font-sans text-xs font-semibold rounded-lg hover:bg-(--color-clay-earth) transition-colors disabled:opacity-40"
                        @click="addMealItem(guest, i)">
                        <span class="material-symbols-outlined text-sm">add</span> Add
                      </button>
                    </div>
                  </div><!-- /meal items -->
                  </div><!-- /attendee fields -->
                </div><!-- /attendee card -->
              </div>
            </section>

            <!-- Authoriser Details -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-6">
                <span class="material-symbols-outlined text-(--color-primary)">approval</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Authoriser Details</h2>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Authoriser
                    Name <span class="text-(--color-error)">*</span></label>
                  <input v-model="cb.meals.authoriser.name" type="text" placeholder="John Phiri"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.mealsAuthoriserName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.mealsAuthoriserName" class="font-sans text-xs text-(--color-error)">{{
                    errors.mealsAuthoriserName }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Title
                    / Position</label>
                  <input v-model="cb.meals.authoriser.title" type="text" placeholder="e.g. HOD"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Authoriser
                    Email <span class="text-(--color-error)">*</span></label>
                  <input v-model="cb.meals.authoriser.email" type="email" placeholder="j.phiri@acme.com"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.mealsAuthoriserEmail ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.mealsAuthoriserEmail" class="font-sans text-xs text-(--color-error)">{{
                    errors.mealsAuthoriserEmail }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Authoriser
                    Phone</label>
                  <input v-model="cb.meals.authoriser.phone" type="tel" placeholder="+260 97 000 0000"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Department</label>
                  <input v-model="cb.meals.authoriser.department" type="text" placeholder="e.g. Finance, HR, Operations"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Cost
                    Center <span class="text-(--color-error)">*</span></label>
                  <input v-model="cb.meals.costCenter" type="text" placeholder="e.g. 12345678"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.mealsCostCenter ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.mealsCostCenter" class="font-sans text-xs text-(--color-error)">{{
                    errors.mealsCostCenter }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">GL
                    Code</label>
                  <input v-model="cb.meals.authoriser.glCode" type="text" placeholder="e.g. 12345678"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
              </div>
            </section>

            <!-- Supporting Documents -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-6">
                <span class="material-symbols-outlined text-(--color-primary)">attach_file</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Supporting Documents</h2>
              </div>
              <label
                class="block border-2 border-dashed border-(--color-outline-variant) rounded-xl p-8 text-center hover:bg-(--color-surface-container-low) transition-colors cursor-pointer group">
                <input type="file" class="hidden" multiple accept=".pdf,.jpg,.jpeg,.png"
                  @change="pickDocsFor(mealsDocFiles)($event)" />
                <span
                  class="material-symbols-outlined text-4xl text-(--color-outline) mb-2 block group-hover:text-(--color-primary) transition-colors">upload_file</span>
                <p class="font-sans text-sm font-semibold text-(--color-on-surface-variant)">Click to upload or drag
                  &amp; drop</p>
                <p class="font-sans text-xs text-(--color-outline) mt-1 uppercase tracking-widest">Attach any internally
                  signed and approved documentation supporting this booking</p>
                <p class="font-sans text-xs text-(--color-outline) mt-1 uppercase tracking-widest">Max 5MB · PDF, JPG,
                  PNG</p>
              </label>
              <div v-if="mealsDocFiles.length" class="mt-4 space-y-3">
                <div v-for="(doc, i) in mealsDocFiles" :key="i"
                  class="flex items-center gap-3 p-3 bg-(--color-surface-container-low) rounded-lg">
                  <span class="material-symbols-outlined shrink-0"
                    :class="doc.error ? 'text-(--color-error)' : doc.url ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'"
                    :style="doc.url ? 'font-variation-settings: FILL 1' : ''">{{ doc.error ? 'error' : doc.url ?
                      'check_circle' : 'description' }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="font-sans text-sm text-(--color-on-surface) truncate">{{ doc.name }}</p>
                    <p v-if="doc.error" class="font-sans text-xs text-(--color-error)">{{ doc.error }}</p>
                    <p v-else-if="doc.url" class="font-sans text-xs text-(--color-primary)">Uploaded</p>
                    <div v-else class="mt-1 h-1 bg-(--color-outline-variant) rounded-full overflow-hidden">
                      <div class="h-full bg-(--color-primary) transition-all duration-300 rounded-full"
                        :style="{ width: doc.progress + '%' }"></div>
                    </div>
                  </div>
                  <button type="button"
                    class="text-(--color-outline) hover:text-(--color-error) transition-colors shrink-0"
                    @click="removeDocFrom(mealsDocFiles, i)"><span
                      class="material-symbols-outlined text-base">close</span></button>
                </div>
              </div>
            </section>

          </div>

          <!-- ══ CONFERENCE ══ -->
          <div v-if="activeTab === 'conference'" class="space-y-6">

            <!-- Reason for Booking -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-5">
                <span class="material-symbols-outlined text-(--color-primary)">description</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Reason for Booking</h2>
              </div>
              <textarea v-model="cb.conference.reasonForBooking" rows="3"
                placeholder="e.g. Annual board meeting, product launch, training workshop..."
                class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-on-surface-variant) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all resize-none"></textarea>
            </section>

            <!-- Conference Details -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-5">
                <span class="material-symbols-outlined text-(--color-primary)">meeting_room</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Conference Details</h2>
              </div>
              <div class="space-y-5">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div class="flex flex-col gap-1">
                    <label
                      class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Date
                      <span class="text-(--color-error)">*</span></label>
                    <input v-model="cb.conference.date" type="date"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.confDate ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors.confDate" class="font-sans text-xs text-(--color-error)">{{ errors.confDate
                    }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label
                      class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Number
                      of Attendees</label>
                    <input v-model.number="cb.conference.attendees" type="number" min="1"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label
                      class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Start
                      Time <span class="text-(--color-error)">*</span></label>
                    <input v-model="cb.conference.startTime" type="time"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.confStartTime ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label
                      class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">End
                      Time <span class="text-(--color-error)">*</span></label>
                    <input v-model="cb.conference.endTime" type="time"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors.confEndTime ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  </div>
                </div>
                <div>
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant) block mb-3">Equipment
                    Needed</label>
                  <div class="flex flex-wrap gap-2">
                    <button v-for="item in EQUIPMENT" :key="item" type="button"
                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans text-xs font-semibold border transition-colors"
                      :class="cb.conference.equipment.includes(item) ? 'bg-(--color-primary) text-white border-transparent' : 'border-(--color-outline-variant) text-(--color-on-surface-variant) hover:border-(--color-primary) hover:text-(--color-primary)'"
                      @click="toggleEquipment(item)">
                      <span v-if="cb.conference.equipment.includes(item)"
                        class="material-symbols-outlined text-sm">check</span>
                      {{ item }}
                    </button>
                  </div>
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Additional
                    Notes</label>
                  <textarea v-model="cb.conference.notes" rows="2"
                    placeholder="Room layout, catering during session, etc."
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors resize-none"></textarea>
                </div>
              </div>
            </section>

            <!-- Attendee List -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-(--color-primary)">groups</span>
                  <h2 class="font-serif text-xl text-(--color-on-surface)">Attendee List</h2>
                </div>
                <button type="button"
                  class="flex items-center gap-1 text-(--color-primary) font-sans text-sm font-semibold hover:underline"
                  @click="cb.addConfGuest()">
                  <span class="material-symbols-outlined text-base">add</span> Add Attendee
                </button>
              </div>
              <div class="space-y-4">
                <div v-for="(guest, i) in cb.conference.guests" :key="i"
                  class="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-(--color-surface-container-low) rounded-lg items-end">
                  <div class="flex flex-col gap-1">
                    <label
                      class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full
                      Name <span class="text-(--color-error)">*</span></label>
                    <input v-model="guest.fullName" type="text"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors[`confGuest_${i}_name`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors[`confGuest_${i}_name`]" class="font-sans text-xs text-(--color-error)">{{
                      errors[`confGuest_${i}_name`] }}</span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label
                      class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email</label>
                    <input v-model="guest.email" type="email"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label
                      class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Passport
                      / ID <span class="text-(--color-error)">*</span></label>
                    <input v-model="guest.idNumber" type="text"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors[`confGuest_${i}_idNumber`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                    <span v-if="errors[`confGuest_${i}_idNumber`]" class="font-sans text-xs text-(--color-error)">{{
                      errors[`confGuest_${i}_idNumber`] }}</span>
                  </div>
                  <button type="button" :disabled="cb.conference.guests.length === 1"
                    class="h-10 w-10 flex items-center justify-center text-(--color-outline) hover:text-(--color-error) transition-colors disabled:opacity-30 ml-auto"
                    @click="cb.removeConfGuest(i)">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </section>

            <!-- Authoriser Details -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-6">
                <span class="material-symbols-outlined text-(--color-primary)">approval</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Authoriser Details</h2>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Authoriser
                    Name <span class="text-(--color-error)">*</span></label>
                  <input v-model="cb.conference.authoriser.name" type="text" placeholder="John Phiri"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.confAuthoriserName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.confAuthoriserName" class="font-sans text-xs text-(--color-error)">{{
                    errors.confAuthoriserName }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Title
                    / Position</label>
                  <input v-model="cb.conference.authoriser.title" type="text" placeholder="e.g. HOD"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Authoriser
                    Email <span class="text-(--color-error)">*</span></label>
                  <input v-model="cb.conference.authoriser.email" type="email" placeholder="j.phiri@acme.com"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.confAuthoriserEmail ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.confAuthoriserEmail" class="font-sans text-xs text-(--color-error)">{{
                    errors.confAuthoriserEmail }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Authoriser
                    Phone</label>
                  <input v-model="cb.conference.authoriser.phone" type="tel" placeholder="+260 97 000 0000"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Department</label>
                  <input v-model="cb.conference.authoriser.department" type="text"
                    placeholder="e.g. Finance, HR, Operations"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Cost
                    Center <span class="text-(--color-error)">*</span></label>
                  <input v-model="cb.conference.costCenter" type="text" placeholder="e.g. 12345678"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.confCostCenter ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.confCostCenter" class="font-sans text-xs text-(--color-error)">{{
                    errors.confCostCenter }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">GL
                    Code</label>
                  <input v-model="cb.conference.authoriser.glCode" type="text" placeholder="e.g. 12345678"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
              </div>
            </section>

            <!-- Supporting Documents -->
            <section
              class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-6">
                <span class="material-symbols-outlined text-(--color-primary)">attach_file</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Supporting Documents</h2>
              </div>
              <label
                class="block border-2 border-dashed border-(--color-outline-variant) rounded-xl p-8 text-center hover:bg-(--color-surface-container-low) transition-colors cursor-pointer group">
                <input type="file" class="hidden" multiple accept=".pdf,.jpg,.jpeg,.png"
                  @change="pickDocsFor(confDocFiles)($event)" />
                <span
                  class="material-symbols-outlined text-4xl text-(--color-outline) mb-2 block group-hover:text-(--color-primary) transition-colors">upload_file</span>
                <p class="font-sans text-sm font-semibold text-(--color-on-surface-variant)">Click to upload or drag
                  &amp; drop</p>
                <p class="font-sans text-xs text-(--color-outline) mt-1 uppercase tracking-widest">Attach any internally
                  signed and approved documentation supporting this booking</p>
                <p class="font-sans text-xs text-(--color-outline) mt-1 uppercase tracking-widest">Max 5MB · PDF, JPG,
                  PNG</p>
              </label>
              <div v-if="confDocFiles.length" class="mt-4 space-y-3">
                <div v-for="(doc, i) in confDocFiles" :key="i"
                  class="flex items-center gap-3 p-3 bg-(--color-surface-container-low) rounded-lg">
                  <span class="material-symbols-outlined shrink-0"
                    :class="doc.error ? 'text-(--color-error)' : doc.url ? 'text-(--color-primary)' : 'text-(--color-on-surface-variant)'"
                    :style="doc.url ? 'font-variation-settings: FILL 1' : ''">{{ doc.error ? 'error' : doc.url ?
                      'check_circle' : 'description' }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="font-sans text-sm text-(--color-on-surface) truncate">{{ doc.name }}</p>
                    <p v-if="doc.error" class="font-sans text-xs text-(--color-error)">{{ doc.error }}</p>
                    <p v-else-if="doc.url" class="font-sans text-xs text-(--color-primary)">Uploaded</p>
                    <div v-else class="mt-1 h-1 bg-(--color-outline-variant) rounded-full overflow-hidden">
                      <div class="h-full bg-(--color-primary) transition-all duration-300 rounded-full"
                        :style="{ width: doc.progress + '%' }"></div>
                    </div>
                  </div>
                  <button type="button"
                    class="text-(--color-outline) hover:text-(--color-error) transition-colors shrink-0"
                    @click="removeDocFrom(confDocFiles, i)"><span
                      class="material-symbols-outlined text-base">close</span></button>
                </div>
              </div>
            </section>

          </div>

          <!-- CTA -->
          <div class="flex justify-between items-center pt-2">
            <button type="button" @click="goBack"
              class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold px-6 py-3 border border-(--color-primary) rounded-lg hover:bg-(--color-surface-container-low) transition-all">
              <span class="material-symbols-outlined text-base">arrow_back</span> Back
            </button>
            <button type="button" @click="goToConfirm"
              class="px-8 py-3 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-lg hover:bg-(--color-clay-earth) transition-all">
              Review Booking
            </button>
          </div>

        </template>

        <!-- ══ STEP 2: CONFIRM ══ -->
        <template v-else>

          <!-- Branch context banner in confirmation -->
          <div v-if="selectedBranch || branches.length > 1"
            class="flex items-center gap-2 p-3 bg-(--color-savannah-mist) rounded-xl">
            <span class="material-symbols-outlined text-(--color-primary) text-base shrink-0">location_on</span>
            <p class="font-sans text-sm text-(--color-on-surface)">
              <span class="font-semibold">{{ lodge?.name }}</span>
              <span class="text-(--color-on-surface-variant)"> — </span>
              <span
                :class="selectedBranch ? 'text-(--color-primary) font-semibold' : 'text-(--color-on-surface-variant)'">
                {{ selectedBranch ? selectedBranch.name : 'All branches' }}
              </span>
            </p>
          </div>

          <!-- Company -->
          <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center justify-between mb-5">
              <h2 class="font-serif text-xl flex items-center gap-2 text-(--color-on-surface)">
                <span class="material-symbols-outlined text-(--color-primary)">business</span> Company Details
              </h2>
              <button class="font-sans text-sm text-(--color-primary) font-semibold hover:underline"
                @click="step = 1">Edit</button>
            </div>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
              <div>
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Company</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.company.name }}</dd>
              </div>
              <div>
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Reg. Number</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.company.regNumber }}</dd>
              </div>
              <div>
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Contact Person</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.company.contactPerson }}</dd>
              </div>
              <div>
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Email</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.company.email }}</dd>
              </div>
              <div>
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Phone</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.company.phone }}</dd>
              </div>
              <div v-if="cb.company.industry">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Industry</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.company.industry }}</dd>
              </div>
              <div v-if="cb.company.address" class="sm:col-span-2">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Address</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ [cb.company.address, cb.company.city,
                cb.company.country, cb.company.postalCode].filter(Boolean).join(', ') }}</dd>
              </div>
            </dl>
          </section>

          <!-- Accommodation summary -->
          <section v-if="activeTab === 'accommodation'"
            class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center justify-between mb-5">
              <h2 class="font-serif text-xl flex items-center gap-2 text-(--color-on-surface)">
                <span class="material-symbols-outlined text-(--color-primary)">bed</span> Accommodation
              </h2>
              <button class="font-sans text-sm text-(--color-primary) font-semibold hover:underline"
                @click="step = 1; activeTab = 'accommodation'">Edit</button>
            </div>

            <div v-if="cb.accommodation.reasonForBooking"
              class="mb-4 p-3 bg-(--color-surface-container-low) rounded-lg">
              <p
                class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                Reason for Booking</p>
              <p class="font-sans text-sm text-(--color-on-surface)">{{ cb.accommodation.reasonForBooking }}</p>
            </div>

            <p v-if="cb.accommodation.roomType || cb.accommodation.roomCount"
              class="font-sans text-xs text-(--color-on-surface-variant) mb-4">
              <span class="font-semibold text-(--color-on-surface) capitalize">{{ cb.accommodation.roomType || 'Any'
              }}</span> room · {{ cb.accommodation.roomCount }} room{{ cb.accommodation.roomCount !== 1 ? 's' : '' }}
            </p>

            <div class="space-y-3 mb-5">
              <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">
                Guests ({{ cb.accommodation.guests.length }})</p>
              <div v-for="(g, i) in cb.accommodation.guests" :key="i"
                class="p-4 bg-(--color-surface-container-low) rounded-lg">
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ g.fullName }}</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ g.email || '—' }} · {{ g.idNumber
                      || 'No ID' }}</p>
                  </div>
                  <span class="font-sans text-xs text-(--color-primary) font-semibold shrink-0 ml-2">Guest {{ i + 1
                    }}</span>
                </div>
                <div class="flex gap-6 mt-2">
                  <div>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">Check-in</p>
                    <p class="font-sans text-sm text-(--color-on-surface)">{{ fmt(g.checkIn) }}</p>
                  </div>
                  <div>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">Check-out</p>
                    <p class="font-sans text-sm text-(--color-on-surface)">{{ fmt(g.checkOut) }} <span
                        v-if="guestNights(g)" class="text-(--color-on-surface-variant)">({{ guestNights(g) }}n)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <dl v-if="cb.accommodation.authoriser.name"
              class="pt-4 border-t border-(--color-outline-variant) grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
              <div class="sm:col-span-2">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Authoriser</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.accommodation.authoriser.name }}<span
                    v-if="cb.accommodation.authoriser.title" class="text-(--color-on-surface-variant)"> · {{
                      cb.accommodation.authoriser.title }}</span></dd>
              </div>
              <div v-if="cb.accommodation.authoriser.department">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Department</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.accommodation.authoriser.department }}
                </dd>
              </div>
              <div v-if="cb.accommodation.authoriser.email">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Authoriser Email</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.accommodation.authoriser.email }}</dd>
              </div>
              <div v-if="cb.accommodation.authoriser.glCode">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  GL Code</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.accommodation.authoriser.glCode }}</dd>
              </div>
              <div v-if="cb.accommodation.costCenter">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Cost Center</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.accommodation.costCenter }}</dd>
              </div>
            </dl>
            <div v-if="accomDocFiles.filter(d => d.url).length"
              class="mt-5 pt-4 border-t border-(--color-outline-variant)">
              <p
                class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-3">
                Supporting Documents ({{ accomDocFiles.filter(d => d.url).length }})
              </p>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <a v-for="doc in accomDocFiles.filter(d => d.url)" :key="doc.url" :href="doc.url" target="_blank"
                  rel="noopener"
                  class="group flex flex-col items-center gap-2 p-3 rounded-lg border border-(--color-outline-variant) hover:border-(--color-primary) bg-(--color-surface-container-low) transition-colors overflow-hidden">
                  <img v-if="/\.(jpe?g|png)$/i.test(doc.name)" :src="doc.url" :alt="doc.name"
                    class="w-full h-24 object-cover rounded-md" />
                  <span v-else
                    class="material-symbols-outlined text-4xl text-(--color-outline) group-hover:text-(--color-primary) transition-colors">picture_as_pdf</span>
                  <p
                    class="font-sans text-xs text-(--color-on-surface-variant) group-hover:text-(--color-primary) text-center truncate w-full transition-colors">
                    {{ doc.name }}</p>
                </a>
              </div>
            </div>
          </section>

          <!-- Meals summary -->
          <section v-if="activeTab === 'meals'"
            class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center justify-between mb-5">
              <h2 class="font-serif text-xl flex items-center gap-2 text-(--color-on-surface)">
                <span class="material-symbols-outlined text-(--color-primary)">restaurant</span> Meals
              </h2>
              <button class="font-sans text-sm text-(--color-primary) font-semibold hover:underline"
                @click="step = 1; activeTab = 'meals'">Edit</button>
            </div>
            <div v-if="cb.meals.reasonForBooking" class="mb-4 p-3 bg-(--color-surface-container-low) rounded-lg">
              <p
                class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                Reason for Booking</p>
              <p class="font-sans text-sm text-(--color-on-surface)">{{ cb.meals.reasonForBooking }}</p>
            </div>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 mb-5">
              <div>
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Plan</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{MEAL_PLANS.find(p => p.value ===
                  cb.meals.planType)?.label}}</dd>
              </div>
              <div>
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Pax</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.meals.pax }}</dd>
              </div>
              <div v-if="cb.meals.checkIn">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  From</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ fmt(cb.meals.checkIn) }}</dd>
              </div>
              <div v-if="cb.meals.checkOut">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  To</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ fmt(cb.meals.checkOut) }}</dd>
              </div>
              <div v-if="cb.meals.dietaryNotes" class="sm:col-span-2">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Dietary Notes</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.meals.dietaryNotes }}</dd>
              </div>
            </dl>
            <div class="space-y-2 mb-5">
              <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">
                Attendees ({{ cb.meals.guests.length }})</p>
              <div v-for="(g, i) in cb.meals.guests" :key="i"
                class="flex items-center justify-between p-3 bg-(--color-surface-container-low) rounded-lg">
                <div class="flex-1 min-w-0">
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ g.fullName }}</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ g.email || '—' }} · {{ g.idNumber ||
                    'No ID' }}</p>
                  <div v-if="g.mealItems?.length" class="mt-1.5 flex flex-wrap gap-1">
                    <span v-for="item in g.mealItems" :key="item.menuItemId"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-savannah-mist) font-sans text-xs text-(--color-on-surface)">
                      {{ item.name }} × {{ item.quantity }}
                    </span>
                  </div>
                </div>
                <span class="font-sans text-xs text-(--color-primary) font-semibold shrink-0">Attendee {{ i + 1
                  }}</span>
              </div>
            </div>
            <dl v-if="cb.meals.authoriser.name"
              class="pt-4 border-t border-(--color-outline-variant) grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
              <div class="sm:col-span-2">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Authoriser</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.meals.authoriser.name }}<span
                    v-if="cb.meals.authoriser.title" class="text-(--color-on-surface-variant)"> · {{
                      cb.meals.authoriser.title }}</span></dd>
              </div>
              <div v-if="cb.meals.authoriser.department">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Department</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.meals.authoriser.department }}</dd>
              </div>
              <div v-if="cb.meals.authoriser.email">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Authoriser Email</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.meals.authoriser.email }}</dd>
              </div>
              <div v-if="cb.meals.authoriser.glCode">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  GL Code</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.meals.authoriser.glCode }}</dd>
              </div>
              <div v-if="cb.meals.costCenter">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Cost Center</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.meals.costCenter }}</dd>
              </div>
            </dl>
            <div v-if="mealsDocFiles.filter(d => d.url).length"
              class="mt-5 pt-4 border-t border-(--color-outline-variant)">
              <p
                class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-3">
                Supporting Documents ({{ mealsDocFiles.filter(d => d.url).length }})
              </p>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <a v-for="doc in mealsDocFiles.filter(d => d.url)" :key="doc.url" :href="doc.url" target="_blank"
                  rel="noopener"
                  class="group flex flex-col items-center gap-2 p-3 rounded-lg border border-(--color-outline-variant) hover:border-(--color-primary) bg-(--color-surface-container-low) transition-colors overflow-hidden">
                  <img v-if="/\.(jpe?g|png)$/i.test(doc.name)" :src="doc.url" :alt="doc.name"
                    class="w-full h-24 object-cover rounded-md" />
                  <span v-else
                    class="material-symbols-outlined text-4xl text-(--color-outline) group-hover:text-(--color-primary) transition-colors">picture_as_pdf</span>
                  <p
                    class="font-sans text-xs text-(--color-on-surface-variant) group-hover:text-(--color-primary) text-center truncate w-full transition-colors">
                    {{ doc.name }}</p>
                </a>
              </div>
            </div>
          </section>

          <!-- Conference summary -->
          <section v-if="activeTab === 'conference'"
            class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
            <div class="flex items-center justify-between mb-5">
              <h2 class="font-serif text-xl flex items-center gap-2 text-(--color-on-surface)">
                <span class="material-symbols-outlined text-(--color-primary)">meeting_room</span> Conference Room
              </h2>
              <button class="font-sans text-sm text-(--color-primary) font-semibold hover:underline"
                @click="step = 1; activeTab = 'conference'">Edit</button>
            </div>
            <div v-if="cb.conference.reasonForBooking" class="mb-4 p-3 bg-(--color-surface-container-low) rounded-lg">
              <p
                class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                Reason for Booking</p>
              <p class="font-sans text-sm text-(--color-on-surface)">{{ cb.conference.reasonForBooking }}</p>
            </div>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 mb-5">
              <div>
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Date</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ fmt(cb.conference.date) }}</dd>
              </div>
              <div>
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Time</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.conference.startTime }} – {{
                  cb.conference.endTime }}</dd>
              </div>
              <div>
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Attendees</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.conference.attendees }}</dd>
              </div>
              <div v-if="cb.conference.equipment.length">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Equipment</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.conference.equipment.join(', ') }}</dd>
              </div>
              <div v-if="cb.conference.notes" class="sm:col-span-2">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Notes</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.conference.notes }}</dd>
              </div>
            </dl>
            <div class="space-y-2 mb-5">
              <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">
                Attendees ({{ cb.conference.guests.length }})</p>
              <div v-for="(g, i) in cb.conference.guests" :key="i"
                class="flex items-center justify-between p-3 bg-(--color-surface-container-low) rounded-lg">
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ g.fullName }}</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ g.email || '—' }} · {{ g.idNumber ||
                    'No ID' }}</p>
                </div>
                <span class="font-sans text-xs text-(--color-primary) font-semibold">Attendee {{ i + 1 }}</span>
              </div>
            </div>
            <dl v-if="cb.conference.authoriser.name"
              class="pt-4 border-t border-(--color-outline-variant) grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
              <div class="sm:col-span-2">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Authoriser</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.conference.authoriser.name }}<span
                    v-if="cb.conference.authoriser.title" class="text-(--color-on-surface-variant)"> · {{
                      cb.conference.authoriser.title }}</span></dd>
              </div>
              <div v-if="cb.conference.authoriser.department">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Department</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.conference.authoriser.department }}</dd>
              </div>
              <div v-if="cb.conference.authoriser.email">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Authoriser Email</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.conference.authoriser.email }}</dd>
              </div>
              <div v-if="cb.conference.authoriser.glCode">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  GL Code</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.conference.authoriser.glCode }}</dd>
              </div>
              <div v-if="cb.conference.costCenter">
                <dt
                  class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">
                  Cost Center</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ cb.conference.costCenter }}</dd>
              </div>
            </dl>
            <div v-if="confDocFiles.filter(d => d.url).length"
              class="mt-5 pt-4 border-t border-(--color-outline-variant)">
              <p
                class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-3">
                Supporting Documents ({{ confDocFiles.filter(d => d.url).length }})
              </p>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <a v-for="doc in confDocFiles.filter(d => d.url)" :key="doc.url" :href="doc.url" target="_blank"
                  rel="noopener"
                  class="group flex flex-col items-center gap-2 p-3 rounded-lg border border-(--color-outline-variant) hover:border-(--color-primary) bg-(--color-surface-container-low) transition-colors overflow-hidden">
                  <img v-if="/\.(jpe?g|png)$/i.test(doc.name)" :src="doc.url" :alt="doc.name"
                    class="w-full h-24 object-cover rounded-md" />
                  <span v-else
                    class="material-symbols-outlined text-4xl text-(--color-outline) group-hover:text-(--color-primary) transition-colors">picture_as_pdf</span>
                  <p
                    class="font-sans text-xs text-(--color-on-surface-variant) group-hover:text-(--color-primary) text-center truncate w-full transition-colors">
                    {{ doc.name }}</p>
                </a>
              </div>
            </div>
          </section>

          <!-- Submit error -->
          <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0">
            <div v-if="submitError"
              class="flex items-start gap-2 p-4 rounded-lg bg-(--color-error-container) text-(--color-on-error-container)">
              <span class="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
              <p class="font-sans text-sm">{{ submitError }}</p>
            </div>
          </Transition>

          <!-- CTAs -->
          <div class="flex justify-between items-center pt-2">
            <button type="button" @click="goBack"
              class="flex items-center gap-2 text-(--color-primary) font-sans text-sm font-semibold px-6 py-3 border border-(--color-primary) rounded-lg hover:bg-(--color-surface-container-low) transition-all">
              <span class="material-symbols-outlined text-base">arrow_back</span> Back to Services
            </button>
            <button type="button" :disabled="loading" @click="submit"
              class="px-8 py-3 bg-(--color-primary) text-white font-sans text-sm font-semibold rounded-lg hover:bg-(--color-clay-earth) transition-all disabled:opacity-60 flex items-center gap-2">
              <span v-if="loading" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
              {{ loading ? 'Submitting…' : 'Confirm Corporate Booking' }}
            </button>
          </div>

          <p class="font-sans text-xs text-(--color-on-surface-variant)">
            By confirming you agree to our
            <a href="#" class="text-(--color-primary) hover:underline">cancellation policy</a>
            and <a href="#" class="text-(--color-primary) hover:underline">terms of service</a>.
          </p>

        </template>
      </div>

      <!-- ── Sidebar ─────────────────────────────────────────────────── -->
      <aside class="lg:col-span-4 lg:sticky lg:top-8 space-y-4">
        <div class="bg-(--color-surface-container-lowest) rounded-xl p-5 border border-(--color-outline-variant)">
          <h3 class="font-serif text-lg text-(--color-on-surface) mb-4">Booking Summary</h3>
          <div class="space-y-3">
            <div class="flex items-start gap-3 pb-3 border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-(--color-primary) text-base mt-0.5">home_work</span>
              <div>
                <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">
                  Lodge
                </p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ lodge?.name ?? '—' }}</p>
                <p v-if="selectedBranch"
                  class="font-sans text-xs text-(--color-primary) font-semibold mt-0.5 flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">location_on</span>
                  {{ selectedBranch.name }}
                </p>
                <p v-else-if="branches.length > 1" class="font-sans text-xs text-(--color-on-surface-variant) mt-0.5">
                  All
                  branches</p>
              </div>
            </div>

            <div v-if="activeTab" class="space-y-3">
              <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">
                Services
              </p>
              <div v-if="activeTab === 'accommodation'" class="flex items-start gap-3">
                <span class="material-symbols-outlined text-(--color-primary) text-base mt-0.5">bed</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Accommodation</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ cb.accommodation.guests.length }}
                    guest{{
                      cb.accommodation.guests.length !== 1 ? 's' : '' }} · {{ cb.accommodation.roomCount }} room{{
                      cb.accommodation.roomCount !== 1 ? 's' : '' }}</p>
                </div>
              </div>
              <div v-if="activeTab === 'meals'" class="flex items-start gap-3">
                <span class="material-symbols-outlined text-(--color-primary) text-base mt-0.5">restaurant</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Meals</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">{{MEAL_PLANS.find(p => p.value ===
                    cb.meals.planType)?.label}} · {{ cb.meals.pax }} pax</p>
                </div>
              </div>
              <div v-if="activeTab === 'conference'" class="flex items-start gap-3">
                <span class="material-symbols-outlined text-(--color-primary) text-base mt-0.5">meeting_room</span>
                <div>
                  <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Conference Room</p>
                  <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ fmt(cb.conference.date) }}<template
                      v-if="cb.conference.date"> · {{ cb.conference.startTime }}–{{ cb.conference.endTime }}</template>
                  </p>
                </div>
              </div>
            </div>

            <div v-else class="py-4 text-center">
              <span class="material-symbols-outlined text-2xl text-(--color-outline) block mb-1">touch_app</span>
              <p class="font-sans text-xs text-(--color-on-surface-variant)">Select a service above to get started</p>
            </div>
          </div>
        </div>

        <div class="flex items-start gap-2 p-4 bg-(--color-surface-container) rounded-xl">
          <span class="material-symbols-outlined text-base text-(--color-primary) mt-0.5 shrink-0">info</span>
          <p class="font-sans text-xs text-(--color-on-surface-variant) leading-relaxed">Pricing will be confirmed by
            the
            lodge team after your request is received.</p>
        </div>
      </aside>

    </div>
  </div>
</template>

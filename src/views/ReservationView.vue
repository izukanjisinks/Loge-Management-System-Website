<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBookingStore }      from '@/stores/booking'
import { useAuthStore }         from '@/stores/auth'
import { useReservationsStore } from '@/stores/reservations'
import StayDetailsForm          from '@/components/reservation/StayDetailsForm.vue'
import PreferencesForm          from '@/components/reservation/PreferencesForm.vue'
import ReservationSummary       from '@/components/reservation/ReservationSummary.vue'
import { publicApi }            from '@/lib/api'
import { uploadBookingDocument } from '@/services/storage'

const router       = useRouter()
const route        = useRoute()
const booking      = useBookingStore()
const auth         = useAuthStore()
const reservations = useReservationsStore()

const errors  = ref<Record<string, string>>({})
const loading = ref(false)
const success  = ref(false)
const step     = ref(1)

// ── Document upload (corporate) ───────────────────────────────────────
const docFiles     = ref<any[]>([])
const docUploading = ref(false)

function onDocPick(e: Event) {
  const picked = Array.from((e.target as HTMLInputElement).files ?? [])
  const allowed = ['application/pdf', 'image/jpeg', 'image/png']
  const maxMb = 5
  picked.forEach((f: any) => {
    if (!allowed.includes(f.type)) {
      docFiles.value.push({ name: f.name, error: 'Only PDF, JPG, PNG allowed' })
      return
    }
    if (f.size > maxMb * 1024 * 1024) {
      docFiles.value.push({ name: f.name, error: `Max ${maxMb}MB` })
      return
    }
    docFiles.value.push({ file: f, name: f.name, progress: 0, url: null, error: null })
  })
  ;(e.target as HTMLInputElement).value = ''
}

function removeDoc(i: number) {
  docFiles.value.splice(i, 1)
}

async function uploadAllDocs() {
  const pending = docFiles.value.filter(d => d.file && !d.url && !d.error)
  if (!pending.length) return
  docUploading.value = true
  await Promise.all(pending.map(async (d: any) => {
    try {
      d.url = await uploadBookingDocument(d.file, (p: number) => { d.progress = p })
    } catch {
      d.error = 'Upload failed'
    }
  }))
  docUploading.value = false
}

let mounted = false
onMounted(async () => {
  mounted = true
  if (auth.user && !booking.guestInfo.email) {
    booking.guestInfo.email     = (auth.user as any).email     ?? ''
    booking.guestInfo.firstName = (auth.user as any).firstName ?? booking.guestInfo.firstName
    booking.guestInfo.lastName  = (auth.user as any).lastName  ?? booking.guestInfo.lastName
  }

  const qci = route.query.check_in as string | undefined
  const qco = route.query.check_out as string | undefined
  if (qci) booking.setDates(qci, qco ?? '')

  const roomId     = route.params.roomId as string
  const qName      = route.query.room_name as string | undefined
  const qType      = route.query.room_type as string | undefined
  const qPrice     = route.query.room_price as string | undefined
  const qLodgeName = route.query.lodge_name as string | undefined

  if (qName) {
    const type  = qType ? qType.charAt(0).toUpperCase() + qType.slice(1) : ''
    const price = parseFloat(qPrice ?? '0') || 0
    booking.setRoom(roomId, type, price, null, qLodgeName ?? '')
  } else if (booking.roomId !== roomId) {
    try {
      const { data } = await publicApi.get(`/guest/rooms/${roomId}`)
      if (!mounted) return
      const price = parseFloat(data.price_per_night) || 0
      const type  = data.type ? data.type.charAt(0).toUpperCase() + data.type.slice(1) : ''
      booking.setRoom(data.id, type, price, data.organization?.id ?? null, data.organization?.name ?? '')
    } catch { /* leave as-is */ }
  }
})

onUnmounted(() => { mounted = false })

// ── Validation ────────────────────────────────────────────────────────
function validateIndividual() {
  const e: Record<string, string> = {}
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

function validateCorporate() {
  const e: Record<string, string> = {}
  const c = booking.corporateClient
  if (!c.companyName)   e.companyName   = 'Required'
  if (!c.contactPerson) e.contactPerson = 'Required'
  if (!c.email)         e.email         = 'Required'
  else if (!/\S+@\S+\.\S+/.test(c.email)) e.email = 'Enter a valid email'
  if (!c.phone)         e.phone         = 'Required'
  if (!c.regNumber)     e.regNumber     = 'Required'
  booking.corporateGuests.forEach((g, i) => {
    if (!g.fullName) e[`guest_${i}_fullName`] = 'Required'
  })
  errors.value = e
  return Object.keys(e).length === 0
}

function goToConfirmation() {
  const valid = booking.bookingType === 'corporate'
    ? validateCorporate()
    : validateIndividual()
  if (!valid) return
  step.value = 2
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function submit() {
  loading.value = true
  try {
    if (booking.bookingType === 'corporate') {
      await uploadAllDocs()
      const failedUploads = docFiles.value.filter(d => d.file && d.error)
      if (failedUploads.length) {
        errors.value.submit = `${failedUploads.length} document(s) failed to upload. Please remove them and try again.`
        return
      }
      await reservations.create({
        bookingType: 'corporate',
        roomId:      booking.roomId,
        checkIn:     booking.checkIn,
        checkOut:    booking.checkOut,
        client:      booking.corporateClient,
        guests:      booking.corporateGuests,
        documents:   docFiles.value.filter(d => d.url).map(d => d.url),
      })
    } else {
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
    }
    success.value = true
    booking.reset()
    setTimeout(() => router.push({ name: 'bookings' }), 2200)
  } catch (e: any) {
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

function formatDate(d: string | null | undefined): string {
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

    <!-- ── Booking type tabs ────────────────────────────────────────── -->
    <div v-if="step === 1" class="flex justify-center mb-8">
      <div class="flex bg-(--color-surface-container-high) rounded-full p-1 w-full max-w-sm">
        <button
          class="flex-1 py-3 px-6 rounded-full font-sans text-sm font-semibold transition-all"
          :class="booking.bookingType === 'individual'
            ? 'bg-(--color-primary) text-white'
            : 'text-(--color-on-surface-variant) hover:bg-(--color-surface-container)'"
          @click="booking.bookingType = 'individual'"
        >Individual</button>
        <button
          class="flex-1 py-3 px-6 rounded-full font-sans text-sm font-semibold transition-all"
          :class="booking.bookingType === 'corporate'
            ? 'bg-(--color-primary) text-white'
            : 'text-(--color-on-surface-variant) hover:bg-(--color-surface-container)'"
          @click="booking.bookingType = 'corporate'"
        >Corporate</button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      <!-- ── Left: Forms ────────────────────────────────────────────── -->
      <div class="lg:col-span-8 space-y-6">

        <!-- ════ STEP 1: FORMS ════ -->
        <template v-if="step === 1">

          <!-- Individual flow -->
          <template v-if="booking.bookingType === 'individual'">

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

          </template>

          <!-- Corporate flow -->
          <template v-else>

            <!-- Company Details -->
            <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-6">
                <span class="material-symbols-outlined text-(--color-primary)">business</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Company Details</h2>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Company Name <span class="text-(--color-error)">*</span></label>
                  <input v-model="booking.corporateClient.companyName" type="text" placeholder="Acme Corporation Ltd"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.companyName ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.companyName" class="font-sans text-xs text-(--color-error)">{{ errors.companyName }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Registration Number <span class="text-(--color-error)">*</span></label>
                  <input v-model="booking.corporateClient.regNumber" type="text" placeholder="PACRA-12345678"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.regNumber ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.regNumber" class="font-sans text-xs text-(--color-error)">{{ errors.regNumber }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Industry</label>
                  <input v-model="booking.corporateClient.industry" type="text" placeholder="e.g. Mining, Tourism"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                </div>
              </div>
            </section>

            <!-- HOD Contact Details -->
            <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-6">
                <span class="material-symbols-outlined text-(--color-primary)">badge</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">HOD Contact Details</h2>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Name <span class="text-(--color-error)">*</span></label>
                  <input v-model="booking.corporateClient.contactPerson" type="text" placeholder="Jane Smith"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.contactPerson ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.contactPerson" class="font-sans text-xs text-(--color-error)">{{ errors.contactPerson }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Work Email <span class="text-(--color-error)">*</span></label>
                  <input v-model="booking.corporateClient.email" type="email" placeholder="j.smith@acme.com"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.email ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.email" class="font-sans text-xs text-(--color-error)">{{ errors.email }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Work Phone <span class="text-(--color-error)">*</span></label>
                  <input v-model="booking.corporateClient.phone" type="tel" placeholder="+260 97 000 0000"
                    class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                    :class="errors.phone ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  <span v-if="errors.phone" class="font-sans text-xs text-(--color-error)">{{ errors.phone }}</span>
                </div>
              </div>
            </section>

            <!-- Employee Guest List -->
            <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-(--color-primary)">groups</span>
                  <h2 class="font-serif text-xl text-(--color-on-surface)">Employee Guest List</h2>
                </div>
                <button type="button" class="flex items-center gap-1 text-(--color-primary) font-sans text-sm font-semibold hover:underline" @click="booking.addCorporateGuest()">
                  <span class="material-symbols-outlined text-base">add</span> Add Employee
                </button>
              </div>
              <div class="space-y-4">
                <div v-for="(guest, i) in booking.corporateGuests" :key="i"
                  class="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-(--color-surface-container-low) rounded-lg items-end">
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Full Name <span class="text-(--color-error)">*</span></label>
                    <input v-model="guest.fullName" type="text"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 focus:outline-none transition-colors"
                      :class="errors[`guest_${i}_fullName`] ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Email</label>
                    <input v-model="guest.email" type="email"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Passport / ID</label>
                    <input v-model="guest.idNumber" type="text"
                      class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) border-2 border-transparent focus:outline-none focus:border-(--color-primary) transition-colors" />
                  </div>
                  <button type="button"
                    class="h-12 w-12 flex items-center justify-center text-(--color-outline) hover:text-(--color-error) transition-colors ml-auto"
                    :disabled="booking.corporateGuests.length === 1"
                    @click="booking.removeCorporateGuest(i)">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </section>

            <!-- Organization Documents -->
            <section class="bg-(--color-surface-container-lowest) rounded-xl p-6 border border-(--color-outline-variant)">
              <div class="flex items-center gap-2 mb-6">
                <span class="material-symbols-outlined text-(--color-primary)">attach_file</span>
                <h2 class="font-serif text-xl text-(--color-on-surface)">Organization Documents</h2>
              </div>

              <label class="block border-2 border-dashed border-(--color-outline-variant) rounded-xl p-8 text-center hover:bg-(--color-surface-container-low) transition-colors cursor-pointer group">
                <input type="file" class="hidden" multiple accept=".pdf,.jpg,.jpeg,.png" @change="onDocPick" />
                <span class="material-symbols-outlined text-4xl text-(--color-outline) mb-2 block group-hover:text-(--color-primary) transition-colors">upload_file</span>
                <p class="font-sans text-sm font-semibold text-(--color-on-surface-variant)">Click to upload or drag &amp; drop</p>
                <p class="font-sans text-xs text-(--color-outline) mt-1 uppercase tracking-widest">Tax Clearance, Certificate of Incorporation · Max 5MB · PDF, JPG, PNG</p>
              </label>

              <div v-if="docFiles.length" class="mt-4 space-y-3">
                <div v-for="(doc, i) in docFiles" :key="i"
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
                      <div class="h-full bg-(--color-primary) transition-all duration-300 rounded-full" :style="{ width: doc.progress + '%' }"></div>
                    </div>
                  </div>
                  <button type="button" class="text-(--color-outline) hover:text-(--color-error) transition-colors shrink-0" @click="removeDoc(i)">
                    <span class="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              </div>
            </section>

            <!-- Stay Details -->
            <StayDetailsForm :errors="errors" />

            <!-- Additional Requests -->
            <PreferencesForm />

          </template>

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

          <!-- Individual summary -->
          <template v-if="booking.bookingType === 'individual'">
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
          </template>

          <!-- Corporate summary -->
          <template v-else>
            <section class="bg-(--color-surface-container-lowest) rounded-xl p-8 border border-(--color-outline-variant)">
              <div class="flex items-center justify-between mb-6">
                <h2 class="font-serif text-xl flex items-center gap-2">
                  <span class="material-symbols-outlined text-(--color-primary)">business</span>
                  Company Details
                </h2>
                <button class="font-sans text-sm text-(--color-primary) font-semibold hover:underline" @click="step = 1">Edit</button>
              </div>
              <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                <div>
                  <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Company</dt>
                  <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.corporateClient.companyName }}</dd>
                </div>
                <div>
                  <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Reg. Number</dt>
                  <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.corporateClient.regNumber }}</dd>
                </div>
                <div>
                  <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Contact Person</dt>
                  <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.corporateClient.contactPerson }}</dd>
                </div>
                <div>
                  <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Email</dt>
                  <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.corporateClient.email }}</dd>
                </div>
                <div>
                  <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Phone</dt>
                  <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.corporateClient.phone }}</dd>
                </div>
              </dl>
            </section>

            <section class="bg-(--color-surface-container-lowest) rounded-xl p-8 border border-(--color-outline-variant)">
              <h2 class="font-serif text-xl flex items-center gap-2 mb-6">
                <span class="material-symbols-outlined text-(--color-primary)">groups</span>
                Employee Guests ({{ booking.corporateGuests.length }})
              </h2>
              <div class="space-y-3">
                <div v-for="(g, i) in booking.corporateGuests" :key="i"
                  class="flex items-center justify-between p-4 bg-(--color-surface-container-low) rounded-lg">
                  <div>
                    <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ g.fullName }}</p>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">{{ g.email || '—' }} · {{ g.idNumber || 'No ID' }}</p>
                  </div>
                  <span class="font-sans text-xs text-(--color-primary) font-semibold">Guest {{ i + 1 }}</span>
                </div>
              </div>
            </section>
          </template>

          <!-- Stay details (shared) -->
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
              <div v-if="booking.bookingType === 'individual'">
                <dt class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-1">Guests</dt>
                <dd class="font-sans text-sm text-(--color-on-surface)">{{ booking.guestCount }} {{ booking.guestCount === 1 ? 'Adult' : 'Adults' }}</dd>
              </div>
              <div v-if="booking.bookingType === 'individual'">
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

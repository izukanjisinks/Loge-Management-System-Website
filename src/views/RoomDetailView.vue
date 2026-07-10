<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePricing }        from '@/composables/usePricing'
import { Calendar }          from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/index'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'
import api                   from '@/lib/api'

const route  = useRoute()
const router = useRouter()

// â"€â"€ Room data â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
const room       = ref(null)
const apiLoading = ref(false)
const apiError   = ref('')

function amenityIcon(label) {
  const l = label.toLowerCase()
  if (l.includes('wifi') || l.includes('wi-fi'))       return 'wifi'
  if (l.includes('pool'))                              return 'pool'
  if (l.includes('jacuzzi') || l.includes('hot tub')) return 'hot_tub'
  if (l.includes('bar') || l.includes('mini bar'))    return 'local_bar'
  if (l.includes('tv'))                               return 'tv'
  if (l.includes('kitchen'))                          return 'kitchen'
  if (l.includes('fireplace'))                        return 'fireplace'
  if (l.includes('spa'))                              return 'spa'
  if (l.includes('air') || l.includes('ac'))          return 'ac_unit'
  if (l.includes('dining') || l.includes('restaurant')) return 'restaurant'
  if (l.includes('deck') || l.includes('terrace'))    return 'deck'
  if (l.includes('garden') || l.includes('yard'))     return 'yard'
  return 'check_circle'
}

function normalise(r) {
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
  return {
    id:          r.id,
    name:        r.name,
    type:        cap(r.type),
    capacity:    r.capacity,
    price:       parseFloat(r.price_per_night) || 0,
    available:   r.is_available,
    size:        r.size        || '',
    bed:         r.bed_type    || '',
    location:    r.location    || '',
    description: r.description || '',
    images:      r.images?.length ? r.images : [],
    tourUrl:     r.virtual_tour_url || r.tour_url || '',
    amenities:   (r.amenities || []).map(a => ({ icon: amenityIcon(a), label: a })),
    bookedDates: r.booked_dates ?? [],
    orgName:     r.organization?.name || '',
    orgId:       r.organization?.id   || r.org_id || null,
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  apiLoading.value = true
  apiError.value   = ''
  try {
    const res = await api.get(`/guest/rooms/${route.params.id}`)
    room.value = normalise(res.data)
  } catch {
    apiError.value = 'Unable to load room details. Please try again.'
  } finally {
    apiLoading.value = false
  }
})

// â"€â"€ Gallery â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
const activeImg     = ref(0)
const images        = computed(() => room.value?.images ?? [])
const lightboxOpen  = ref(false)
const lightboxIndex = ref(0)

function openLightbox(i) { lightboxIndex.value = i; lightboxOpen.value = true }
function closeLightbox() { lightboxOpen.value = false }
function lightboxPrev() { lightboxIndex.value = (lightboxIndex.value - 1 + images.value.length) % images.value.length }
function lightboxNext() { lightboxIndex.value = (lightboxIndex.value + 1) % images.value.length }

function onKeydown(e) {
  if (!lightboxOpen.value) return
  if (e.key === 'ArrowLeft')  { e.preventDefault(); lightboxPrev() }
  if (e.key === 'ArrowRight') { e.preventDefault(); lightboxNext() }
  if (e.key === 'Escape')     { e.preventDefault(); closeLightbox() }
}
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

// â"€â"€ Booking widget â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
const checkIn      = ref('')
const checkOut     = ref('')
const checkInOpen  = ref(false)
const checkOutOpen = ref(false)
const todayDate    = today(getLocalTimeZone())
const baseRate     = computed(() => room.value?.price ?? 0)

function toIso(cd) {
  if (!cd) return ''
  return `${cd.year}-${String(cd.month).padStart(2, '0')}-${String(cd.day).padStart(2, '0')}`
}

const checkInValue = computed({
  get: () => checkIn.value ? parseDate(checkIn.value) : undefined,
  set: (v) => { checkIn.value = toIso(v); checkInOpen.value = false },
})
const checkOutValue = computed({
  get: () => checkOut.value ? parseDate(checkOut.value) : undefined,
  set: (v) => { checkOut.value = toIso(v); checkOutOpen.value = false },
})
const checkOutMin = computed(() =>
  checkIn.value ? parseDate(checkIn.value).add({ days: 1 }) : todayDate.add({ days: 1 })
)

function formatDisplay(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const { nightCount, baseTotal } = usePricing(
  checkIn, checkOut, baseRate, ref(1), ref('none')
)
const grandTotal = computed(() => baseTotal.value + baseTotal.value * 0.16)

const dateError = computed(() => {
  if (!checkIn.value || !checkOut.value) return ''
  if (new Date(checkOut.value) <= new Date(checkIn.value)) return 'Check-out must be after check-in'
  return ''
})

// null = not checked, 'checking' | 'available' | 'unavailable'
const availabilityStatus = ref(null)

watch([checkIn, checkOut], async ([ci, co]) => {
  if (!ci || !co || new Date(co) <= new Date(ci)) {
    availabilityStatus.value = null
    return
  }
  const orgId = room.value?.orgId || route.query.org_id
  if (!orgId) return
  availabilityStatus.value = 'checking'
  try {
    const { data } = await api.get('/guest/rooms/available', {
      params: { org_id: orgId, check_in: ci, check_out: co },
    })
    const list = data.data ?? data
    availabilityStatus.value = list.some(r => r.id === room.value.id) ? 'available' : 'unavailable'
  } catch {
    availabilityStatus.value = null
  }
})

const canBook = computed(() =>
  !!checkIn.value && !!checkOut.value && !dateError.value &&
  availabilityStatus.value === 'available'
)

const bookButtonLabel = computed(() => {
  if (!checkIn.value || !checkOut.value) return 'Select Dates to Book'
  if (availabilityStatus.value === 'checking')    return 'Checking availability…'
  if (availabilityStatus.value === 'unavailable') return 'Room Not Available'
  if (availabilityStatus.value === 'available')   return 'Book Now'
  return 'Select Dates to Book'
})

function openBooking() {
  if (!canBook.value) return
  router.push({
    name:   'accommodation-booking',
    params: { id: room.value.orgId },
    query:  {
      context:  'individual',
      roomId:   room.value.id,
      roomName: room.value.name,
      roomType: room.value.type,
      rate:     room.value.price,
      checkIn:  checkIn.value,
      checkOut: checkOut.value,
    },
  })
}
</script>

<template>
  <!-- Loading -->
  <div v-if="apiLoading" class="max-w-[1280px] mx-auto px-5 md:px-16 py-8 animate-pulse">
    <div class="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-96 mb-8">
      <div class="md:col-span-2 md:row-span-2 rounded-xl bg-(--color-surface-container-high)"></div>
      <div class="hidden md:block rounded-xl bg-(--color-surface-container-high)"></div>
      <div class="hidden md:block rounded-xl bg-(--color-surface-container-high)"></div>
      <div class="hidden md:block md:col-span-2 rounded-xl bg-(--color-surface-container-high)"></div>
    </div>
    <div class="h-8 bg-(--color-surface-container-high) rounded max-w-xs mb-4"></div>
    <div class="h-24 bg-(--color-surface-container-high) rounded"></div>
  </div>

  <!-- Error -->
  <div v-else-if="apiError" class="max-w-[1280px] mx-auto px-5 md:px-16 py-32 text-center">
    <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-4">error</span>
    <p class="font-serif text-xl text-(--color-on-surface) mb-2">Room not found</p>
    <p class="font-sans text-sm text-(--color-on-surface-variant)">{{ apiError }}</p>
  </div>

  <div v-else-if="room" class="max-w-[1280px] mx-auto pb-24">

    <!-- Back button -->
    <div class="px-5 md:px-16 pt-6">
      <button type="button"
        class="flex items-center gap-1.5 font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) transition-colors"
        @click="room.orgId ? router.push({ name: 'lodge-detail', params: { id: room.orgId } }) : router.back()">
        <span class="material-symbols-outlined text-base">arrow_back</span>
        {{ room.orgName || 'Back to Rooms' }}
      </button>
    </div>

    <!-- Gallery -->
    <section class="px-5 md:px-16 mt-4">

      <!-- No images: elegant hero placeholder -->
      <div v-if="!images.length"
        class="relative h-64 md:h-[420px] rounded-2xl overflow-hidden flex items-center justify-center"
        style="background: linear-gradient(145deg, var(--color-savannah-mist) 0%, var(--color-surface-container-high) 55%, var(--color-savannah-mist) 100%)">
        <div class="absolute inset-0 pointer-events-none opacity-[0.06]"
          style="background-image: radial-gradient(circle, var(--color-primary) 1.5px, transparent 1.5px); background-size: 28px 28px"></div>
        <div class="relative flex flex-col items-center gap-5 text-center px-8">
          <div class="w-24 h-24 rounded-full flex items-center justify-center"
            style="background: color-mix(in srgb, var(--color-primary) 10%, transparent); border: 2px solid color-mix(in srgb, var(--color-primary) 22%, transparent)">
            <span class="material-symbols-outlined text-5xl text-(--color-primary)">hotel</span>
          </div>
          <div>
            <p class="font-serif text-3xl font-semibold text-(--color-on-surface)">{{ room.name }}</p>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mt-2 flex items-center justify-center gap-1.5">
              <span class="material-symbols-outlined text-base">camera_alt</span>
              Photography coming soon
            </p>
          </div>
        </div>
      </div>

      <!-- Has images: bento grid -->
      <div v-else class="relative grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-96 md:h-[500px]">

        <!-- Main image -->
        <div class="md:col-span-2 md:row-span-2 relative overflow-hidden rounded-2xl cursor-pointer group/main"
          @click="openLightbox(0)">
          <img :src="images[0]" :alt="room.name"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/main:scale-105"
            loading="eager" />
          <div class="absolute inset-0 bg-black/0 group-hover/main:bg-black/10 transition-colors rounded-2xl flex items-center justify-center">
            <span class="material-symbols-outlined text-4xl text-white opacity-0 group-hover/main:opacity-100 transition-opacity drop-shadow">zoom_in</span>
          </div>
        </div>

        <!-- Slot 2 -->
        <div class="hidden md:block relative overflow-hidden rounded-2xl"
          :class="images[1] ? 'cursor-pointer group/s2' : ''"
          @click="images[1] ? openLightbox(1) : undefined">
          <img v-if="images[1]" :src="images[1]" :alt="`${room.name} 2`"
            class="absolute inset-0 w-full h-full object-cover group-hover/s2:scale-105 transition-transform duration-700" loading="lazy" />
          <div v-if="images[1]" class="absolute inset-0 bg-black/0 group-hover/s2:bg-black/15 transition-colors rounded-2xl"></div>
          <div v-else class="absolute inset-0 rounded-2xl"
            style="background: linear-gradient(135deg, var(--color-surface-container) 0%, var(--color-surface-container-high) 100%)"></div>
        </div>

        <!-- Slot 3 -->
        <div class="hidden md:block relative overflow-hidden rounded-2xl"
          :class="images[2] ? 'cursor-pointer group/s3' : ''"
          @click="images[2] ? openLightbox(2) : undefined">
          <img v-if="images[2]" :src="images[2]" :alt="`${room.name} 3`"
            class="absolute inset-0 w-full h-full object-cover group-hover/s3:scale-105 transition-transform duration-700" loading="lazy" />
          <div v-if="images[2]" class="absolute inset-0 bg-black/0 group-hover/s3:bg-black/15 transition-colors rounded-2xl"></div>
          <div v-else class="absolute inset-0 rounded-2xl"
            style="background: linear-gradient(135deg, var(--color-surface-container-high) 0%, var(--color-surface-container) 100%)"></div>
        </div>

        <!-- Slot 4 -->
        <div class="hidden md:block md:col-span-2 relative overflow-hidden rounded-2xl"
          :class="images[3] ? 'cursor-pointer group/s4' : ''"
          @click="images[3] ? openLightbox(3) : undefined">
          <img v-if="images[3]" :src="images[3]" :alt="`${room.name} 4`"
            class="absolute inset-0 w-full h-full object-cover group-hover/s4:scale-105 transition-transform duration-700" loading="lazy" />
          <div v-if="images[3]" class="absolute inset-0 bg-black/0 group-hover/s4:bg-black/15 transition-colors rounded-2xl"></div>
          <div v-else class="absolute inset-0 rounded-2xl"
            style="background: linear-gradient(135deg, var(--color-surface-container) 0%, var(--color-surface-container-high) 100%)"></div>
          <button v-if="images.length > 4" type="button"
            class="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-(--color-on-surface) font-sans text-sm font-semibold px-4 py-2 rounded-full shadow hover:bg-white transition-colors"
            @click.stop="openLightbox(0)">
            <span class="material-symbols-outlined text-base">photo_library</span>
            View all {{ images.length }} photos
          </button>
        </div>
      </div>
    </section>

    <!-- 3D Virtual Tour -->
    <section v-if="room.tourUrl" class="px-5 md:px-16 mt-8">
      <h2 class="font-serif text-2xl text-(--color-on-surface) mb-4 flex items-center gap-2">
        <span class="material-symbols-outlined text-(--color-primary)">3d_rotation</span>
        Virtual Tour
      </h2>
      <div class="relative w-full rounded-2xl overflow-hidden border border-(--color-outline-variant) shadow-sm" style="padding-top:56.25%">
        <iframe :src="room.tourUrl" class="absolute inset-0 w-full h-full" allowfullscreen
          allow="xr-spatial-tracking; gyroscope; accelerometer" loading="lazy" title="360° Virtual Tour"></iframe>
      </div>
    </section>

    <!-- Lightbox -->
    <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="transition duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="lightboxOpen" class="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md"
        @click.self="closeLightbox">
        <!-- Top bar -->
        <div class="flex items-center justify-between px-6 py-4 shrink-0">
          <p class="font-sans text-sm text-white/70">{{ lightboxIndex + 1 }} / {{ images.length }}</p>
          <button type="button"
            class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            @click="closeLightbox">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <!-- Main image -->
        <div class="flex-1 flex items-center justify-center px-16 min-h-0 relative">
          <button type="button"
            class="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            @click="lightboxPrev">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100" mode="out-in">
            <img :key="lightboxIndex" :src="images[lightboxIndex]" :alt="`${room.name} ${lightboxIndex + 1}`"
              class="max-h-full max-w-full object-contain rounded-lg select-none" draggable="false" />
          </Transition>
          <button type="button"
            class="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            @click="lightboxNext">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
        <!-- Thumbnail strip -->
        <div class="shrink-0 px-6 py-4 flex gap-2 overflow-x-auto justify-center">
          <button v-for="(img, i) in images" :key="i" type="button"
            class="shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 transition-all"
            :class="i === lightboxIndex ? 'border-white opacity-100' : 'border-transparent opacity-40 hover:opacity-70'"
            @click="lightboxIndex = i">
            <img :src="img" :alt="`Thumbnail ${i + 1}`" class="w-full h-full object-cover" loading="lazy" />
          </button>
        </div>
      </div>
    </Transition>

    <!-- â"€â"€ Lodge Info & Booking â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ -->
    <div class="px-5 md:px-16 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">

      <!-- Left: Description & Amenities -->
      <div class="lg:col-span-2 space-y-8">

        <!-- Title -->
        <div>
          <h1 class="font-serif text-[32px] font-semibold leading-10 mb-2">{{ room.name }}</h1>
          <div class="flex flex-wrap items-center gap-4 text-(--color-on-surface-variant)">
            <div v-if="room.location" class="flex items-center gap-2">
              <span class="material-symbols-outlined text-(--color-primary)">location_on</span>
              <span class="font-sans text-base">{{ room.location }}</span>
            </div>
            <div v-if="room.orgName" class="flex items-center gap-2">
              <span class="material-symbols-outlined text-(--color-primary)">apartment</span>
              <span class="font-sans text-base">{{ room.orgName }}</span>
            </div>
            <span class="font-sans text-xs font-semibold px-3 py-1 rounded-full"
              :class="room.available
                ? 'bg-emerald-500/15 text-emerald-700'
                : 'bg-rose-500/15 text-rose-700'">
              {{ room.available ? 'In Service' : 'Out of Service' }}
            </span>
          </div>
        </div>

        <!-- About -->
        <div class="bg-(--color-surface-container-lowest) p-8 rounded-2xl shadow-sm">
          <h2 class="font-serif text-2xl font-semibold text-(--color-on-surface) mb-4">About this Room</h2>
          <p class="font-sans text-base text-(--color-on-surface-variant) leading-relaxed">
            {{ room.description || 'A premium retreat designed for discerning travellers seeking comfort, authenticity, and the finest African hospitality.' }}
          </p>
          <div class="flex flex-wrap gap-4 mt-6 text-(--color-on-surface-variant) font-sans text-sm">
            <div v-if="room.type" class="flex items-center gap-2">
              <span class="material-symbols-outlined text-(--color-primary)">bed</span>
              {{ room.type }}
            </div>
            <div v-if="room.capacity" class="flex items-center gap-2">
              <span class="material-symbols-outlined text-(--color-primary)">group</span>
              Up to {{ room.capacity }} guests
            </div>
            <div v-if="room.size" class="flex items-center gap-2">
              <span class="material-symbols-outlined text-(--color-primary)">straighten</span>
              {{ room.size }}
            </div>
            <div v-if="room.bed" class="flex items-center gap-2">
              <span class="material-symbols-outlined text-(--color-primary)">king_bed</span>
              {{ room.bed }}
            </div>
          </div>
        </div>

        <!-- Amenities -->
        <div v-if="room.amenities.length" class="bg-(--color-surface-container-lowest) p-8 rounded-2xl">
          <h2 class="font-serif text-2xl font-semibold text-(--color-on-surface) mb-6">Amenities</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div v-for="a in room.amenities" :key="a.label" class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-(--color-savannah-mist) flex items-center justify-center text-(--color-primary) shrink-0">
                <span class="material-symbols-outlined">{{ a.icon }}</span>
              </div>
              <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ a.label }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Right: Sticky Booking Widget -->
      <aside class="lg:sticky lg:top-28 space-y-4">
        <div class="bg-(--color-surface-container-lowest) p-6 rounded-2xl shadow-lg">

          <!-- Price -->
          <div class="flex items-baseline justify-between mb-6">
            <span class="font-serif text-2xl text-(--color-on-surface)">K{{ room.price.toLocaleString() }}</span>
            <span class="font-sans text-sm text-(--color-on-surface-variant)">/ night</span>
          </div>

          <!-- Check In -->
          <div class="mb-3">
            <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check In</label>
            <Popover v-model:open="checkInOpen">
              <PopoverTrigger as-child>
                <button type="button"
                  class="mt-1.5 w-full bg-(--color-savannah-mist) rounded-xl px-3 py-3 flex items-center gap-2 text-left border-2 transition-colors focus:outline-none"
                  :class="checkIn ? 'border-(--color-primary)' : 'border-transparent hover:border-(--color-primary)'">
                  <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0">calendar_today</span>
                  <span class="font-sans text-sm flex-1"
                    :class="checkIn ? 'text-(--color-on-surface) font-semibold' : 'text-(--color-outline)'">
                    {{ checkIn ? formatDisplay(checkIn) : 'Select date' }}
                  </span>
                  <span v-if="checkIn" class="material-symbols-outlined text-base text-(--color-outline) hover:text-(--color-error) shrink-0"
                    @click.stop="checkIn = ''">close</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" class="w-auto">
                <Calendar v-model="checkInValue" :min-value="todayDate" layout="month-and-year" />
              </PopoverContent>
            </Popover>
          </div>

          <!-- Check Out -->
          <div class="mb-5">
            <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check Out</label>
            <Popover v-model:open="checkOutOpen">
              <PopoverTrigger as-child>
                <button type="button"
                  class="mt-1.5 w-full bg-(--color-savannah-mist) rounded-xl px-3 py-3 flex items-center gap-2 text-left border-2 transition-colors focus:outline-none"
                  :class="checkOut ? 'border-(--color-primary)' : 'border-transparent hover:border-(--color-primary)'">
                  <span class="material-symbols-outlined text-base text-(--color-primary) shrink-0">calendar_today</span>
                  <span class="font-sans text-sm flex-1"
                    :class="checkOut ? 'text-(--color-on-surface) font-semibold' : 'text-(--color-outline)'">
                    {{ checkOut ? formatDisplay(checkOut) : 'Select date' }}
                  </span>
                  <span v-if="checkOut" class="material-symbols-outlined text-base text-(--color-outline) hover:text-(--color-error) shrink-0"
                    @click.stop="checkOut = ''">close</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" class="w-auto">
                <Calendar v-model="checkOutValue" :min-value="checkOutMin" layout="month-and-year" />
              </PopoverContent>
            </Popover>
            <p v-if="dateError" class="mt-1.5 font-sans text-xs text-(--color-error)">{{ dateError }}</p>
          </div>

          <!-- Night summary -->
          <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-200"
            leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-1">
            <div v-if="nightCount > 0" class="mb-5 p-4 bg-(--color-savannah-mist) rounded-xl space-y-2">
              <div class="flex justify-between font-sans text-sm text-(--color-on-surface-variant)">
                <span>K{{ room.price.toLocaleString() }} &times; {{ nightCount }} night{{ nightCount !== 1 ? 's' : '' }}</span>
                <span>K{{ Number(baseTotal.toFixed(0)).toLocaleString() }}</span>
              </div>
              <div class="flex justify-between font-sans text-sm text-(--color-on-surface-variant)">
                <span>VAT (16%)</span>
                <span>K{{ Number((baseTotal * 0.16).toFixed(0)).toLocaleString() }}</span>
              </div>
              <div class="flex justify-between font-sans text-sm font-bold text-(--color-on-surface) pt-2 border-t border-(--color-outline-variant)">
                <span>Estimated Total</span>
                <span>K{{ Number(grandTotal.toFixed(0)).toLocaleString() }}</span>
              </div>
            </div>
          </Transition>

          <!-- Book button -->
          <button
            :disabled="!canBook || availabilityStatus === 'checking'"
            class="w-full py-3.5 rounded-full font-sans text-base font-semibold flex items-center justify-center gap-2 transition-all"
            :class="canBook
              ? 'bg-(--color-primary) text-white hover:bg-(--color-clay-earth) shadow-md active:scale-95'
              : availabilityStatus === 'unavailable'
                ? 'bg-rose-500/10 text-rose-700 cursor-not-allowed'
                : 'bg-(--color-surface-container-high) text-(--color-on-surface-variant) cursor-not-allowed'"
            @click="openBooking">
            <span class="material-symbols-outlined text-base"
              :class="{ 'animate-spin': availabilityStatus === 'checking' }">
              {{ availabilityStatus === 'checking' ? 'sync' : availabilityStatus === 'unavailable' ? 'event_busy' : 'event_available' }}
            </span>
            {{ bookButtonLabel }}
          </button>

          <!-- Unavailable notice -->
          <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-200"
            leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-1">
            <div v-if="availabilityStatus === 'unavailable'"
              class="mt-3 flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 text-rose-700">
              <span class="material-symbols-outlined text-base mt-0.5 shrink-0">event_busy</span>
              <p class="font-sans text-xs leading-relaxed">
                This room is already booked for the selected dates. Please choose different dates.
              </p>
            </div>
          </Transition>
        </div>
      </aside>
    </div>

  </div>

</template>

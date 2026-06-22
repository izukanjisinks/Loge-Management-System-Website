<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookingStore }   from '@/stores/booking'
import { useAuthStore }      from '@/stores/auth'
import { usePricing }        from '@/composables/usePricing'
import { RangeCalendar }     from '@/components/ui/range-calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/index'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'
import api                   from '@/lib/api'
import BookingTypeModal      from '@/components/booking/BookingTypeModal.vue'

const route   = useRoute()
const router  = useRouter()
const booking = useBookingStore()
const auth    = useAuthStore()

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
    orgId:       r.organization?.id   || null,
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
const checkIn    = ref('')
const checkOut   = ref('')
const guestCount = ref(1)
const baseRate   = computed(() => room.value?.price ?? 0)
const calendarOpen = ref(false)
const todayDate    = today(getLocalTimeZone())

function toIso(cd) {
  if (!cd) return ''
  return `${cd.year}-${String(cd.month).padStart(2, '0')}-${String(cd.day).padStart(2, '0')}`
}

const dateRange = computed({
  get: () => ({
    start: checkIn.value ? parseDate(checkIn.value) : undefined,
    end:   checkOut.value ? parseDate(checkOut.value) : undefined,
  }),
  set: (v) => {
    checkIn.value  = toIso(v?.start)
    checkOut.value = toIso(v?.end)
    if (v?.start && v?.end) calendarOpen.value = false
  },
})

const isDateUnavailable = computed(() => {
  const booked = room.value?.bookedDates ?? []
  if (!booked.length) return () => false
  return (date) => {
    const d = toIso(date)
    return booked.some(b => d >= b.check_in && d < b.check_out)
  }
})

function formatDisplay(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const { nightCount, baseTotal } = usePricing(
  checkIn, checkOut, baseRate, guestCount, ref('none')
)
const grandTotal = computed(() => baseTotal.value + baseTotal.value * 0.12)

const dateError = computed(() => {
  if (!checkIn.value || !checkOut.value) return ''
  if (new Date(checkOut.value) <= new Date(checkIn.value)) return 'Check-out must be after check-in'
  return ''
})

const bookingModalOpen = ref(false)

function openBooking() {
  if (!checkIn.value || !checkOut.value || dateError.value) return
  bookingModalOpen.value = true
}

function onBookingTypeConfirmed() {
  router.push({
    name:   'accommodation-booking',
    params: { id: room.value.orgId },
    query:  {
      roomId:   room.value.id,
      roomName: room.value.name,
      roomType: room.value.type,
      rate:     room.value.price,
      checkIn:  checkIn.value  || undefined,
      checkOut: checkOut.value || undefined,
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

    <!-- Bento Image Gallery -->
    <section class="px-5 md:px-16 mt-4">
      <div class="relative grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-96 md:h-[500px]">
        <!-- Main image -->
        <div class="md:col-span-2 md:row-span-2 relative overflow-hidden rounded-xl cursor-pointer group/main"
          @click="openLightbox(0)">
          <img v-if="images[0]" :src="images[0]" :alt="room.name"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/main:scale-105"
            loading="eager" />
          <div v-else class="absolute inset-0 w-full h-full bg-(--color-surface-container) flex items-center justify-center">
            <span class="material-symbols-outlined text-5xl text-(--color-outline)">image_not_supported</span>
          </div>
          <div class="absolute inset-0 bg-black/0 group-hover/main:bg-black/10 transition-colors rounded-xl flex items-center justify-center">
            <span class="material-symbols-outlined text-4xl text-white opacity-0 group-hover/main:opacity-100 transition-opacity drop-shadow">zoom_in</span>
          </div>
        </div>

        <!-- Secondary images -->
        <div v-if="images[1]" class="hidden md:block relative overflow-hidden rounded-xl cursor-pointer group/s" @click="openLightbox(1)">
          <img :src="images[1]" :alt="`${room.name} 2`" class="absolute inset-0 w-full h-full object-cover group-hover/s:scale-105 transition-transform duration-700" loading="lazy" />
          <div class="absolute inset-0 bg-black/0 group-hover/s:bg-black/15 transition-colors rounded-xl"></div>
        </div>
        <div v-if="images[2]" class="hidden md:block relative overflow-hidden rounded-xl cursor-pointer group/s" @click="openLightbox(2)">
          <img :src="images[2]" :alt="`${room.name} 3`" class="absolute inset-0 w-full h-full object-cover group-hover/s:scale-105 transition-transform duration-700" loading="lazy" />
          <div class="absolute inset-0 bg-black/0 group-hover/s:bg-black/15 transition-colors rounded-xl"></div>
        </div>
        <div v-if="images[3]" class="hidden md:block md:col-span-2 relative overflow-hidden rounded-xl cursor-pointer group/s" @click="openLightbox(3)">
          <img :src="images[3]" :alt="`${room.name} 4`" class="absolute inset-0 w-full h-full object-cover group-hover/s:scale-105 transition-transform duration-700" loading="lazy" />
          <div class="absolute inset-0 bg-black/0 group-hover/s:bg-black/15 transition-colors rounded-xl"></div>
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
      <div class="relative w-full rounded-xl overflow-hidden border border-(--color-outline-variant) shadow-sm" style="padding-top:56.25%">
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
                ? 'bg-(--color-tertiary-fixed) text-(--color-tertiary)'
                : 'bg-(--color-error-container) text-(--color-on-error-container)'"
            >
              {{ room.available ? 'Available' : 'Fully Booked' }}
            </span>
          </div>
        </div>

        <!-- About -->
        <div class="bg-(--color-surface-container-lowest) p-8 rounded-xl border border-(--color-savannah-mist) shadow-sm">
          <h2 class="font-serif text-2xl mb-4">About the Sanctuary</h2>
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
        <div v-if="room.amenities.length">
          <h3 class="font-serif text-2xl mb-6">World-Class Amenities</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div
              v-for="a in room.amenities"
              :key="a.label"
              class="flex items-center gap-3"
            >
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
        <div class="bg-(--color-surface-container-high) p-6 rounded-xl border border-(--color-outline-variant) shadow-lg">

          <!-- Price -->
          <div class="flex justify-between items-baseline mb-6">
            <span class="font-serif text-2xl text-(--color-on-surface)">
              K{{ room.price.toLocaleString() }}
            </span>
            <span class="font-sans text-sm text-(--color-on-surface-variant)">/ night</span>
          </div>

          <div class="space-y-4">
            <!-- Date picker -->
            <div class="grid grid-cols-2 gap-2">
              <Popover v-model:open="calendarOpen">
                <PopoverTrigger as-child>
                  <button
                    type="button"
                    class="col-span-2 bg-(--color-surface) p-3 rounded border border-(--color-outline-variant) flex items-center justify-between gap-2 text-left w-full hover:border-(--color-primary) transition-colors"
                  >
                    <div class="flex flex-col gap-0.5">
                      <span class="font-sans text-[10px] font-bold uppercase tracking-wider text-(--color-on-surface-variant)">
                        {{ checkIn && checkOut ? 'Check In &rarr; Check Out' : 'Select Dates' }}
                      </span>
                      <span class="font-sans text-sm font-semibold text-(--color-on-surface)">
                        {{ checkIn ? formatDisplay(checkIn) : 'Add dates' }}
                        <template v-if="checkIn || checkOut"> &rarr; {{ checkOut ? formatDisplay(checkOut) : '&mdash;' }}</template>
                      </span>
                    </div>
                    <span class="material-symbols-outlined text-sm text-(--color-on-surface-variant) shrink-0">calendar_month</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" class="w-auto">
                  <RangeCalendar
                    v-model="dateRange"
                    :min-value="todayDate"
                    :is-date-unavailable="isDateUnavailable"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <p v-if="dateError" class="font-sans text-xs text-(--color-error)">{{ dateError }}</p>

            <!-- Guests -->
            <div class="bg-(--color-surface) p-3 rounded border border-(--color-outline-variant) flex justify-between items-center">
              <div class="flex flex-col gap-0.5">
                <span class="font-sans text-[10px] font-bold uppercase tracking-wider text-(--color-on-surface-variant)">Guests</span>
                <span class="font-sans text-sm font-semibold text-(--color-on-surface)">
                  {{ guestCount }} {{ guestCount === 1 ? 'Adult' : 'Adults' }}
                </span>
              </div>
              <div class="flex items-center gap-3">
                <button
                  class="w-7 h-7 rounded-full border border-(--color-outline-variant) flex items-center justify-center text-(--color-on-surface) font-bold hover:border-(--color-primary) hover:text-(--color-primary) transition-colors disabled:opacity-30"
                  :disabled="guestCount <= 1"
                  @click="guestCount = Math.max(1, guestCount - 1)"
                >&minus;</button>
                <span class="font-sans text-sm font-semibold w-4 text-center">{{ guestCount }}</span>
                <button
                  class="w-7 h-7 rounded-full border border-(--color-outline-variant) flex items-center justify-center text-(--color-on-surface) font-bold hover:border-(--color-primary) hover:text-(--color-primary) transition-colors disabled:opacity-30"
                  :disabled="guestCount >= room.capacity"
                  @click="guestCount = Math.min(room.capacity, guestCount + 1)"
                >+</button>
              </div>
            </div>

            <!-- CTA -->
            <button
              class="w-full bg-(--color-primary) text-white py-4 rounded-lg font-sans text-base font-semibold hover:bg-(--color-clay-earth) transition-colors active:scale-95 duration-150 shadow-md flex items-center justify-center gap-2"
              :class="(!checkIn || !checkOut || !!dateError) && 'opacity-60 pointer-events-none'"
              @click="openBooking"
            >
              <span class="material-symbols-outlined text-base">event_available</span>
              Book Now
            </button>
          </div>

          <!-- Price breakdown -->
          <Transition
            enter-active-class="transition duration-300"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
          >
            <div v-if="nightCount > 0" class="mt-6 pt-6 border-t border-(--color-outline-variant) space-y-2">
              <div class="flex justify-between text-(--color-on-surface-variant) font-sans text-sm">
                <span>K{{ room.price.toLocaleString() }} &times; {{ nightCount }} nights</span>
                <span>K{{ Number(baseTotal.toFixed(0)).toLocaleString() }}</span>
              </div>
              <div class="flex justify-between text-(--color-on-surface-variant) font-sans text-sm">
                <span>Conservation Levy</span>
                <span>K{{ Number((baseTotal * 0.12).toFixed(0)).toLocaleString() }}</span>
              </div>
              <div class="flex justify-between font-bold text-lg pt-2 font-sans">
                <span>Total</span>
                <span>K{{ Number(grandTotal.toFixed(0)).toLocaleString() }}</span>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Info note -->
        <div class="p-4 bg-(--color-tertiary-fixed) rounded-lg flex items-start gap-3">
          <span class="material-symbols-outlined text-(--color-primary)">info</span>
          <p class="font-sans text-sm text-(--color-on-tertiary-fixed-variant)">
            Our prices include full-board dining and guided experiences daily.
          </p>
        </div>
      </aside>
    </div>

  </div>

  <BookingTypeModal
    v-model="bookingModalOpen"
    :context="room ? { itemType: 'room', name: room.name, lodgeName: room.orgName } : {}"
    @confirm="onBookingTypeConfirmed"
  />
</template>

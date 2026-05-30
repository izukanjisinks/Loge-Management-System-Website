<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useAuthStore } from '@/stores/auth'
import { usePricing } from '@/composables/usePricing'
import { amenityIcon } from '@/composables/useRooms'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/index'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'
import api from '@/lib/api'

const route = useRoute()
const router = useRouter()
const booking = useBookingStore()
const auth = useAuthStore()

// ── Types ──────────────────────────────────────────────────────────────────────
interface RoomDetail {
  id: string
  name: string
  type: string
  capacity: number
  price: number
  available: boolean
  size: string
  bed: string
  location: string
  description: string
  images: string[]
  amenities: { icon: string; label: string }[]
  bookedDates: string[]
  orgName: string
  orgId: string | null
}

// ── Room data ──────────────────────────────────────────────────────────────────
const room = ref<RoomDetail | null>(null)
const apiLoading = ref(false)
const apiError = ref('')

function normalise(r: Record<string, any>): RoomDetail {
  const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
  return {
    id: r.id,
    name: r.name,
    type: cap(r.type as string),
    capacity: r.capacity,
    price: parseFloat(r.price_per_night) || 0,
    available: r.is_available,
    size: r.size || '',
    bed: r.bed_type || '',
    location: r.location || '',
    description: r.description || '',
    images:      r.images?.length ? r.images : [],
    amenities:   (r.amenities || []).map((a: string) => ({ icon: amenityIcon(a), label: a })),
    bookedDates: r.booked_dates ?? [],
    orgName:     r.organization?.name || '',
    orgId:       r.organization?.id   || null,
  }
}

onMounted(async () => {
  apiLoading.value = true
  apiError.value = ''
  try {
    const { data } = await api.get(`/guest/rooms/${route.params.id}`)
    room.value = normalise(data)
    if (room.value.orgId) {
      try {
        const { data: lodge } = await api.get(`/guest/lodges/${room.value.orgId}`)
        room.value.orgName = lodge.name ?? ''
      } catch { /* non-critical */ }
    }
  } catch {
    apiError.value = 'Unable to load room details. Please try again.'
  } finally {
    apiLoading.value = false
  }
})

// ── Gallery ────────────────────────────────────────────────────────────────────
const activeImg = ref(0)
const images = computed(() => room.value?.images ?? [])

// ── Availability check state (declared before date pickers reference it) ───────
const checked = ref(false)
const isAvail = ref(false)
const checkLoading = ref(false)
const checkError = ref('')

// ── Date selection ─────────────────────────────────────────────────────────────
const checkIn = ref('')
const checkOut = ref('')
const guestCount = ref(1)
const baseRate = computed(() => room.value?.price ?? 0)
const todayDate = today(getLocalTimeZone())
const checkInOpen = ref(false)
const checkOutOpen = ref(false)

function toIso(cd: { year: number; month: number; day: number } | null | undefined): string {
  if (!cd) return ''
  return `${cd.year}-${String(cd.month).padStart(2, '0')}-${String(cd.day).padStart(2, '0')}`
}

function formatDisplay(iso: string): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const checkInValue = computed({
  get: () => checkIn.value ? parseDate(checkIn.value) : undefined,
  set: (v: any) => {
    checkIn.value = toIso(v)
    checkInOpen.value = false
    checked.value = false
    isAvail.value = false
  },
})

const checkOutValue = computed({
  get: () => checkOut.value ? parseDate(checkOut.value) : undefined,
  set: (v: any) => {
    checkOut.value = toIso(v)
    checkOutOpen.value = false
    checked.value = false
    isAvail.value = false
  },
})

const checkOutMin = computed(() =>
  checkIn.value ? parseDate(checkIn.value).add({ days: 1 }) : todayDate.add({ days: 1 })
)

const dateError = computed(() => {
  if (!checkIn.value || !checkOut.value) return ''
  if (new Date(checkOut.value) <= new Date(checkIn.value)) return 'Check-out must be after check-in'
  return ''
})

const { nightCount: nights, baseTotal } = usePricing(
  checkIn, checkOut, baseRate, guestCount, ref('none')
)
const grandTotal = computed(() => baseTotal.value + baseTotal.value * 0.12)

// ── Availability check ─────────────────────────────────────────────────────────
async function checkAvailability() {
  if (!checkIn.value || !checkOut.value || dateError.value) return
  checkLoading.value = true
  checkError.value = ''
  checked.value = false
  try {
    const { data } = await api.get('/guest/rooms', {
      params: { check_in: checkIn.value, check_out: checkOut.value, org_id: room.value?.orgId, page_size: 100 },
    })
    const list: any[] = Array.isArray(data) ? data : (data.data ?? [])
    isAvail.value = list.some((r: any) => r.id === room.value?.id)
    checked.value = true
  } catch (err: any) {
    checkError.value =
      err?.response?.data?.error?.message ||
      err?.response?.data?.message ||
      'Unable to check availability. Please try again.'
  } finally {
    checkLoading.value = false
  }
}

// ── Reserve ────────────────────────────────────────────────────────────────────
function reserve() {
  if (!room.value || !checkIn.value || !checkOut.value || !isAvail.value) return
  booking.setRoom(room.value.id, room.value.type, room.value.price, room.value.orgId, room.value.orgName)
  booking.setDates(checkIn.value, checkOut.value)
  booking.setMealPlan(null, 'Room Only', 0)
  booking.guestCount = guestCount.value
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: `/reserve/${room.value.id}` } })
  } else {
    router.push({ name: 'reservation', params: { roomId: room.value.id } })
  }
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

    <!-- Image Gallery -->
    <section class="px-5 md:px-16 mt-8">
      <div class="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-96 md:h-150">

        <!-- Main image -->
        <div class="md:col-span-2 md:row-span-2 relative overflow-hidden rounded-xl cursor-pointer"
          @click="activeImg = 0">
          <img v-if="images[0]" :src="images[activeImg] || images[0]" :alt="room.name"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            loading="eager" />
          <div v-else
            class="absolute inset-0 w-full h-full bg-(--color-surface-container) flex items-center justify-center">
            <span class="material-symbols-outlined text-5xl text-(--color-outline)">image_not_supported</span>
          </div>
          <template v-if="images.length > 1">
            <button
              class="absolute left-4 top-[50%] -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
              @click.stop="activeImg = (activeImg - 1 + images.length) % images.length">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              class="absolute right-4 top-[50%] -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
              @click.stop="activeImg = (activeImg + 1) % images.length">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </template>
        </div>

        <!-- Secondary image 1 -->
        <div class="hidden md:block relative overflow-hidden rounded-xl bg-(--color-surface-container-low)">
          <img v-if="images[1]" :src="images[1]" :alt="`${room.name} 2`"
            class="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-pointer"
            loading="lazy" @click="activeImg = 1" />
          <div v-else class="absolute inset-0 flex items-center justify-center">
            <span class="material-symbols-outlined text-4xl text-(--color-outline)">image_not_supported</span>
          </div>
        </div>

        <!-- Secondary image 2 -->
        <div class="hidden md:block relative overflow-hidden rounded-xl bg-(--color-surface-container-low)">
          <img v-if="images[2]" :src="images[2]" :alt="`${room.name} 3`"
            class="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-pointer"
            loading="lazy" @click="activeImg = 2" />
          <div v-else class="absolute inset-0 flex items-center justify-center">
            <span class="material-symbols-outlined text-4xl text-(--color-outline)">image_not_supported</span>
          </div>
        </div>

        <!-- Secondary image 3 (wide) -->
        <div
          class="hidden md:block md:col-span-2 relative overflow-hidden rounded-xl bg-(--color-surface-container-low)">
          <img v-if="images[3]" :src="images[3]" :alt="`${room.name} 4`"
            class="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-pointer"
            loading="lazy" @click="activeImg = 3" />
          <div v-else class="absolute inset-0 flex items-center justify-center">
            <span class="material-symbols-outlined text-4xl text-(--color-outline)">image_not_supported</span>
          </div>
        </div>

      </div>
    </section>

    <!-- Date picker panel -->
    <div class="px-5 md:px-16 mt-8">
      <div
        class="flex flex-col sm:flex-row gap-4 p-5 bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) mb-6">

        <!-- Check-in -->
        <div class="flex-1 flex flex-col gap-1">
          <label
            class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-in</label>
          <Popover v-model:open="checkInOpen">
            <PopoverTrigger as-child>
              <button type="button"
                class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 flex items-center gap-2 text-left focus:outline-none">
                <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
                <span class="font-sans text-sm"
                  :class="checkIn ? 'text-(--color-on-surface)' : 'text-(--color-outline)'">
                  {{ formatDisplay(checkIn) || 'Select date' }}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" class="w-auto">
              <Calendar v-model="checkInValue" :min-value="todayDate" layout="month-and-year" />
            </PopoverContent>
          </Popover>
        </div>

        <!-- Check-out -->
        <div class="flex-1 flex flex-col gap-1">
          <label
            class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-out</label>
          <Popover v-model:open="checkOutOpen">
            <PopoverTrigger as-child>
              <button type="button"
                class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 flex items-center gap-2 text-left focus:outline-none">
                <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
                <span class="font-sans text-sm"
                  :class="checkOut ? 'text-(--color-on-surface)' : 'text-(--color-outline)'">
                  {{ formatDisplay(checkOut) || 'Select date' }}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" class="w-auto">
              <Calendar v-model="checkOutValue" :min-value="checkOutMin" layout="month-and-year" />
            </PopoverContent>
          </Popover>
        </div>

        <!-- Check button -->
        <div class="flex items-end">
          <div class="flex flex-col items-start gap-1">
            <button :disabled="nights === 0 || checkLoading"
              class="w-full sm:w-auto px-7 py-2.5 bg-(--color-primary) text-white rounded-full font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors flex items-center gap-2 disabled:opacity-50"
              @click="checkAvailability">
              <span v-if="checkLoading"
                class="material-symbols-outlined text-base animate-spin">progress_activity</span>
              <span v-else class="material-symbols-outlined text-base">search</span>
              {{ checkLoading ? 'Checking...' : `Check${nights > 0 ? ` (${nights} night${nights !== 1 ? 's' : ''})` :
              ''}`
              }}
            </button>
            <p v-if="checkError" class="font-sans text-xs text-(--color-error)">{{ checkError }}</p>
          </div>
        </div>

      </div>

      <!-- Availability result banner -->
      <div
        v-if="checked"
        class="flex items-center gap-2 px-4 py-3 mt-3 mb-4 rounded-xl font-sans text-sm font-semibold"
        :class="isAvail
          ? 'bg-(--color-tertiary-fixed) text-(--color-tertiary)'
          : 'bg-(--color-error-container) text-(--color-on-error-container)'"
      >
        <span class="material-symbols-outlined text-base">{{ isAvail ? 'check_circle' : 'cancel' }}</span>
        {{ isAvail ? 'Room is available for your dates!' : 'Not available for these dates.' }}
      </div>
    </div>

    <!-- Room info + Booking widget -->
    <div class="px-5 md:px-16 grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">

      <!-- Left: Details -->
      <div class="lg:col-span-2 space-y-8">

        <!-- Title block -->
        <div>
          <h1 class="font-serif text-[32px] font-semibold leading-10 mb-2">{{ room.name }}</h1>
          <div class="flex flex-wrap items-center gap-3">
            <div v-if="room.orgName" class="flex items-center gap-1.5 text-(--color-on-surface-variant)">
              <span class="material-symbols-outlined text-base text-(--color-primary)">holiday_village</span>
              <RouterLink v-if="room.orgId" :to="`/lodges/${room.orgId}`"
                class="font-sans text-sm hover:text-(--color-primary) transition-colors">{{ room.orgName }}</RouterLink>
              <span v-else class="font-sans text-sm">{{ room.orgName }}</span>
            </div>
            <div v-if="room.location" class="flex items-center gap-1.5 text-(--color-on-surface-variant)">
              <span class="material-symbols-outlined text-base text-(--color-primary)">location_on</span>
              <span class="font-sans text-sm">{{ room.location }}</span>
            </div>
            <span class="font-sans text-xs font-semibold px-3 py-1 rounded-full" :class="room.available
              ? 'bg-(--color-tertiary-fixed) text-(--color-tertiary)'
              : 'bg-(--color-error-container) text-(--color-on-error-container)'">
              {{ room.available ? 'Available' : 'Fully Booked' }}
            </span>
          </div>
        </div>

        <!-- About -->
        <div
          class="bg-(--color-surface-container-lowest) p-8 rounded-xl border border-(--color-savannah-mist) shadow-sm">
          <h2 class="font-serif text-2xl mb-4">About {{room.name}}</h2>
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
          <h3 class="font-serif text-2xl mb-6">Amenities</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div v-for="a in room.amenities" :key="a.label" class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-(--color-savannah-mist) flex items-center justify-center text-(--color-primary) shrink-0">
                <span class="material-symbols-outlined">{{ a.icon }}</span>
              </div>
              <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ a.label }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Right: Sticky Booking Widget -->
      <aside class="lg:sticky lg:top-28 space-y-4">
        <div
          class="bg-(--color-surface-container-high) p-6 rounded-xl border border-(--color-outline-variant) shadow-lg">

          <!-- Price -->
          <div class="flex justify-between items-baseline mb-6">
            <span class="font-serif text-2xl text-(--color-on-surface)">K{{ room.price.toLocaleString() }}</span>
            <span class="font-sans text-sm text-(--color-on-surface-variant)">/ night</span>
          </div>

          <div class="space-y-4">

            <!-- Selected dates summary -->
            <div v-if="checkIn || checkOut"
              class="bg-(--color-surface) p-3 rounded border border-(--color-outline-variant) font-sans text-sm text-(--color-on-surface-variant)">
              <div class="flex justify-between">
                <span>Check-in</span>
                <span class="font-semibold text-(--color-on-surface)">{{ formatDisplay(checkIn) || '—' }}</span>
              </div>
              <div class="flex justify-between mt-1">
                <span>Check-out</span>
                <span class="font-semibold text-(--color-on-surface)">{{ formatDisplay(checkOut) || '—' }}</span>
              </div>
            </div>
            <p v-else class="font-sans text-sm text-(--color-on-surface-variant) text-center py-2">
              Select dates above to check availability
            </p>

            <!-- Guest counter -->
            <div
              class="bg-(--color-surface) p-3 rounded border border-(--color-outline-variant) flex justify-between items-center">
              <div class="flex flex-col gap-0.5">
                <span
                  class="font-sans text-[10px] font-bold uppercase tracking-wider text-(--color-on-surface-variant)">Guests</span>
                <span class="font-sans text-sm font-semibold text-(--color-on-surface)">
                  {{ guestCount }} {{ guestCount === 1 ? 'Adult' : 'Adults' }}
                </span>
              </div>
              <div class="flex items-center gap-3">
                <button
                  class="w-7 h-7 rounded-full border border-(--color-outline-variant) flex items-center justify-center font-bold hover:border-(--color-primary) hover:text-(--color-primary) transition-colors disabled:opacity-30"
                  :disabled="guestCount <= 1" @click="guestCount = Math.max(1, guestCount - 1)">−</button>
                <span class="font-sans text-sm font-semibold w-4 text-center">{{ guestCount }}</span>
                <button
                  class="w-7 h-7 rounded-full border border-(--color-outline-variant) flex items-center justify-center font-bold hover:border-(--color-primary) hover:text-(--color-primary) transition-colors disabled:opacity-30"
                  :disabled="guestCount >= room.capacity"
                  @click="guestCount = Math.min(room.capacity, guestCount + 1)">+</button>
              </div>
            </div>

            <!-- Reserve button -->
            <button
              :disabled="!checked || !isAvail"
              class="w-full bg-(--color-primary) text-white py-3.5 rounded-lg font-sans text-base font-semibold hover:bg-(--color-clay-earth) transition-colors active:scale-95 duration-150 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="reserve">
              <span class="material-symbols-outlined text-base">arrow_forward</span>
              {{ !checked ? 'Check availability to reserve' : !isAvail ? 'Not available' : 'Reserve Now' }}
            </button>

          </div>

          <!-- Price breakdown -->
          <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0">
            <div v-if="nights > 0" class="mt-6 pt-6 border-t border-(--color-outline-variant) space-y-2">
              <div class="flex justify-between text-(--color-on-surface-variant) font-sans text-sm">
                <span>K{{ room.price.toLocaleString() }} × {{ nights }} nights</span>
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
</template>

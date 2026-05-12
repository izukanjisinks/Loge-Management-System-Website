<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookingStore }   from '@/stores/booking'
import { useAuthStore }      from '@/stores/auth'
import { usePricing }        from '@/composables/usePricing'
import BaseButton            from '@/components/ui/BaseButton.vue'
import api                   from '@/lib/api'

const route      = useRoute()
const router     = useRouter()
const booking    = useBookingStore()
const auth       = useAuthStore()

// ── Room data ─────────────────────────────────────────────────────────────────
const room       = ref(null)
const apiLoading = ref(false)
const apiError   = ref('')

function amenityIcon(label) {
  const l = label.toLowerCase()
  if (l.includes('wifi') || l.includes('wi-fi'))      return 'wifi'
  if (l.includes('pool'))                              return 'pool'
  if (l.includes('jacuzzi') || l.includes('hot tub')) return 'hot_tub'
  if (l.includes('bar') || l.includes('mini bar'))    return 'local_bar'
  if (l.includes('tv'))                               return 'tv'
  if (l.includes('kitchen'))                          return 'kitchen'
  if (l.includes('fireplace'))                        return 'fireplace'
  if (l.includes('lounge'))                           return 'weekend'
  if (l.includes('spa'))                              return 'spa'
  if (l.includes('air') || l.includes('ac'))          return 'ac_unit'
  if (l.includes('coffee') || l.includes('nespresso')) return 'local_cafe'
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
    price:       r.price_per_night,
    available:   r.is_available,
    size:        r.size        || '',
    bed:         r.bed_type    || '',
    location:    r.location    || '',
    description: r.description || '',
    images:      r.images?.length ? r.images : [],
    amenities:   (r.amenities || []).map(a => ({ icon: amenityIcon(a), label: a })),
  }
}

onMounted(async () => {
  apiLoading.value = true
  apiError.value   = ''
  try {
    const roomRes = await api.get(`/guest/rooms/${route.params.id}`)
    room.value = normalise(roomRes.data)
  } catch {
    apiError.value = 'Unable to load room details. Please try again.'
  } finally {
    apiLoading.value = false
  }
})

// ── Gallery ───────────────────────────────────────────────────────────────────
const activeImg = ref(0)
const images    = computed(() => room.value?.images ?? [])
function prevImg() { activeImg.value = (activeImg.value - 1 + images.value.length) % images.value.length }
function nextImg() { activeImg.value = (activeImg.value + 1) % images.value.length }

// ── Booking widget state ──────────────────────────────────────────────────────
const checkIn    = ref('')
const checkOut   = ref('')
const guestCount = ref(1)
const baseRate   = computed(() => room.value?.price ?? 0)

const { nightCount, baseTotal } = usePricing(
  checkIn, checkOut, baseRate, guestCount, ref('none')
)
const grandTotal = computed(() => baseTotal.value + (baseTotal.value * 0.12))

const dateError = computed(() => {
  if (!checkIn.value || !checkOut.value) return ''
  if (new Date(checkOut.value) <= new Date(checkIn.value)) return 'Check-out must be after check-in'
  return ''
})

function reserve() {
  if (!checkIn.value || !checkOut.value || dateError.value) return
  booking.setRoom(room.value.id, room.value.type, room.value.price)
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
  <!-- Loading state -->
  <div v-if="apiLoading" class="max-w-7xl mx-auto px-6 md:px-16 py-16">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
      <div class="lg:col-span-8 space-y-4 animate-pulse">
        <div class="aspect-video rounded-xl bg-[--color-outline]/20" />
        <div class="h-6 bg-[--color-outline]/20 rounded w-1/3" />
        <div class="h-10 bg-[--color-outline]/20 rounded w-2/3" />
        <div class="h-24 bg-[--color-outline]/20 rounded" />
      </div>
      <div class="lg:col-span-4">
        <div class="rounded-xl bg-[--color-outline]/20 h-96 animate-pulse" />
      </div>
    </div>
  </div>

  <!-- Error state -->
  <div v-else-if="apiError" class="max-w-7xl mx-auto px-6 md:px-16 py-32 text-center">
    <span class="material-symbols-outlined text-4xl text-[--color-error] block mb-4">error</span>
    <p class="font-serif text-xl text-[--color-on-surface] mb-2">Room not found</p>
    <p class="font-sans text-sm text-[--color-on-muted]">{{ apiError }}</p>
  </div>

  <div v-else-if="room" class="max-w-7xl mx-auto px-6 md:px-16 py-16">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">

      <!-- ── Left: room content ─────────────────────────────────────────── -->
      <div class="lg:col-span-8">

        <!-- Gallery -->
        <div class="relative rounded-xl overflow-hidden mb-3 aspect-video" style="box-shadow: var(--shadow-card);">
          <!-- No images placeholder -->
          <div
            v-if="!images.length"
            class="w-full h-full bg-[--color-secondary] flex flex-col items-center justify-center gap-3"
          >
            <span class="material-symbols-outlined text-5xl text-[--color-outline]">image_not_supported</span>
            <p class="font-sans text-sm text-[--color-on-muted]">No images available</p>
          </div>

          <Transition
            v-else
            enter-active-class="transition duration-500 ease-out"
            enter-from-class="opacity-0 scale-105"
            enter-to-class="opacity-100 scale-100"
            mode="out-in"
          >
            <img
              :key="activeImg"
              :src="images[activeImg]"
              :alt="`${room.name} — image ${activeImg + 1}`"
              class="w-full h-full object-cover"
              loading="eager"
            />
          </Transition>

          <button
            v-if="images.length > 1"
            class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg
                   bg-[oklch(1_0_0/0.85)] backdrop-blur-sm flex items-center justify-center
                   text-[--color-on-surface] hover:bg-white transition-colors"
            aria-label="Previous image"
            @click="prevImg"
          >
            <span class="material-symbols-outlined text-xl">chevron_left</span>
          </button>
          <button
            v-if="images.length > 1"
            class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg
                   bg-[oklch(1_0_0/0.85)] backdrop-blur-sm flex items-center justify-center
                   text-[--color-on-surface] hover:bg-white transition-colors"
            aria-label="Next image"
            @click="nextImg"
          >
            <span class="material-symbols-outlined text-xl">chevron_right</span>
          </button>

          <div v-if="images.length > 1" class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <button
              v-for="(_, i) in images"
              :key="i"
              class="w-2 h-2 rounded-full transition-all duration-300"
              :class="i === activeImg ? 'bg-white scale-125' : 'bg-white/50'"
              :aria-label="`Go to image ${i + 1}`"
              @click="activeImg = i"
            />
          </div>
        </div>

        <!-- Thumbnail strip -->
        <!-- <div v-if="images.length > 1" class="flex gap-2 mb-10">
          <button
            v-for="(img, i) in images"
            :key="i"
            class="flex-1 aspect-video rounded-lg overflow-hidden transition-all duration-300"
            :class="i === activeImg
              ? 'ring-2 ring-[--color-primary] ring-offset-2'
              : 'opacity-60 hover:opacity-90'"
            :aria-label="`View image ${i + 1}`"
            @click="activeImg = i"
          >
            <img :src="img" :alt="`${room.name} thumbnail ${i + 1}`" class="w-full h-full object-cover" loading="lazy" />
          </button>
        </div> -->

        <!-- Room meta -->
        <div class="mb-2">
          <p class="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-[--color-primary] mb-1">
            {{ room.type }}
            <template v-if="room.size"> · {{ room.size }}</template>
            <template v-if="room.bed"> · {{ room.bed }}</template>
            · Up to {{ room.capacity }} guests
          </p>
        </div>
        <h1 class="font-serif text-4xl md:text-5xl text-[--color-on-surface] mb-5">
          {{ room.name }}
        </h1>

        <div v-if="room.location" class="inline-flex items-center gap-1.5 mb-6 text-[--color-on-muted] font-sans text-sm">
          <span class="material-symbols-outlined text-[--color-primary] text-base">location_on</span>
          {{ room.location }}
        </div>

        <p class="font-sans text-base text-[--color-on-muted] leading-[1.8] max-w-prose mb-12">
          {{ room.description }}
        </p>

        <!-- Amenities -->
        <div v-if="room.amenities.length">
          <h2 class="font-serif text-2xl text-[--color-on-surface] mb-5">What's included</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div
              v-for="a in room.amenities"
              :key="a.label"
              class="flex items-center gap-3 bg-[--color-surface] rounded-lg px-4 py-3"
            >
              <span class="material-symbols-outlined text-[--color-primary] text-xl shrink-0">{{ a.icon }}</span>
              <span class="font-sans text-sm text-[--color-on-muted]">{{ a.label }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- ── Right: sticky booking widget ──────────────────────────────── -->
      <div class="lg:col-span-4">
        <div
          class="sticky top-24 bg-[--color-surface-card] rounded-xl overflow-hidden"
          style="box-shadow: var(--shadow-float);"
        >
          <!-- Price header -->
          <div class="px-6 pt-6 pb-4">
            <p class="font-sans text-xs font-semibold tracking-widest uppercase text-[--color-on-muted] mb-1">
              Starting from
            </p>
            <p class="font-serif text-3xl text-[--color-on-surface]">
              K{{ room.price.toLocaleString() }}
              <span class="font-sans text-sm text-[--color-on-muted] font-normal">/night</span>
            </p>
          </div>

          <div class="px-6 pb-6 space-y-5">

            <!-- Dates -->
            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1">
                <label class="font-sans text-[10px] font-bold tracking-[0.18em] uppercase text-[--color-on-muted]">Check In</label>
                <input
                  v-model="checkIn"
                  type="date"
                  class="bg-transparent border-b border-[--color-outline] py-2 text-sm font-sans
                         text-[--color-on-surface] focus:outline-none focus:border-[--color-primary] transition-colors"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-[10px] font-bold tracking-[0.18em] uppercase text-[--color-on-muted]">Check Out</label>
                <input
                  v-model="checkOut"
                  type="date"
                  class="bg-transparent border-b border-[--color-outline] py-2 text-sm font-sans
                         text-[--color-on-surface] focus:outline-none focus:border-[--color-primary] transition-colors"
                />
              </div>
            </div>
            <p v-if="dateError" class="font-sans text-xs text-[--color-error] -mt-2">{{ dateError }}</p>

            <!-- Guests stepper -->
            <div class="flex flex-col gap-1">
              <label class="font-sans text-[10px] font-bold tracking-[0.18em] uppercase text-[--color-on-muted]">Guests</label>
              <div class="flex items-center gap-4 border-b border-[--color-outline] py-2">
                <button
                  class="w-7 h-7 rounded-lg bg-[--color-secondary] flex items-center justify-center
                         text-[--color-on-surface] font-bold hover:bg-[--color-outline]/20 transition-colors disabled:opacity-30"
                  :disabled="guestCount <= 1"
                  @click="guestCount = Math.max(1, guestCount - 1)"
                >−</button>
                <span class="font-sans text-sm text-[--color-on-surface] flex-1 text-center">
                  {{ guestCount }} {{ guestCount === 1 ? 'guest' : 'guests' }}
                </span>
                <button
                  class="w-7 h-7 rounded-lg bg-[--color-secondary] flex items-center justify-center
                         text-[--color-on-surface] font-bold hover:bg-[--color-outline]/20 transition-colors disabled:opacity-30"
                  :disabled="guestCount >= room.capacity"
                  @click="guestCount = Math.min(room.capacity, guestCount + 1)"
                >+</button>
              </div>
            </div>


            <!-- Live price breakdown -->
            <Transition
              enter-active-class="transition duration-300"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
            >
              <div v-if="nightCount > 0" class="space-y-2 text-sm font-sans pt-2">
                <div class="flex justify-between text-[--color-on-muted]">
                  <span>K{{ room.price.toLocaleString() }} × {{ nightCount }} nights</span>
                  <span>K{{ Number(baseTotal.toFixed(0)).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between text-[--color-on-muted]">
                  <span>Taxes & fees (12%)</span>
                  <span>K{{ Number((baseTotal * 0.12).toFixed(0)).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between font-semibold text-[--color-on-surface] text-base pt-2">
                  <span>Total estimate</span>
                  <span class="text-[--color-primary]">K{{ Number(grandTotal.toFixed(0)).toLocaleString() }}</span>
                </div>
              </div>
            </Transition>

            <!-- CTA -->
            <BaseButton
              variant="primary"
              class="w-full justify-center py-3.5"
              :class="(!checkIn || !checkOut || !!dateError) && 'opacity-60 pointer-events-none'"
              @click="reserve"
            >
              Reserve Now
              <span class="material-symbols-outlined text-base">arrow_forward</span>
            </BaseButton>

            <p class="font-sans text-xs text-[--color-on-muted] text-center">
              <span class="material-symbols-outlined text-[--color-accent] text-sm align-middle mr-1" style="font-variation-settings: 'FILL' 1">verified</span>
              Free cancellation · No charge today
            </p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
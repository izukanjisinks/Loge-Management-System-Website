<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useAuthStore }    from '@/stores/auth'
import { usePricing }      from '@/composables/usePricing'
import BaseButton          from '@/components/ui/BaseButton.vue'

const route   = useRoute()
const router  = useRouter()
const booking = useBookingStore()
const auth    = useAuthStore()

// ── Room catalogue (keyed by id — swap for API call when backend ready) ──────
const ROOMS = {
  1: {
    id: 1, name: 'The Forest Suite', type: 'Suite', capacity: 2, price: 420, size: '65 m²', bed: 'King',
    location: 'Canopy Level',
    description: 'Perched among the canopy, The Forest Suite immerses you in the whisper of leaves and birdsong at dawn. Floor-to-ceiling glass brings the forest inside without surrendering a single comfort. Each morning begins with mist drifting through the pines — and ends with stars visible from your private deck.',
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80',
    ],
    amenities: [
      { icon: 'wifi',       label: 'High-speed Wi-Fi' },
      { icon: 'local_cafe', label: 'Nespresso Bar' },
      { icon: 'hot_tub',    label: 'Outdoor Hot Tub' },
      { icon: 'fireplace',  label: 'Wood Fireplace' },
      { icon: 'deck',       label: 'Private Deck' },
      { icon: 'bathtub',    label: 'Soaking Tub' },
      { icon: 'ac_unit',    label: 'Climate Control' },
      { icon: 'tv',         label: 'Smart TV' },
    ],
  },
  2: {
    id: 2, name: 'Highland Cottage', type: 'Cottage', capacity: 4, price: 280, size: '80 m²', bed: 'King + Twin',
    location: 'Ridge View',
    description: "Nestled at the ridge where meadow meets moorland, the Highland Cottage is a sanctuary for families and small groups. Stone walls, timber floors, and a cast-iron range hearth make this a place you'll want to return to every season.",
    images: [
      'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&q=80',
      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=1200&q=80',
      'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1200&q=80',
    ],
    amenities: [
      { icon: 'wifi',      label: 'High-speed Wi-Fi' },
      { icon: 'fireplace', label: 'Cast-Iron Hearth' },
      { icon: 'yard',      label: 'Private Garden' },
      { icon: 'kitchen',   label: 'Kitchenette' },
      { icon: 'ac_unit',   label: 'Climate Control' },
      { icon: 'tv',        label: 'Smart TV' },
    ],
  },
  3: {
    id: 3, name: 'The Stone Pavilion', type: 'Pavilion', capacity: 2, price: 560, size: '90 m²', bed: 'King',
    location: 'Riverside',
    description: 'A pavilion of hewn stone and polished concrete at the river\'s edge. The Stone Pavilion bridges architectural minimalism and wild landscape — a pool of calm water runs beneath a glass floor in the living area. Evenings are defined by the sound of the river and a private terrace over the water.',
    images: [
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80',
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80',
    ],
    amenities: [
      { icon: 'wifi',     label: 'High-speed Wi-Fi' },
      { icon: 'hot_tub',  label: 'Plunge Pool' },
      { icon: 'bathtub',  label: 'Freestanding Tub' },
      { icon: 'deck',     label: 'River Terrace' },
      { icon: 'spa',      label: 'Spa Access' },
      { icon: 'ac_unit',  label: 'Climate Control' },
      { icon: 'tv',       label: 'Smart TV' },
      { icon: 'restaurant', label: 'In-Room Dining' },
    ],
  },
  4: {
    id: 4, name: 'Riverside Cabin', type: 'Cabin', capacity: 3, price: 320, size: '55 m²', bed: 'Queen + Single',
    location: 'Waterside',
    description: 'A compact and intimate cabin directly on the riverbank. Perfect for a small group or a family of three who want the full wilderness experience without pretence.',
    images: [
      'https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=1200&q=80',
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80',
    ],
    amenities: [
      { icon: 'wifi',      label: 'Wi-Fi' },
      { icon: 'fireplace', label: 'Fireplace' },
      { icon: 'kayaking',  label: 'Kayak Hire' },
      { icon: 'ac_unit',   label: 'Climate Control' },
    ],
  },
  5: {
    id: 5, name: 'The Canopy Loft', type: 'Loft', capacity: 2, price: 380, size: '50 m²', bed: 'King',
    location: 'Treetop',
    description: 'Twelve metres above the forest floor, The Canopy Loft is an open-plan retreat suspended among ancient oaks. A sky deck runs the full width of the structure — your private crow\'s nest at the top of the world.',
    images: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
      'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
    ],
    amenities: [
      { icon: 'wifi',       label: 'High-speed Wi-Fi' },
      { icon: 'local_cafe', label: 'Nespresso Bar' },
      { icon: 'deck',       label: 'Sky Deck' },
      { icon: 'ac_unit',    label: 'Climate Control' },
      { icon: 'tv',         label: 'Smart TV' },
    ],
  },
  6: {
    id: 6, name: 'Garden Villa', type: 'Villa', capacity: 6, price: 680, size: '160 m²', bed: '3 × King',
    location: 'Estate Gardens',
    description: 'The crown of the collection. Garden Villa sits at the heart of the estate, enclosed by formal gardens and a cedar grove. Three suites, a private pool, full kitchen, and a concierge on call make this the destination for milestone celebrations and extended retreats.',
    images: [
      'https://images.unsplash.com/photo-1440778303588-435521a205bc?w=1200&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80',
    ],
    amenities: [
      { icon: 'wifi',         label: 'High-speed Wi-Fi' },
      { icon: 'pool',         label: 'Private Pool' },
      { icon: 'kitchen',      label: 'Full Kitchen' },
      { icon: 'yard',         label: 'Estate Garden' },
      { icon: 'fireplace',    label: 'Fireplace' },
      { icon: 'local_cafe',   label: 'Coffee Bar' },
      { icon: 'spa',          label: 'Spa Access' },
      { icon: 'restaurant',   label: 'In-Villa Dining' },
    ],
  },
}

const room = computed(() => ROOMS[Number(route.params.id)] ?? ROOMS[1])

// ── Gallery ───────────────────────────────────────────────────────────────────
const activeImg = ref(0)
function prevImg() { activeImg.value = (activeImg.value - 1 + room.value.images.length) % room.value.images.length }
function nextImg() { activeImg.value = (activeImg.value + 1) % room.value.images.length }

// ── Booking widget state ──────────────────────────────────────────────────────
const checkIn    = ref('')
const checkOut   = ref('')
const guestCount = ref(1)
const mealPlan   = ref('breakfast')
const baseRate   = computed(() => room.value.price)

const { nightCount, baseTotal, mealCost, taxes, grandTotal } = usePricing(
  checkIn, checkOut, baseRate, guestCount, mealPlan
)

const dateError = computed(() => {
  if (!checkIn.value || !checkOut.value) return ''
  if (new Date(checkOut.value) <= new Date(checkIn.value)) return 'Check-out must be after check-in'
  return ''
})

const MEAL_OPTIONS = [
  { value: 'full_board', label: 'Full Board',  rate: 85 },
  { value: 'half_board', label: 'Half Board',  rate: 45 },
  { value: 'breakfast',  label: 'Breakfast',   rate: 20 },
  { value: 'none',       label: 'Room Only',   rate: 0  },
]

function reserve() {
  if (!checkIn.value || !checkOut.value || dateError.value) return
  booking.setRoom(room.value.id, room.value.type, room.value.price)
  booking.setDates(checkIn.value, checkOut.value)
  booking.guestCount = guestCount.value
  booking.mealPlan   = mealPlan.value
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: `/reserve/${room.value.id}` } })
  } else {
    router.push({ name: 'reservation', params: { roomId: room.value.id } })
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 md:px-16 py-16">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">

      <!-- ── Left: room content ─────────────────────────────────────────── -->
      <div class="lg:col-span-8">

        <!-- Gallery -->
        <div class="relative rounded-xl overflow-hidden mb-3 aspect-[16/9]" style="box-shadow: var(--shadow-card);">
          <Transition
            enter-active-class="transition duration-500 ease-out"
            enter-from-class="opacity-0 scale-105"
            enter-to-class="opacity-100 scale-100"
            mode="out-in"
          >
            <img
              :key="activeImg"
              :src="room.images[activeImg]"
              :alt="`${room.name} — image ${activeImg + 1}`"
              class="w-full h-full object-cover"
              loading="eager"
            />
          </Transition>

          <!-- Prev / Next -->
          <button
            v-if="room.images.length > 1"
            class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg
                   bg-[oklch(1_0_0/0.85)] backdrop-blur-sm flex items-center justify-center
                   text-[--color-on-surface] hover:bg-white transition-colors"
            aria-label="Previous image"
            @click="prevImg"
          >
            <span class="material-symbols-outlined text-xl">chevron_left</span>
          </button>
          <button
            v-if="room.images.length > 1"
            class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg
                   bg-[oklch(1_0_0/0.85)] backdrop-blur-sm flex items-center justify-center
                   text-[--color-on-surface] hover:bg-white transition-colors"
            aria-label="Next image"
            @click="nextImg"
          >
            <span class="material-symbols-outlined text-xl">chevron_right</span>
          </button>

          <!-- Dot indicators -->
          <div
            v-if="room.images.length > 1"
            class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
          >
            <button
              v-for="(_, i) in room.images"
              :key="i"
              class="w-2 h-2 rounded-full transition-all duration-300"
              :class="i === activeImg ? 'bg-white scale-125' : 'bg-white/50'"
              :aria-label="`Go to image ${i + 1}`"
              @click="activeImg = i"
            />
          </div>
        </div>

        <!-- Thumbnail strip -->
        <div v-if="room.images.length > 1" class="flex gap-2 mb-10">
          <button
            v-for="(img, i) in room.images"
            :key="i"
            class="flex-1 aspect-[16/9] rounded-lg overflow-hidden transition-all duration-300"
            :class="i === activeImg
              ? 'ring-2 ring-[--color-primary] ring-offset-2'
              : 'opacity-60 hover:opacity-90'"
            :aria-label="`View image ${i + 1}`"
            @click="activeImg = i"
          >
            <img :src="img" :alt="`${room.name} thumbnail ${i + 1}`" class="w-full h-full object-cover" loading="lazy" />
          </button>
        </div>

        <!-- Room meta -->
        <div class="mb-2">
          <p class="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-[--color-primary] mb-1">
            {{ room.type }} · {{ room.size }} · {{ room.bed }} · Up to {{ room.capacity }} guests
          </p>
        </div>
        <h1 class="font-serif text-4xl md:text-5xl text-[--color-on-surface] mb-5">
          {{ room.name }}
        </h1>

        <!-- Location pill -->
        <div class="inline-flex items-center gap-1.5 mb-6 text-[--color-on-muted] font-sans text-sm">
          <span class="material-symbols-outlined text-[--color-primary] text-base">location_on</span>
          {{ room.location }}
        </div>

        <p class="font-sans text-base text-[--color-on-muted] leading-[1.8] max-w-prose mb-12">
          {{ room.description }}
        </p>

        <!-- Amenities -->
        <div>
          <h2 class="font-serif text-2xl text-[--color-on-surface] mb-5">What's included</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div
              v-for="a in room.amenities"
              :key="a.icon"
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
              ${{ room.price }}
              <span class="font-sans text-sm text-[--color-on-muted] font-normal">/night</span>
            </p>
          </div>

          <div class="px-6 pb-6 space-y-5">

            <!-- Dates -->
            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1">
                <label class="font-sans text-[10px] font-bold tracking-[0.18em] uppercase text-[--color-on-muted]">
                  Check In
                </label>
                <input
                  v-model="checkIn"
                  type="date"
                  class="bg-transparent border-b border-[--color-outline] py-2 text-sm font-sans
                         text-[--color-on-surface] focus:outline-none focus:border-[--color-primary] transition-colors"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-sans text-[10px] font-bold tracking-[0.18em] uppercase text-[--color-on-muted]">
                  Check Out
                </label>
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
              <label class="font-sans text-[10px] font-bold tracking-[0.18em] uppercase text-[--color-on-muted]">
                Guests
              </label>
              <div class="flex items-center gap-4 border-b border-[--color-outline] py-2">
                <button
                  class="w-7 h-7 rounded-lg bg-[--color-secondary] flex items-center justify-center
                         text-[--color-on-surface] font-bold hover:bg-[--color-outline]/20 transition-colors
                         disabled:opacity-30"
                  :disabled="guestCount <= 1"
                  @click="guestCount = Math.max(1, guestCount - 1)"
                >−</button>
                <span class="font-sans text-sm text-[--color-on-surface] flex-1 text-center">
                  {{ guestCount }} {{ guestCount === 1 ? 'guest' : 'guests' }}
                </span>
                <button
                  class="w-7 h-7 rounded-lg bg-[--color-secondary] flex items-center justify-center
                         text-[--color-on-surface] font-bold hover:bg-[--color-outline]/20 transition-colors
                         disabled:opacity-30"
                  :disabled="guestCount >= room.capacity"
                  @click="guestCount = Math.min(room.capacity, guestCount + 1)"
                >+</button>
              </div>
            </div>

            <!-- Meal plan selector -->
            <div class="flex flex-col gap-2">
              <label class="font-sans text-[10px] font-bold tracking-[0.18em] uppercase text-[--color-on-muted]">
                Meal Plan
              </label>
              <div class="space-y-2">
                <label
                  v-for="opt in MEAL_OPTIONS"
                  :key="opt.value"
                  class="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors"
                  :class="mealPlan === opt.value
                    ? 'border-[--color-primary] bg-[oklch(0.55_0.12_45/0.05)]'
                    : 'border-[oklch(0_0_0/0.07)] hover:border-[oklch(0_0_0/0.14)]'"
                >
                  <div class="flex items-center gap-2">
                    <input
                      type="radio"
                      :value="opt.value"
                      v-model="mealPlan"
                      class="accent-[--color-primary]"
                    />
                    <span class="font-sans text-xs font-semibold text-[--color-on-surface]">{{ opt.label }}</span>
                  </div>
                  <span class="font-sans text-xs text-[--color-on-muted]">
                    {{ opt.rate > 0 ? `+$${opt.rate}pp/night` : 'Included' }}
                  </span>
                </label>
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
                  <span>${{ room.price }} × {{ nightCount }} nights</span>
                  <span>${{ baseTotal.toFixed(0) }}</span>
                </div>
                <div v-if="mealCost > 0" class="flex justify-between text-[--color-on-muted]">
                  <span>Meal plan</span>
                  <span>${{ mealCost.toFixed(0) }}</span>
                </div>
                <div class="flex justify-between text-[--color-on-muted]">
                  <span>Taxes & fees (12%)</span>
                  <span>${{ taxes.toFixed(0) }}</span>
                </div>
                <div class="flex justify-between font-semibold text-[--color-on-surface] text-base pt-2">
                  <span>Total estimate</span>
                  <span class="text-[--color-primary]">${{ grandTotal.toFixed(0) }}</span>
                </div>
              </div>
            </Transition>

            <!-- CTA -->
            <BaseButton
              variant="primary"
              class="w-full justify-center py-3.5"
              :class="(!checkIn || !checkOut || dateError) && 'opacity-60 pointer-events-none'"
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

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import BookingTypeModal from '@/components/booking/BookingTypeModal.vue'

const route  = useRoute()
const router = useRouter()

// ── Venue data ────────────────────────────────────────────────────────────────
const venue      = ref(null)
const apiLoading = ref(false)
const apiError   = ref('')

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  apiLoading.value = true
  try {
    const params = route.query.org_id ? { org_id: route.query.org_id } : {}
    const { data } = await api.get('/guest/venues', { params })
    const list = data.data ?? data
    venue.value = list.find(v => v.id === route.params.id) ?? null
    if (!venue.value) apiError.value = 'Venue not found.'
  } catch {
    apiError.value = 'Unable to load venue details. Please try again.'
  } finally {
    apiLoading.value = false
  }
})

// ── Gallery / Lightbox ────────────────────────────────────────────────────────
const images        = computed(() => venue.value?.images ?? [])
const lightboxOpen  = ref(false)
const lightboxIndex = ref(0)

function openLightbox(i) { lightboxIndex.value = i; lightboxOpen.value = true }
function closeLightbox()  { lightboxOpen.value = false }
function lightboxPrev()   { lightboxIndex.value = (lightboxIndex.value - 1 + images.value.length) % images.value.length }
function lightboxNext()   { lightboxIndex.value = (lightboxIndex.value + 1) % images.value.length }

function onKeydown(e) {
  if (!lightboxOpen.value) return
  if (e.key === 'ArrowLeft')  { e.preventDefault(); lightboxPrev() }
  if (e.key === 'ArrowRight') { e.preventDefault(); lightboxNext() }
  if (e.key === 'Escape')     { e.preventDefault(); closeLightbox() }
}
onUnmounted(() => window.removeEventListener('keydown', onKeydown))


// ── Display helpers ───────────────────────────────────────────────────────────
function locationLabel(t) {
  if (t === 'outdoor')      return 'Outdoor'
  if (t === 'semi_outdoor') return 'Semi-Outdoor'
  return 'Indoor'
}
function locationIcon(t) {
  if (t === 'outdoor')      return 'park'
  if (t === 'semi_outdoor') return 'open_in_full'
  return 'warehouse'
}
function typeIcon(t) {
  const m = {
    conference_room: 'corporate_fare', boardroom: 'meeting_room',
    banquet_hall: 'celebration',       wedding_venue: 'favorite',
    garden: 'local_florist',           marquee: 'festival',
    training_room: 'school',           exhibition: 'museum',
    amphitheatre: 'theater_comedy',
  }
  return m[t] ?? 'event'
}
function amenityIcon(label) {
  const l = (label ?? '').toLowerCase()
  if (l.includes('wifi') || l.includes('wi-fi'))         return 'wifi'
  if (l.includes('projector') || l.includes('screen'))   return 'connected_tv'
  if (l.includes('pa') || l.includes('sound'))           return 'volume_up'
  if (l.includes('air') || l.includes('climate'))        return 'ac_unit'
  if (l.includes('stage') || l.includes('podium'))       return 'mic'
  if (l.includes('parking'))                             return 'local_parking'
  if (l.includes('catering') || l.includes('dining'))    return 'restaurant'
  if (l.includes('bar'))                                 return 'local_bar'
  if (l.includes('video') || l.includes('conferencing')) return 'videocam'
  if (l.includes('whiteboard') || l.includes('flip'))    return 'draw'
  if (l.includes('display') || l.includes('4k'))         return 'monitor'
  if (l.includes('light'))                               return 'light'
  if (l.includes('generator'))                           return 'bolt'
  if (l.includes('dance'))                               return 'nightlife'
  if (l.includes('bridal'))                              return 'spa'
  if (l.includes('butler') || l.includes('concierge'))   return 'support_agent'
  return 'check_circle'
}
function setupIcon(setup) {
  const m = {
    Theatre: 'theater_comedy', Classroom: 'school', Boardroom: 'meeting_room',
    Banquet: 'celebration',    Cocktail: 'local_bar', 'U-Shape': 'table_restaurant',
    Exhibition: 'museum',      Ceremony: 'favorite',  Standing: 'groups',
  }
  return m[setup] ?? 'event_seat'
}

const today = new Date().toISOString().split('T')[0]
const orgId = computed(() => venue.value?.org_id)

const bookingModalOpen = ref(false)

function onBookingTypeConfirmed() {
  router.push({
    name:   'event-booking',
    params: { id: orgId.value },
    query:  {
      venueId:       venue.value.id,
      venueName:     venue.value.name,
      venueCapacity: venue.value.capacity ?? undefined,
    },
  })
}
</script>

<template>
  <!-- Loading skeleton — same as RoomDetailView -->
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
    <p class="font-serif text-xl text-(--color-on-surface) mb-2">Venue not found</p>
    <p class="font-sans text-sm text-(--color-on-surface-variant)">{{ apiError }}</p>
  </div>

  <div v-else-if="venue" class="max-w-[1280px] mx-auto pb-24">

    <!-- Back button — navigates to the lodge that owns this venue -->
    <div class="px-5 md:px-16 pt-6">
      <button type="button"
        class="flex items-center gap-1.5 font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) transition-colors"
        @click="orgId ? router.push({ name: 'lodge-detail', params: { id: orgId } }) : router.back()">
        <span class="material-symbols-outlined text-base">arrow_back</span>
        {{ venue.organization?.name || 'Back to Venues' }}
      </button>
    </div>

    <!-- ── Gallery ───────────────────────────────────────────────────────── -->
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
            <span class="material-symbols-outlined text-5xl text-(--color-primary)">{{ typeIcon(venue.type) }}</span>
          </div>
          <div>
            <p class="font-serif text-3xl font-semibold text-(--color-on-surface)">{{ venue.name }}</p>
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
          <img :src="images[0]" :alt="venue.name"
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
          <img v-if="images[1]" :src="images[1]" :alt="`${venue.name} 2`"
            class="absolute inset-0 w-full h-full object-cover group-hover/s2:scale-105 transition-transform duration-700" loading="lazy" />
          <div v-if="images[1]" class="absolute inset-0 bg-black/0 group-hover/s2:bg-black/15 transition-colors rounded-2xl"></div>
          <div v-else class="absolute inset-0 rounded-2xl"
            style="background: linear-gradient(135deg, var(--color-surface-container) 0%, var(--color-surface-container-high) 100%)"></div>
        </div>

        <!-- Slot 3 -->
        <div class="hidden md:block relative overflow-hidden rounded-2xl"
          :class="images[2] ? 'cursor-pointer group/s3' : ''"
          @click="images[2] ? openLightbox(2) : undefined">
          <img v-if="images[2]" :src="images[2]" :alt="`${venue.name} 3`"
            class="absolute inset-0 w-full h-full object-cover group-hover/s3:scale-105 transition-transform duration-700" loading="lazy" />
          <div v-if="images[2]" class="absolute inset-0 bg-black/0 group-hover/s3:bg-black/15 transition-colors rounded-2xl"></div>
          <div v-else class="absolute inset-0 rounded-2xl"
            style="background: linear-gradient(135deg, var(--color-surface-container-high) 0%, var(--color-surface-container) 100%)"></div>
        </div>

        <!-- Slot 4 -->
        <div class="hidden md:block md:col-span-2 relative overflow-hidden rounded-2xl"
          :class="images[3] ? 'cursor-pointer group/s4' : ''"
          @click="images[3] ? openLightbox(3) : undefined">
          <img v-if="images[3]" :src="images[3]" :alt="`${venue.name} 4`"
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

    <!-- ── Lightbox ──────────────────────────────────────────────────────── -->
    <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="transition duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="lightboxOpen" class="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md"
        @click.self="closeLightbox">
        <div class="flex items-center justify-between px-6 py-4 shrink-0">
          <p class="font-sans text-sm text-white/70">{{ lightboxIndex + 1 }} / {{ images.length }}</p>
          <button type="button"
            class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            @click="closeLightbox">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="flex-1 flex items-center justify-center px-16 min-h-0 relative">
          <button type="button"
            class="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            @click="lightboxPrev">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100" mode="out-in">
            <img :key="lightboxIndex" :src="images[lightboxIndex]"
              :alt="`${venue.name} ${lightboxIndex + 1}`"
              class="max-h-full max-w-full object-contain rounded-lg select-none" draggable="false" />
          </Transition>
          <button type="button"
            class="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            @click="lightboxNext">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
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

    <!-- ── 2-column layout — mirrors RoomDetailView exactly ─────────────── -->
    <div class="px-5 md:px-16 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">

      <!-- Left 2/3: Venue information -->
      <div class="lg:col-span-2 space-y-8">

        <!-- Title section — mirrors room title block -->
        <div>
          <h1 class="font-serif text-[32px] font-semibold leading-10 mb-2">{{ venue.name }}</h1>
          <div class="flex flex-wrap items-center gap-4 text-(--color-on-surface-variant)">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-(--color-primary)">{{ typeIcon(venue.type) }}</span>
              <span class="font-sans text-base">{{ venue.type_label }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-(--color-primary)">{{ locationIcon(venue.location_type) }}</span>
              <span class="font-sans text-base">{{ locationLabel(venue.location_type) }}</span>
            </div>
            <div v-if="venue.organization?.name" class="flex items-center gap-2">
              <span class="material-symbols-outlined text-(--color-primary)">apartment</span>
              <span class="font-sans text-base">{{ venue.organization.name }}</span>
            </div>
          </div>
        </div>

        <!-- About -->
        <div class="bg-(--color-surface-container-lowest) p-8 rounded-2xl border border-(--color-outline-variant) shadow-sm">
          <h2 class="font-serif text-2xl font-semibold text-(--color-on-surface) mb-4">About This Venue</h2>
          <p class="font-sans text-base text-(--color-on-surface-variant) leading-relaxed">
            {{ venue.description }}
          </p>
          <div class="flex flex-wrap gap-4 mt-6 text-(--color-on-surface-variant) font-sans text-sm">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-(--color-primary)">{{ typeIcon(venue.type) }}</span>
              {{ venue.type_label }}
            </div>
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-(--color-primary)">group</span>
              Up to {{ venue.capacity }} guests
            </div>
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-(--color-primary)">{{ locationIcon(venue.location_type) }}</span>
              {{ locationLabel(venue.location_type) }}
            </div>
          </div>
        </div>

        <!-- Seating & Layout Configurations -->
        <div v-if="venue.capacities?.length">
          <h2 class="font-serif text-2xl font-semibold text-(--color-on-surface) mb-6">Seating &amp; Layout Configurations</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div v-for="cap in venue.capacities" :key="cap.setup"
              class="flex flex-col items-center gap-3 p-5 bg-(--color-surface-container-lowest) rounded-xl border border-(--color-outline-variant) text-center hover:border-(--color-primary) transition-colors">
              <div class="w-12 h-12 rounded-full bg-(--color-savannah-mist) flex items-center justify-center">
                <span class="material-symbols-outlined text-xl text-(--color-primary)">{{ setupIcon(cap.setup) }}</span>
              </div>
              <div>
                <p class="font-serif text-2xl text-(--color-primary) font-semibold">{{ cap.capacity }}</p>
                <p class="font-sans text-xs text-(--color-on-surface-variant) font-semibold uppercase tracking-wider mt-0.5">{{ cap.setup }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Amenities -->
        <div v-if="venue.amenities?.length" class="bg-(--color-surface-container-lowest) p-8 rounded-2xl border border-(--color-outline-variant)">
          <h2 class="font-serif text-2xl font-semibold text-(--color-on-surface) mb-6">Venue Amenities</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div v-for="a in venue.amenities" :key="a" class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-(--color-savannah-mist) flex items-center justify-center text-(--color-primary) shrink-0">
                <span class="material-symbols-outlined">{{ amenityIcon(a) }}</span>
              </div>
              <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ a }}</span>
            </div>
          </div>
        </div>

        <!-- Suitable Events -->
        <div v-if="venue.suitable_events?.length">
          <h2 class="font-serif text-2xl font-semibold text-(--color-on-surface) mb-4">Suitable For</h2>
          <div class="flex flex-wrap gap-3">
            <span v-for="event in venue.suitable_events" :key="event"
              class="flex items-center gap-2 bg-(--color-surface-container-lowest) border border-(--color-outline-variant) text-(--color-on-surface) px-4 py-2 rounded-full font-sans text-sm font-medium hover:border-(--color-primary) hover:text-(--color-primary) transition-colors">
              <span class="material-symbols-outlined text-base text-(--color-primary)">check_circle</span>
              {{ event }}
            </span>
          </div>
        </div>

      </div>

      <!-- Right 1/3: Sticky enquiry widget — mirrors room booking widget -->
      <aside class="lg:sticky lg:top-28 space-y-4">

        <!-- Booking widget -->
        <div class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) shadow-lg overflow-hidden">
          <div class="px-6 pt-6 pb-4 border-b border-(--color-outline-variant)">
            <h3 class="font-serif text-xl text-(--color-on-surface)">Book This Venue</h3>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1">
              Select a booking type to begin your reservation.
            </p>
          </div>

          <div class="p-6 space-y-4">
            <!-- Venue quick stats -->
            <div class="space-y-2.5">
              <div class="flex items-center gap-3 font-sans text-sm text-(--color-on-surface-variant)">
                <span class="material-symbols-outlined text-base text-(--color-primary)">group</span>
                Up to <span class="font-semibold text-(--color-on-surface)">{{ venue.capacity }}</span> guests
              </div>
              <div class="flex items-center gap-3 font-sans text-sm text-(--color-on-surface-variant)">
                <span class="material-symbols-outlined text-base text-(--color-primary)">{{ locationIcon(venue.location_type) }}</span>
                <span class="font-semibold text-(--color-on-surface)">{{ locationLabel(venue.location_type) }}</span> venue
              </div>
              <div v-if="venue.capacities?.length" class="flex items-center gap-3 font-sans text-sm text-(--color-on-surface-variant)">
                <span class="material-symbols-outlined text-base text-(--color-primary)">chair</span>
                <span class="font-semibold text-(--color-on-surface)">{{ venue.capacities.length }}</span>
                layout configuration{{ venue.capacities.length !== 1 ? 's' : '' }}
              </div>
              <div v-if="venue.suitable_events?.length" class="flex items-center gap-3 font-sans text-sm text-(--color-on-surface-variant)">
                <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_month</span>
                Suitable for {{ venue.suitable_events.slice(0, 2).join(', ') }}
                <template v-if="venue.suitable_events.length > 2"> &amp; more</template>
              </div>
            </div>

            <div class="h-px bg-(--color-outline-variant)"></div>

            <button type="button"
              class="w-full flex items-center justify-center gap-2 bg-(--color-primary) text-white py-3.5 rounded-full font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors shadow-md active:scale-95"
              @click="bookingModalOpen = true">
              <span class="material-symbols-outlined text-base">event_available</span>
              Book This Venue
            </button>

            <p class="font-sans text-xs text-(--color-on-surface-variant) text-center flex items-center justify-center gap-1.5">
              <span class="material-symbols-outlined text-sm text-(--color-primary)">info</span>
              Choose Individual or Corporate when prompted.
            </p>
          </div>
        </div>

        <!-- Hosted by card -->
        <div v-if="venue.organization"
          class="p-5 bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant)">
          <p class="font-sans text-xs text-(--color-on-surface-variant) uppercase tracking-wider font-semibold mb-2">Hosted by</p>
          <h4 class="font-serif text-base text-(--color-on-surface) mb-3">{{ venue.organization.name }}</h4>
          <RouterLink v-if="orgId" :to="{ name: 'lodge-detail', params: { id: orgId } }"
            class="flex items-center gap-1.5 font-sans text-sm font-semibold text-(--color-primary) hover:underline">
            <span class="material-symbols-outlined text-base">apartment</span>
            View all rooms &amp; venues
          </RouterLink>
        </div>

      </aside>
    </div>
  </div>

  <BookingTypeModal
    v-model="bookingModalOpen"
    :context="venue ? { itemType: 'venue', name: venue.name, lodgeName: venue.organization?.name ?? '' } : {}"
    @confirm="onBookingTypeConfirmed"
  />
</template>

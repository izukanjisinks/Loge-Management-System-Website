check_in<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLodges, useRooms, amenityIcon, roomImage } from '@/composables/useRooms'
import { publicApi } from '@/lib/api'
import type { Room } from '@/types'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/index'

const route = useRoute()
const router = useRouter()

const lodgeId = route.params.id

// Fetch lodge info from the list (no single-lodge endpoint available)
const { lodges, loading: lodgeLoading, error: lodgeError, fetchLodges } = useLodges()
const lodge = computed(() => lodges.value.find((l: { id: string }) => l.id === lodgeId))

// GET /api/v1/rooms is public no auth required
const { rooms, page: roomsPage, totalPages: roomsTotalPages, loading: roomsLoading, error: roomsError, fetchRooms } = useRooms()

const searched     = ref(false)
const availableIds = ref<Set<string>>(new Set())
const checkLoading = ref(false)
const checkError   = ref<string | null>(null)

async function goToPage(p: number) {
  await fetchRooms({ org_id: lodgeId, page: p })
}

function roomPageClass(p: number): string {
  return p === roomsPage.value
    ? 'bg-(--color-primary) text-white border-transparent'
    : 'border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container)'
}

function isAvailableForDates(roomId: string): boolean {
  return availableIds.value.has(roomId)
}

function reserveLabel(roomId: string): string {
  if (nights.value === 0) return 'Select dates to reserve'
  if (!searched.value) return 'Check availability first'
  if (!isAvailableForDates(roomId)) return 'Unavailable'
  return 'Reserve'
}

const todayDate    = today(getLocalTimeZone())
const checkInOpen  = ref(false)
const checkOutOpen = ref(false)
const checkIn  = ref('')
const checkOut = ref('')

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
  set: (v) => { checkIn.value = toIso(v); checkInOpen.value = false },
})

const checkOutValue = computed({
  get: () => checkOut.value ? parseDate(checkOut.value) : undefined,
  set: (v) => { checkOut.value = toIso(v); checkOutOpen.value = false },
})

const checkOutMin = computed(() =>
  checkIn.value ? parseDate(checkIn.value).add({ days: 1 }) : todayDate.add({ days: 1 })
)

const nights = computed(() => {
  if (!checkIn.value || !checkOut.value) return 0
  const diff = new Date(checkOut.value).getTime() - new Date(checkIn.value).getTime()
  return Math.max(0, Math.floor(diff / 86400000))
})

onMounted(async () => {
  await fetchLodges({ page_size: 100 })
  fetchRooms({ org_id: lodgeId })
})

const COVERS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=80',
  'https://images.unsplash.com/photo-1444201983204-c43cbd584d93?w=1200&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
]

function lodgeCover(i: number) {
  return lodge.value?.logo_url ?? COVERS[i % COVERS.length]
}

async function checkAvailability() {
  if (nights.value === 0) return
  checkLoading.value = true
  checkError.value   = null
  searched.value     = false
  availableIds.value = new Set()
  try {
    const { data } = await publicApi.get('/guest/rooms', {
      params: { org_id: lodgeId, check_in: checkIn.value, check_out: checkOut.value, page_size: 100 },
    })
    const list: Room[] = Array.isArray(data) ? data : (data.data ?? [])
    availableIds.value = new Set(list.map(r => r.id))
    searched.value = true
  } catch {
    checkError.value = 'Failed to check availability. Please try again.'
  } finally {
    checkLoading.value = false
  }
}

function reserve(room: Room) {
  router.push({
    name: 'reservation',
    params: { roomId: room.id },
    query: {
      check_in:      checkIn.value,
      check_out:     checkOut.value,
      lodge_id:      lodgeId as string,
      lodge_name:    lodge.value?.name ?? '',
      room_name:     room.name,
      room_type:     room.type,
      room_capacity: String(room.capacity),
      room_price:    String(room.price_per_night),
    },
  })
}
</script>

<template>
  <!-- Loading -->
  <div v-if="lodgeLoading" class="max-w-[1280px] mx-auto px-5 md:px-16 py-10 animate-pulse space-y-6">
    <div class="h-72 bg-(--color-surface-container-highest) rounded-2xl" />
    <div class="h-8 bg-(--color-surface-container-highest) rounded w-[33%]" />
    <div class="h-4 bg-(--color-surface-container-highest) rounded w-[25%]" />
  </div>

  <!-- Error / not found -->
  <div v-else-if="lodgeError || (!lodgeLoading && !lodge)"
    class="max-w-[1280px] mx-auto px-5 md:px-16 py-32 text-center">
    <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">search_off</span>
    <p class="font-serif text-2xl text-(--color-on-surface) mb-2">Lodge not found</p>
    <RouterLink to="/lodges" class="font-sans text-sm text-(--color-primary) hover:underline">&larr; Back to lodges</RouterLink>
  </div>

  <div v-else-if="lodge" class="pb-24">

    <!-- Hero banner -->
    <section class="relative h-64 md:h-80 overflow-hidden">
      <img :src="lodgeCover(0)" :alt="lodge.name" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />
      <div class="relative z-10 h-full flex flex-col justify-end px-5 md:px-16 pb-10 max-w-[1280px] mx-auto">
        <RouterLink to="/explore"
          class="flex items-center gap-1 font-sans text-sm text-white/70 hover:text-white mb-4 transition-colors w-fit">
          <span class="material-symbols-outlined text-base">arrow_back</span>
          All lodges
        </RouterLink>
        <h1 class="font-serif text-3xl md:text-4xl font-semibold text-white">{{ lodge.name }}</h1>
        <p v-if="lodge.address" class="flex items-center gap-1.5 font-sans text-sm text-white/80 mt-2">
          <span class="material-symbols-outlined text-base">location_on</span>
          {{ lodge.address }}
        </p>
      </div>
    </section>

    <!-- Lodge info strip -->
    <div class="bg-(--color-surface) border-b border-(--color-outline-variant)">
      <div class="max-w-[1280px] mx-auto px-5 md:px-16 py-5 flex flex-wrap gap-6">
        <div v-if="lodge.email" class="flex items-center gap-2 font-sans text-sm text-(--color-on-surface-variant)">
          <span class="material-symbols-outlined text-base text-(--color-primary)">mail</span>
          {{ lodge.email }}
        </div>
        <div v-if="lodge.phone" class="flex items-center gap-2 font-sans text-sm text-(--color-on-surface-variant)">
          <span class="material-symbols-outlined text-base text-(--color-primary)">phone</span>
          {{ lodge.phone }}
        </div>
      </div>
    </div>

    <!-- Availability checker -->
    <section class="max-w-[1280px] mx-auto px-5 md:px-16 mt-5">
      <h2 class="font-serif text-[28px] font-semibold text-(--color-on-surface) mb-2">Check Availability</h2>
      <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">
        Pick your dates to see which rooms are free at {{ lodge.name }}.
      </p>

      <div class="flex flex-col sm:flex-row gap-4 p-5 bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) mb-6">
        <!-- Check-in -->
        <div class="flex-1 flex flex-col gap-1">
          <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-in</label>
          <Popover v-model:open="checkInOpen">
            <PopoverTrigger as-child>
              <button type="button" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 flex items-center gap-2 text-left focus:outline-none">
                <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
                <span class="font-sans text-sm" :class="checkIn ? 'text-(--color-on-surface)' : 'text-(--color-outline)'">
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
          <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Check-out</label>
          <Popover v-model:open="checkOutOpen">
            <PopoverTrigger as-child>
              <button type="button" class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 flex items-center gap-2 text-left focus:outline-none">
                <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
                <span class="font-sans text-sm" :class="checkOut ? 'text-(--color-on-surface)' : 'text-(--color-outline)'">
                  {{ formatDisplay(checkOut) || 'Select date' }}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" class="w-auto">
              <Calendar v-model="checkOutValue" :min-value="checkOutMin" layout="month-and-year" />
            </PopoverContent>
          </Popover>
        </div>

        <div class="flex items-end">
          <div class="flex flex-col items-start gap-1">
            <button
              :disabled="nights === 0 || checkLoading"
              class="w-full sm:w-auto px-7 py-2.5 bg-(--color-primary) text-white rounded-full font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors flex items-center gap-2 disabled:opacity-50"
              @click="checkAvailability"
            >
              <span v-if="checkLoading" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
              <span v-else class="material-symbols-outlined text-base">search</span>
              {{ checkLoading ? 'Checking...' : `Check${nights > 0 ? ` (${nights} night${nights !== 1 ? 's' : ''})` : ''}` }}
            </button>
            <p v-if="checkError" class="font-sans text-xs text-(--color-error)">{{ checkError }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Rooms -->
    <section class="max-w-[1280px] mx-auto px-5 md:px-16 mt-12">
      <div class="flex items-baseline justify-between mb-8">
        <div>
          <h2 class="font-serif text-[28px] font-semibold text-(--color-on-surface)">Rooms at {{ lodge.name }}</h2>
          <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1">
            <template v-if="roomsLoading">Loading rooms...</template>
            <template v-else-if="checkLoading">Checking availability for your dates...</template>
            <template v-else-if="searched">{{ rooms.length }} room{{ rooms.length !== 1 ? 's' : '' }} &ndash; availability shown below</template>
            <template v-else>{{ rooms.length }} room{{ rooms.length !== 1 ? 's' : '' }} at this lodge</template>
          </p>
        </div>
      </div>

      <!-- Rooms error -->
      <div v-if="roomsError" class="py-12 text-center bg-(--color-error-container) rounded-2xl mb-8">
        <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-3">wifi_off</span>
        <p class="font-sans text-sm text-(--color-on-error-container)">{{ roomsError }}</p>
      </div>

      <!-- Rooms skeleton -->
      <div v-else-if="roomsLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        <div v-for="i in 3" :key="i"
          class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden animate-pulse">
          <div class="h-44 bg-(--color-surface-container-highest)" />
          <div class="p-4 space-y-2">
            <div class="h-4 bg-(--color-surface-container-highest) rounded w-[75%]" />
            <div class="h-3 bg-(--color-surface-container-highest) rounded w-[50%]" />
          </div>
        </div>
      </div>

      <!-- Room cards -->
      <div v-else-if="rooms.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        <div v-for="room in rooms" :key="room.id"
          class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden shadow-sm flex flex-col">
          <div class="relative h-44 overflow-hidden">
            <img :src="roomImage(room)" :alt="room.name" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
            <span v-if="searched && isAvailableForDates(room.id)"
              class="absolute top-3 right-3 text-white font-sans text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/90">
              Available
            </span>
            <span v-else-if="searched"
              class="absolute top-3 right-3 text-white font-sans text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/90">
              Unavailable
            </span>
            <span
              class="absolute bottom-3 left-3 font-sans text-xs font-semibold bg-(--color-primary) text-white px-2.5 py-1 rounded-full capitalize">
              {{ room.type }}
            </span>
          </div>

          <div class="p-5 flex flex-col flex-1">
            <div class="flex items-start justify-between gap-2 mb-2">
              <h3 class="font-serif text-lg text-(--color-on-surface)">{{ room.name }}</h3>
              <div class="text-right shrink-0">
                <p class="font-serif text-lg text-(--color-primary)">K{{ Number(room.price_per_night).toLocaleString()
                  }}
                </p>
                <span class="font-sans text-xs text-(--color-on-surface-variant)">/ night</span>
              </div>
            </div>

            <p class="flex items-center gap-1.5 font-sans text-xs text-(--color-on-surface-variant) mb-3">
              <span class="material-symbols-outlined text-sm text-(--color-primary)">people</span>
              Sleeps {{ room.capacity }}
            </p>

            <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed line-clamp-2 mb-4 flex-1">
              {{ room.description || 'A comfortable and well-appointed room.' }}
            </p>

            <div class="flex flex-wrap gap-1 mb-4">
              <span v-for="a in (room.amenities ?? []).slice(0, 3)" :key="a"
                class="flex items-center gap-1 bg-(--color-savannah-mist) text-(--color-on-surface-variant) px-2 py-0.5 rounded font-sans text-xs">
                <span class="material-symbols-outlined text-sm text-(--color-primary)">{{ amenityIcon(a) }}</span>
                {{ a }}
              </span>
            </div>

            <button
              :disabled="!(searched && isAvailableForDates(room.id))"
              class="w-full py-2.5 rounded-full font-sans text-sm font-semibold transition-all bg-(--color-primary) text-white hover:bg-(--color-clay-earth) disabled:opacity-40 disabled:cursor-not-allowed"
              @click="reserve(room)"
            >
              {{ reserveLabel(room.id) }}
            </button>
            <RouterLink
              :to="`/rooms/${room.id}`"
              class="w-full mt-2 py-2.5 rounded-full font-sans text-sm font-semibold text-center border-2 border-(--color-primary) text-(--color-primary) hover:bg-(--color-primary) hover:text-white transition-all"
            >
              View Details
            </RouterLink>
          </div>
        </div>
      </div>

      <div v-else
        class="py-16 text-center bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) mb-8">
        <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">bed</span>
        <p class="font-serif text-xl text-(--color-on-surface)">No rooms listed</p>
        <p class="font-sans text-sm text-(--color-on-surface-variant) mt-2">This lodge has no rooms configured yet.</p>
      </div>

      <!-- Pagination -->
      <div v-if="roomsTotalPages > 1" class="flex items-center justify-center gap-2 mt-10 mb-4">
        <button
          :disabled="roomsPage <= 1 || roomsLoading"
          class="w-9 h-9 flex items-center justify-center rounded-full border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          @click="goToPage(roomsPage - 1)"
        >
          <span class="material-symbols-outlined text-base">chevron_left</span>
        </button>

        <button
          v-for="p in roomsTotalPages" :key="p"
          :class="roomPageClass(p)"
          class="w-9 h-9 flex items-center justify-center rounded-full border font-sans text-sm font-medium transition-colors"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>

        <button
          :disabled="roomsPage >= roomsTotalPages || roomsLoading"
          class="w-9 h-9 flex items-center justify-center rounded-full border border-(--color-outline-variant) text-(--color-on-surface-variant) hover:bg-(--color-surface-container) disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          @click="goToPage(roomsPage + 1)"
        >
          <span class="material-symbols-outlined text-base">chevron_right</span>
        </button>
      </div>
    </section>

  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/index'
import api from '@/lib/api'

const booking = useBookingStore()

defineProps({
  errors: { type: Object, default: () => ({}) },
})

const checkInOpen  = ref(false)
const checkOutOpen = ref(false)
const bookedDates  = ref([])
const todayDate    = today(getLocalTimeZone())

watch(() => booking.roomId, async (id) => {
  if (!id) return
  try {
    const { data } = await api.get(`/guest/rooms/${id}`)
    bookedDates.value = data.booked_dates ?? []
  } catch {
    bookedDates.value = []
  }
}, { immediate: true })

function toIso(cd) {
  if (!cd) return ''
  return `${cd.year}-${String(cd.month).padStart(2, '0')}-${String(cd.day).padStart(2, '0')}`
}

function formatDisplay(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const checkInValue = computed({
  get: () => booking.checkIn ? parseDate(booking.checkIn) : undefined,
  set: (v) => {
    booking.checkIn = toIso(v)
    checkInOpen.value = false
  },
})

const checkOutValue = computed({
  get: () => booking.checkOut ? parseDate(booking.checkOut) : undefined,
  set: (v) => {
    booking.checkOut = toIso(v)
    checkOutOpen.value = false
  },
})

const checkOutMin = computed(() =>
  booking.checkIn ? parseDate(booking.checkIn).add({ days: 1 }) : todayDate.add({ days: 1 })
)

const isDateUnavailable = computed(() => {
  if (!bookedDates.value.length) return () => false
  return (date) => {
    const d = toIso(date)
    return bookedDates.value.some(b => d >= b.check_in && d < b.check_out)
  }
})

const dateError = computed(() => {
  if (!booking.checkIn || !booking.checkOut) return ''
  return new Date(booking.checkOut) <= new Date(booking.checkIn)
    ? 'Check-out must be after check-in'
    : ''
})
</script>

<template>
  <section class="bg-(--color-surface-container-lowest) p-8 rounded-xl border border-(--color-savannah-mist) shadow-sm">
    <h2 class="font-serif text-2xl mb-6 flex items-center gap-3">
      <span class="material-symbols-outlined text-(--color-primary)">calendar_month</span>
      Stay Details
    </h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

      <!-- Room type display -->
      <div class="flex flex-col gap-2">
        <label class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
          Room Type
        </label>
        <div class="bg-(--color-savannah-mist) rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) flex items-center justify-between">
          <span>{{ booking.roomType || 'Not selected' }}</span>
          <span class="material-symbols-outlined text-(--color-on-surface-variant) text-base">lock</span>
        </div>
      </div>

      <!-- Guests -->
      <div class="flex flex-col gap-2">
        <label class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
          Guests
        </label>
        <div class="bg-(--color-savannah-mist) rounded-lg px-3 py-2.5 flex justify-between items-center">
          <span class="font-sans text-sm text-(--color-on-surface)">
            {{ booking.guestCount }} {{ booking.guestCount === 1 ? 'guest' : 'guests' }}
          </span>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="w-7 h-7 rounded-full border border-(--color-outline-variant) flex items-center justify-center font-bold text-(--color-on-surface) hover:border-(--color-primary) hover:text-(--color-primary) transition-colors disabled:opacity-30"
              :disabled="booking.guestCount <= 1"
              @click="booking.guestCount = Math.max(1, booking.guestCount - 1)"
            >−</button>
            <span class="font-sans text-sm font-semibold w-4 text-center">{{ booking.guestCount }}</span>
            <button
              type="button"
              class="w-7 h-7 rounded-full border border-(--color-outline-variant) flex items-center justify-center font-bold text-(--color-on-surface) hover:border-(--color-primary) hover:text-(--color-primary) transition-colors"
              @click="booking.guestCount++"
            >+</button>
          </div>
        </div>
      </div>

      <!-- Check-in -->
      <div class="flex flex-col gap-2">
        <label class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
          Check In <span class="text-(--color-error)">*</span>
        </label>
        <Popover v-model:open="checkInOpen">
          <PopoverTrigger as-child>
            <button
              type="button"
              class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 flex items-center gap-2 text-left border-2 transition-colors focus:outline-none"
              :class="errors.checkIn ? 'border-(--color-error)' : 'border-transparent'"
            >
              <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
              <span class="font-sans text-sm" :class="booking.checkIn ? 'text-(--color-on-surface)' : 'text-(--color-outline)'">
                {{ formatDisplay(booking.checkIn) || 'Select date' }}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" class="w-auto">
            <Calendar
              v-model="checkInValue"
              :min-value="todayDate"
              :is-date-unavailable="isDateUnavailable"
              layout="month-and-year"
            />
          </PopoverContent>
        </Popover>
        <span v-if="errors.checkIn" class="font-sans text-xs text-(--color-error)">{{ errors.checkIn }}</span>
      </div>

      <!-- Check-out -->
      <div class="flex flex-col gap-2">
        <label class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
          Check Out <span class="text-(--color-error)">*</span>
        </label>
        <Popover v-model:open="checkOutOpen">
          <PopoverTrigger as-child>
            <button
              type="button"
              class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 flex items-center gap-2 text-left border-2 transition-colors focus:outline-none"
              :class="(errors.checkOut || dateError) ? 'border-(--color-error)' : 'border-transparent'"
            >
              <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
              <span class="font-sans text-sm" :class="booking.checkOut ? 'text-(--color-on-surface)' : 'text-(--color-outline)'">
                {{ formatDisplay(booking.checkOut) || 'Select date' }}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" class="w-auto">
            <Calendar
              v-model="checkOutValue"
              :min-value="checkOutMin"
              :is-date-unavailable="isDateUnavailable"
              layout="month-and-year"
            />
          </PopoverContent>
        </Popover>
        <span v-if="errors.checkOut || dateError" class="font-sans text-xs text-(--color-error)">
          {{ errors.checkOut || dateError }}
        </span>
      </div>

    </div>
  </section>
</template>

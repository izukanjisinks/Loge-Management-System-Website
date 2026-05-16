<script setup>
import { computed, ref, watch } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/index'
import api from '@/lib/api'

const booking = useBookingStore()

defineProps({
  errors: { type: Object, default: () => ({}) },
})

const calendarOpen = ref(false)
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

const dateRange = computed({
  get: () => ({
    start: booking.checkIn  ? parseDate(booking.checkIn)  : undefined,
    end:   booking.checkOut ? parseDate(booking.checkOut) : undefined,
  }),
  set: (v) => {
    booking.checkIn  = toIso(v?.start)
    booking.checkOut = toIso(v?.end)
    if (v?.start && v?.end) calendarOpen.value = false
  },
})

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

function formatDisplay(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
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
            >âˆ’</button>
            <span class="font-sans text-sm font-semibold w-4 text-center">{{ booking.guestCount }}</span>
            <button
              type="button"
              class="w-7 h-7 rounded-full border border-(--color-outline-variant) flex items-center justify-center font-bold text-(--color-on-surface) hover:border-(--color-primary) hover:text-(--color-primary) transition-colors"
              @click="booking.guestCount++"
            >+</button>
          </div>
        </div>
      </div>

      <!-- Date picker -->
      <div class="md:col-span-2 flex flex-col gap-2">
        <label class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
          Stay Dates <span class="text-(--color-error)">*</span>
        </label>
        <Popover v-model:open="calendarOpen">
          <PopoverTrigger as-child>
            <button
              type="button"
              class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 flex items-center justify-between gap-2 text-left
                     border-2 transition-colors focus:outline-none"
              :class="(errors.checkIn || errors.checkOut || dateError) ? 'border-(--color-error)' : 'border-transparent focus:border-(--color-primary)'"
            >
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-(--color-primary)">calendar_today</span>
                <span class="font-sans text-sm" :class="booking.checkIn ? 'text-(--color-on-surface)' : 'text-(--color-on-surface-variant)'">
                  {{ booking.checkIn ? `${formatDisplay(booking.checkIn)} â†’ ${formatDisplay(booking.checkOut) || 'â€”'}` : 'Select check-in and check-out dates' }}
                </span>
              </div>
              <span class="material-symbols-outlined text-(--color-on-surface-variant) text-base shrink-0">expand_more</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" class="w-auto">
            <RangeCalendar
              v-model="dateRange"
              :min-value="todayDate"
              :is-date-unavailable="isDateUnavailable"
            />
          </PopoverContent>
        </Popover>
        <span v-if="errors.checkIn || errors.checkOut" class="font-sans text-xs text-(--color-error)">
          {{ errors.checkIn || errors.checkOut }}
        </span>
        <span v-else-if="dateError" class="font-sans text-xs text-(--color-error)">{{ dateError }}</span>
      </div>

    </div>
  </section>
</template>

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

const calendarOpen  = ref(false)
const bookedDates   = ref([])
const todayDate     = today(getLocalTimeZone())

// Fetch booked dates for this room when the component mounts
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

const inputClass = 'w-full bg-transparent border-0 border-b border-[--color-outline] py-2.5 font-sans text-sm text-[--color-on-surface] transition-colors'
const labelClass = 'font-sans text-xs font-semibold tracking-widest uppercase text-[--color-on-muted]'
</script>

<template>
  <section>
    <div class="flex items-center gap-4 mb-8">
      <span class="font-serif text-2xl text-[--color-primary]/40 select-none">02</span>
      <h2 class="font-serif text-2xl text-[--color-on-surface]">Stay Details</h2>
    </div>

    <div
      class="bg-[--color-surface] p-8 rounded-lg"
      style="box-shadow: var(--shadow-card);"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">

        <!-- Room type (display only) -->
        <div class="flex flex-col gap-1.5">
          <label :class="labelClass">Room Type</label>
          <div :class="[inputClass, 'flex items-center justify-between cursor-default']">
            <span>{{ booking.roomType || 'Not selected' }}</span>
            <span class="material-symbols-outlined text-[--color-on-muted] text-base">lock</span>
          </div>
        </div>

        <!-- Guest stepper -->
        <div class="flex flex-col gap-1.5">
          <label :class="labelClass">Guests</label>
          <div class="flex items-center gap-4 border-b border-[--color-outline] py-2">
            <button
              type="button"
              class="w-7 h-7 rounded-lg bg-[--color-secondary] flex items-center justify-center font-bold text-[--color-on-surface] hover:bg-[--color-outline]/20 transition-colors disabled:opacity-30"
              :disabled="booking.guestCount <= 1"
              @click="booking.guestCount = Math.max(1, booking.guestCount - 1)"
            >−</button>
            <span class="font-sans text-sm text-[--color-on-surface] flex-1 text-center">
              {{ booking.guestCount }} {{ booking.guestCount === 1 ? 'guest' : 'guests' }}
            </span>
            <button
              type="button"
              class="w-7 h-7 rounded-lg bg-[--color-secondary] flex items-center justify-center font-bold text-[--color-on-surface] hover:bg-[--color-outline]/20 transition-colors"
              @click="booking.guestCount++"
            >+</button>
          </div>
        </div>

        <!-- Date range picker — spans full width -->
        <div class="md:col-span-2 flex flex-col gap-1.5">
          <label :class="labelClass">
            Stay Dates <span class="text-[--color-error]">*</span>
          </label>
          <Popover v-model:open="calendarOpen">
            <PopoverTrigger as-child>
              <button
                type="button"
                class="w-full flex items-center justify-between border-b py-2.5 font-sans text-sm text-left transition-colors focus:outline-none"
                :class="(errors.checkIn || errors.checkOut || dateError) ? 'border-[--color-error]' : 'border-[--color-outline]'"
              >
                <span v-if="booking.checkIn || booking.checkOut" style="color: var(--color-on-surface);">
                  {{ formatDisplay(booking.checkIn) || '—' }} → {{ formatDisplay(booking.checkOut) || '—' }}
                </span>
                <span v-else style="color: var(--color-on-muted);">Select check-in and check-out</span>
                <span class="material-symbols-outlined text-base shrink-0" style="color: var(--color-on-muted);">calendar_month</span>
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
          <span v-if="errors.checkIn || errors.checkOut" class="font-sans text-xs text-[--color-error]">
            {{ errors.checkIn || errors.checkOut }}
          </span>
          <span v-else-if="dateError" class="font-sans text-xs text-[--color-error]">{{ dateError }}</span>
        </div>

      </div>
    </div>
  </section>
</template>

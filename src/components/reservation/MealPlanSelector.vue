<script setup>
import { useBookingStore } from '@/stores/booking'

const booking = useBookingStore()

const options = [
  {
    value: 'full_board',
    label: 'Full Board',
    desc:  'Breakfast, lunch & dinner included',
    icon:  'restaurant',
    rate:  85,
  },
  {
    value: 'half_board',
    label: 'Half Board',
    desc:  'Breakfast & dinner included',
    icon:  'brunch_dining',
    rate:  45,
  },
  {
    value: 'breakfast',
    label: 'Breakfast Only',
    desc:  'Morning meal included',
    icon:  'free_breakfast',
    rate:  20,
  },
  {
    value: 'none',
    label: 'Room Only',
    desc:  'No meals included',
    icon:  'bed',
    rate:  0,
  },
]
</script>

<template>
  <div>
    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-[--color-on-muted] block mb-3">
      Meal Plan
    </label>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label
        v-for="opt in options"
        :key="opt.value"
        class="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 select-none"
        :class="booking.mealPlan === opt.value
          ? 'border-[--color-primary] bg-[oklch(0.55_0.12_45/0.05)]'
          : 'border-[oklch(0_0_0/0.08)] hover:border-[oklch(0_0_0/0.16)]'"
      >
        <input
          type="radio"
          :value="opt.value"
          v-model="booking.mealPlan"
          class="mt-1 accent-[--color-primary] shrink-0"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span
              class="material-symbols-outlined text-base"
              :class="booking.mealPlan === opt.value ? 'text-[--color-primary]' : 'text-[--color-on-muted]'"
            >{{ opt.icon }}</span>
            <p class="font-sans text-sm font-semibold text-[--color-on-surface]">{{ opt.label }}</p>
          </div>
          <p class="font-sans text-xs text-[--color-on-muted] leading-relaxed">{{ opt.desc }}</p>
          <p
            v-if="opt.rate > 0"
            class="font-sans text-xs font-semibold mt-1.5"
            :class="booking.mealPlan === opt.value ? 'text-[--color-primary]' : 'text-[--color-on-muted]'"
          >
            +${{ opt.rate }} / person / night
          </p>
          <p v-else class="font-sans text-xs text-[--color-on-muted] mt-1.5">No supplement</p>
        </div>
      </label>
    </div>
  </div>
</template>

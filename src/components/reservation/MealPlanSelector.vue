<script setup lang="ts">
import { onMounted } from 'vue'
import { useBookingStore }   from '@/stores/booking'
import { useMealPlansStore } from '@/stores/mealPlans'

const booking   = useBookingStore()
const mealPlans = useMealPlansStore()

onMounted(() => mealPlans.fetchAll())

function select(plan) {
  booking.setMealPlan(
    plan?.id   ?? null,
    plan?.name ?? 'Room Only',
    plan?.price_per_person_per_night ?? 0,
  )
}
</script>

<template>
  <div>
    <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-muted) block mb-3">
      Meal Plan
    </label>

    <!-- Loading skeleton -->
    <div v-if="mealPlans.loading" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div v-for="n in 4" :key="n" class="h-20 rounded-lg bg-(--color-outline)/20 animate-pulse" />
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">

      <!-- Room Only (no meal plan) -->
      <label
        class="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 select-none"
        :class="booking.mealPlanId === null
          ? 'border-(--color-primary) bg-[oklch(0.55_0.12_45/0.05)]'
          : 'border-[oklch(0_0_0/0.08)] hover:border-[oklch(0_0_0/0.16)]'"
      >
        <input
          type="radio"
          :value="null"
          :checked="booking.mealPlanId === null"
          class="mt-1 accent-(--color-primary) shrink-0"
          @change="select(null)"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span
              class="material-symbols-outlined text-base"
              :class="booking.mealPlanId === null ? 'text-(--color-primary)' : 'text-(--color-on-muted)'"
            >bed</span>
            <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Room Only</p>
          </div>
          <p class="font-sans text-xs text-(--color-on-muted) leading-relaxed">No meals included</p>
          <p class="font-sans text-xs text-(--color-on-muted) mt-1.5">No supplement</p>
        </div>
      </label>

      <!-- API meal plans -->
      <label
        v-for="plan in mealPlans.plans"
        :key="plan.id"
        class="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 select-none"
        :class="booking.mealPlanId === plan.id
          ? 'border-(--color-primary) bg-[oklch(0.55_0.12_45/0.05)]'
          : 'border-[oklch(0_0_0/0.08)] hover:border-[oklch(0_0_0/0.16)]'"
      >
        <input
          type="radio"
          :value="plan.id"
          :checked="booking.mealPlanId === plan.id"
          class="mt-1 accent-(--color-primary) shrink-0"
          @change="select(plan)"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span
              class="material-symbols-outlined text-base"
              :class="booking.mealPlanId === plan.id ? 'text-(--color-primary)' : 'text-(--color-on-muted)'"
            >restaurant</span>
            <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ plan.name }}</p>
          </div>
          <p class="font-sans text-xs text-(--color-on-muted) leading-relaxed">{{ plan.description }}</p>
          <p
            class="font-sans text-xs font-semibold mt-1.5"
            :class="booking.mealPlanId === plan.id ? 'text-(--color-primary)' : 'text-(--color-on-muted)'"
          >
            +K{{ plan.price_per_person_per_night.toLocaleString() }} / person / night
          </p>
        </div>
      </label>

    </div>
  </div>
</template>
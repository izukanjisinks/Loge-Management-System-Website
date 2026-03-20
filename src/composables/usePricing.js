import { computed } from 'vue'

const MEAL_PLAN_RATES = {
  full_board:  85,
  half_board:  45,
  breakfast:   20,
  none:         0,
}

const TAX_RATE = 0.12

/**
 * Reactive pricing calculator — use outside of the booking store
 * when you need a standalone price estimate (e.g. room detail page).
 *
 * @param {Ref<string>} checkIn
 * @param {Ref<string>} checkOut
 * @param {Ref<number>} baseRate    — per night
 * @param {Ref<number>} guestCount
 * @param {Ref<string>} mealPlan
 */
export function usePricing(checkIn, checkOut, baseRate, guestCount, mealPlan) {
  const nightCount = computed(() => {
    if (!checkIn.value || !checkOut.value) return 0
    const diff = new Date(checkOut.value) - new Date(checkIn.value)
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  })

  const baseTotal = computed(() => nightCount.value * (baseRate.value ?? 0))

  const mealCost = computed(
    () => (MEAL_PLAN_RATES[mealPlan.value] ?? 0) * (guestCount.value ?? 1) * nightCount.value
  )

  const taxes = computed(() => (baseTotal.value + mealCost.value) * TAX_RATE)

  const grandTotal = computed(() => baseTotal.value + mealCost.value + taxes.value)

  return { nightCount, baseTotal, mealCost, taxes, grandTotal }
}

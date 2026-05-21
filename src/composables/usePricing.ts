import { computed, type Ref } from 'vue'

const MEAL_PLAN_RATES: Record<string, number> = {
  full_board: 85,
  half_board: 45,
  breakfast:  20,
  none:        0,
}

const TAX_RATE = 0.12

export function usePricing(
  checkIn:    Ref<string>,
  checkOut:   Ref<string>,
  baseRate:   Ref<number>,
  guestCount: Ref<number>,
  mealPlan:   Ref<string>
) {
  const nightCount = computed(() => {
    if (!checkIn.value || !checkOut.value) return 0
    const diff = new Date(checkOut.value).getTime() - new Date(checkIn.value).getTime()
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  })

  const baseTotal  = computed(() => nightCount.value * (baseRate.value ?? 0))
  const mealCost   = computed(() => (MEAL_PLAN_RATES[mealPlan.value] ?? 0) * (guestCount.value ?? 1) * nightCount.value)
  const taxes      = computed(() => (baseTotal.value + mealCost.value) * TAX_RATE)
  const grandTotal = computed(() => baseTotal.value + mealCost.value + taxes.value)

  return { nightCount, baseTotal, mealCost, taxes, grandTotal }
}

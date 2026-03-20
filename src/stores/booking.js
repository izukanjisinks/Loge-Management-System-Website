import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const MEAL_PLAN_RATES = {
  full_board:  85,
  half_board:  45,
  breakfast:   20,
  none:         0,
}

const TAX_RATE = 0.12

export const useBookingStore = defineStore('booking', () => {
  const roomId          = ref(null)
  const roomType        = ref('')
  const baseRatePerNight = ref(0)
  const checkIn         = ref('')
  const checkOut        = ref('')
  const guestCount      = ref(1)
  const mealPlan        = ref('breakfast') // 'full_board' | 'half_board' | 'breakfast' | 'none'
  const specialRequests = ref('')
  const guestInfo       = ref({
    firstName:   '',
    lastName:    '',
    email:       '',
    phone:       '',
    nationality: '',
    passportId:  '',
  })

  const nightCount = computed(() => {
    if (!checkIn.value || !checkOut.value) return 0
    const diff = new Date(checkOut.value) - new Date(checkIn.value)
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  })

  const baseTotal = computed(() => nightCount.value * baseRatePerNight.value)

  const mealCost = computed(
    () => (MEAL_PLAN_RATES[mealPlan.value] ?? 0) * guestCount.value * nightCount.value
  )

  const taxes = computed(() => (baseTotal.value + mealCost.value) * TAX_RATE)

  const grandTotal = computed(() => baseTotal.value + mealCost.value + taxes.value)

  function setRoom(id, type, rate) {
    roomId.value           = id
    roomType.value         = type
    baseRatePerNight.value = rate
  }

  function setDates(ci, co) {
    checkIn.value  = ci
    checkOut.value = co
  }

  function reset() {
    roomId.value           = null
    roomType.value         = ''
    baseRatePerNight.value = 0
    checkIn.value          = ''
    checkOut.value         = ''
    guestCount.value       = 1
    mealPlan.value         = 'breakfast'
    specialRequests.value  = ''
    guestInfo.value        = { firstName: '', lastName: '', email: '', phone: '', nationality: '', passportId: '' }
  }

  return {
    roomId, roomType, baseRatePerNight,
    checkIn, checkOut, guestCount,
    mealPlan, specialRequests, guestInfo,
    nightCount, baseTotal, mealCost, taxes, grandTotal,
    setRoom, setDates, reset,
  }
})

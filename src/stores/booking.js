import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const TAX_RATE = 0.12

export const useBookingStore = defineStore('booking', () => {
  const roomId           = ref(null)
  const lodgeId          = ref(null)
  const roomType         = ref('')
  const baseRatePerNight = ref(0)
  const checkIn          = ref('')
  const checkOut         = ref('')
  const guestCount       = ref(1)
  // mealPlanId: UUID of the chosen meal plan (sent to API)
  const mealPlanId       = ref(null)
  // mealPlanName / mealPlanRate: for display in summary
  const mealPlanName     = ref('Room Only')
  const mealPlanRate     = ref(0)   // price_per_person_per_night
  const specialRequests  = ref('')
  const guestInfo        = ref({
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
    () => mealPlanRate.value * guestCount.value * nightCount.value
  )

  const taxes = computed(() => (baseTotal.value + mealCost.value) * TAX_RATE)

  const grandTotal = computed(() => baseTotal.value + mealCost.value + taxes.value)

  function setRoom(id, type, rate, orgId = null) {
    roomId.value           = id
    lodgeId.value          = orgId
    roomType.value         = type
    baseRatePerNight.value = rate
  }

  function setDates(ci, co) {
    checkIn.value  = ci
    checkOut.value = co
  }

  function setMealPlan(id, name, rate) {
    mealPlanId.value   = id
    mealPlanName.value = name
    mealPlanRate.value = rate
  }

  function reset() {
    roomId.value           = null
    lodgeId.value          = null
    roomType.value         = ''
    baseRatePerNight.value = 0
    checkIn.value          = ''
    checkOut.value         = ''
    guestCount.value       = 1
    mealPlanId.value       = null
    mealPlanName.value     = 'Room Only'
    mealPlanRate.value     = 0
    specialRequests.value  = ''
    guestInfo.value        = { firstName: '', lastName: '', email: '', phone: '', nationality: '', passportId: '' }
  }

  return {
    roomId, lodgeId, roomType, baseRatePerNight,
    checkIn, checkOut, guestCount,
    mealPlanId, mealPlanName, mealPlanRate,
    specialRequests, guestInfo,
    nightCount, baseTotal, mealCost, taxes, grandTotal,
    setRoom, setDates, setMealPlan, reset,
  }
})
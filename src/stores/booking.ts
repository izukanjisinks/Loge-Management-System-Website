import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface GuestInfo {
  firstName:   string
  lastName:    string
  email:       string
  phone:       string
  nationality: string
  passportId:  string
}

export const useBookingStore = defineStore('booking', () => {
  const roomId           = ref<string | null>(null)
  const roomName         = ref('')
  const roomType         = ref('')
  const roomCapacity     = ref(0)
  const lodgeName        = ref('')
  const baseRatePerNight = ref(0)
  const checkIn          = ref('')
  const checkOut         = ref('')
  const guestCount       = ref(1)
  const mealPlanId       = ref<string | null>(null)
  const mealPlanName     = ref('Room Only')
  const mealPlanRate     = ref(0)
  const specialRequests  = ref('')
  const guestInfo        = ref<GuestInfo>({
    firstName:   '',
    lastName:    '',
    email:       '',
    phone:       '',
    nationality: '',
    passportId:  '',
  })

  const nightCount = computed(() => {
    if (!checkIn.value || !checkOut.value) return 0
    const diff = new Date(checkOut.value).getTime() - new Date(checkIn.value).getTime()
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  })

  const baseTotal  = computed(() => nightCount.value * baseRatePerNight.value)
  const mealCost   = computed(() => mealPlanRate.value * guestCount.value * nightCount.value)
  const grandTotal = computed(() => baseTotal.value + mealCost.value)

  function setRoom(id: string, name: string, type: string, rate: number, capacity = 0) {
    roomId.value           = id
    roomName.value         = name
    roomType.value         = type
    baseRatePerNight.value = rate
    roomCapacity.value     = capacity
  }

  function setDates(ci: string, co: string) {
    checkIn.value  = ci
    checkOut.value = co
  }

  function setMealPlan(id: string | null, name: string, rate: number) {
    mealPlanId.value   = id
    mealPlanName.value = name
    mealPlanRate.value = rate
  }

  function reset() {
    roomId.value           = null
    roomName.value         = ''
    roomType.value         = ''
    roomCapacity.value     = 0
    lodgeName.value        = ''
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
    roomId, roomName, roomType, roomCapacity, lodgeName, baseRatePerNight,
    checkIn, checkOut, guestCount,
    mealPlanId, mealPlanName, mealPlanRate,
    specialRequests, guestInfo,
    nightCount, baseTotal, mealCost, grandTotal,
    setRoom, setDates, setMealPlan, reset,
  }
})

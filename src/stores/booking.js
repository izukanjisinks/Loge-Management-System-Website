import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const TAX_RATE = 0.12

export const useBookingStore = defineStore('booking', () => {
  // ── Shared ────────────────────────────────────────────────────────────
  const bookingType = ref('individual') // 'individual' | 'corporate'

  // ── Room ──────────────────────────────────────────────────────────────
  const roomId           = ref(null)
  const lodgeId          = ref(null)
  const lodgeName        = ref('')
  const roomType         = ref('')
  const baseRatePerNight = ref(0)

  // ── Dates / guests (individual + corporate shared) ────────────────────
  const checkIn         = ref('')
  const checkOut        = ref('')
  const guestCount      = ref(1)
  const specialRequests = ref('')

  // ── Meal plan ─────────────────────────────────────────────────────────
  const mealPlanId   = ref(null)
  const mealPlanName = ref('Room Only')
  const mealPlanRate = ref(0)

  // ── Individual guest info ─────────────────────────────────────────────
  const guestInfo = ref({
    firstName:   '',
    lastName:    '',
    email:       '',
    phone:       '',
    nationality: '',
    passportId:  '',
  })

  // ── Corporate client info ─────────────────────────────────────────────
  const corporateClient = ref({
    companyName:    '',
    contactPerson:  '',
    email:          '',
    phone:          '',
    regNumber:      '',
    industry:       '',
  })

  // ── Corporate employee guests ─────────────────────────────────────────
  // Each: { fullName, email, phone, idNumber, roomId, checkIn, checkOut }
  const corporateGuests = ref([
    { fullName: '', email: '', phone: '', idNumber: '', roomId: '', checkIn: '', checkOut: '' },
  ])

  // ── Computed ──────────────────────────────────────────────────────────
  const nightCount = computed(() => {
    if (!checkIn.value || !checkOut.value) return 0
    const diff = new Date(checkOut.value) - new Date(checkIn.value)
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  })

  const baseTotal = computed(() => nightCount.value * baseRatePerNight.value)
  const mealCost  = computed(() => mealPlanRate.value * guestCount.value * nightCount.value)
  const taxes     = computed(() => (baseTotal.value + mealCost.value) * TAX_RATE)
  const grandTotal = computed(() => baseTotal.value + mealCost.value + taxes.value)

  // ── Actions ───────────────────────────────────────────────────────────
  function setRoom(id, type, rate, orgId = null, orgName = '') {
    roomId.value           = id
    lodgeId.value          = orgId
    lodgeName.value        = orgName
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

  function addCorporateGuest() {
    corporateGuests.value.push({
      fullName: '', email: '', phone: '', idNumber: '',
      roomId: roomId.value ?? '', checkIn: checkIn.value, checkOut: checkOut.value,
    })
  }

  function removeCorporateGuest(index) {
    if (corporateGuests.value.length > 1) corporateGuests.value.splice(index, 1)
  }

  function reset() {
    bookingType.value      = 'individual'
    roomId.value           = null
    lodgeId.value          = null
    lodgeName.value        = ''
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
    corporateClient.value  = { companyName: '', contactPerson: '', email: '', phone: '', regNumber: '', industry: '' }
    corporateGuests.value  = [{ fullName: '', email: '', phone: '', idNumber: '', roomId: '', checkIn: '', checkOut: '' }]
  }

  return {
    bookingType,
    roomId, lodgeId, lodgeName, roomType, baseRatePerNight,
    checkIn, checkOut, guestCount, specialRequests,
    mealPlanId, mealPlanName, mealPlanRate,
    guestInfo, corporateClient, corporateGuests,
    nightCount, baseTotal, mealCost, taxes, grandTotal,
    setRoom, setDates, setMealPlan,
    addCorporateGuest, removeCorporateGuest,
    reset,
  }
})

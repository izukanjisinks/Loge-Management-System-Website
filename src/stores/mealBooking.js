import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/lib/api'
import { flattenMeals } from './corporateBooking'

function blankAttendant(isLead = false) {
  return { fullName: '', email: '', phone: '', idNumber: '', dietaryNotes: '', company: '', isLead }
}

function blankMeal() {
  return {
    sessionName:       '',
    mealPeriod:        'lunch',
    serviceType:       'buffet',
    buffetItemId:      '',
    paxCount:          10,
    dietaryNotes:      '',
    arrangementsNotes: '',
    individualOrders:  [],
  }
}

export const useMealBookingStore = defineStore('mealBooking', () => {
  // Lodge context
  const lodgeId   = ref(null)
  const lodgeName = ref('')
  const branchId  = ref('')

  // 'individual' | 'corporate'
  const bookingContext = ref('individual')
  const isCorporate   = computed(() => bookingContext.value === 'corporate')

  // Booker — auto-filled from auth
  const bookedBy = ref({ name: '', email: '', phone: '', jobTitle: '', manNumber: '' })

  // Participant mode (individual only — corporate always headcount)
  const participantMode  = ref('headcount')
  const participantCount = ref(10)
  const attendants       = ref([blankAttendant(true)])

  // Corporate company snapshot
  const companyName    = ref('')
  const tpin           = ref('')
  const industry       = ref('')
  const companyEmail   = ref('')
  const companyPhone   = ref('')
  const city           = ref('')
  const streetAddress  = ref('')
  const branchName     = ref('')
  const departmentName = ref('')
  const costCenter     = ref('')
  const costCenterType = ref('cost_center') // 'cost_center' | 'internal_order'
  const glCode         = ref('')

  // Corporate approver
  const approverName  = ref('')
  const approverEmail = ref('')
  const approverPhone = ref('')
  const approverTitle = ref('')

  // Meal plan
  const reasonForBooking = ref('')
  const startDate        = ref('')
  const endDate          = ref('')
  const scheduleMode     = ref('uniform')   // 'uniform' | 'per_day'
  const masterMeals      = ref([blankMeal()])
  const mealOverrides    = ref({})

  const notes = ref('')

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function setLodge(id, name) {
    lodgeId.value   = id
    lodgeName.value = name
  }

  function fillFromAuth(user) {
    if (!user) return
    const fullName = user.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    if (!bookedBy.value.name)  bookedBy.value.name  = fullName
    if (!bookedBy.value.email) bookedBy.value.email = user.email || ''
    if (!bookedBy.value.phone) bookedBy.value.phone = user.phone || ''
    const lead = attendants.value.find(a => a.isLead)
    if (lead && !lead.fullName) {
      lead.fullName = fullName
      lead.email    = user.email || ''
      lead.phone    = user.phone || ''
    }
  }

  // ── Attendants ────────────────────────────────────────────────────────────────

  function addAttendant()     { attendants.value.push(blankAttendant()) }
  function removeAttendant(i) {
    if (attendants.value.length > 1) {
      const wasLead = attendants.value[i]?.isLead
      attendants.value.splice(i, 1)
      if (wasLead) attendants.value[0].isLead = true
    }
  }
  function setLead(i) {
    attendants.value.forEach((a, idx) => { a.isLead = idx === i })
  }

  // ── Meal plan management ──────────────────────────────────────────────────────

  function addMasterMeal()     { masterMeals.value.push(blankMeal()) }
  function removeMasterMeal(i) { if (masterMeals.value.length > 1) masterMeals.value.splice(i, 1) }

  function setMealOverride(date) {
    if (!mealOverrides.value[date]) {
      mealOverrides.value[date] = {
        excluded: false,
        sessions: masterMeals.value.map(m => ({ ...m })),
      }
    }
  }

  function clearMealOverride(date) {
    delete mealOverrides.value[date]
  }

  function toggleMealDayExcluded(date) {
    const ov = mealOverrides.value[date]
    if (!ov) {
      mealOverrides.value[date] = { excluded: true, sessions: [] }
    } else {
      ov.excluded = !ov.excluded
    }
  }

  function addOverrideMeal(date) {
    const ov = mealOverrides.value[date]
    if (ov) ov.sessions.push(blankMeal())
  }

  function removeOverrideMeal(date, i) {
    const ov = mealOverrides.value[date]
    if (ov && ov.sessions.length > 1) ov.sessions.splice(i, 1)
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function submit() {
    const useHeadcount = participantMode.value === 'headcount'

    const mealObj = {
      mealMode:      'standalone',
      startDate:     startDate.value,
      endDate:       endDate.value,
      masterMeals:   masterMeals.value,
      mealOverrides: mealOverrides.value,
    }

    const payload = {
      org_id:          lodgeId.value,
      branch_id:       branchId.value  || null,
      booking_type:    'meal',
      source:          'web',
      currency:        'ZMW',
      booking_context: bookingContext.value,

      participant_mode:  participantMode.value,
      participant_count: useHeadcount ? participantCount.value : null,

      booked_by: {
        name:       bookedBy.value.name      || null,
        email:      bookedBy.value.email     || null,
        phone:      bookedBy.value.phone     || null,
        job_title:  bookedBy.value.jobTitle  || null,
        man_number: bookedBy.value.manNumber || null,
      },

      attendants: useHeadcount
        ? [{
            full_name:       bookedBy.value.name  || null,
            email:           bookedBy.value.email || null,
            phone:           bookedBy.value.phone || null,
            id_number:       null,
            dietary_notes:   null,
            company:         null,
            is_lead_contact: true,
          }]
        : attendants.value.map(a => ({
            full_name:       a.fullName     || null,
            email:           a.email        || null,
            phone:           a.phone        || null,
            id_number:       a.idNumber     || null,
            dietary_notes:   a.dietaryNotes || null,
            company:         a.company      || null,
            is_lead_contact: a.isLead,
          })),

      company: isCorporate.value ? {
        name:            companyName.value    || null,
        tpin:            tpin.value           || null,
        industry:        industry.value       || null,
        email:           companyEmail.value   || null,
        phone:           companyPhone.value   || null,
        city:            city.value           || null,
        street_address:  streetAddress.value  || null,
        branch_name:     branchName.value     || null,
        department_name: departmentName.value || null,
        cost_center:      costCenter.value     || null,
        cost_center_type: costCenterType.value,
        gl_code:          glCode.value         || null,
      } : null,

      approver: isCorporate.value ? {
        name:  approverName.value  || null,
        email: approverEmail.value || null,
        phone: approverPhone.value || null,
        title: approverTitle.value || null,
      } : null,

      meal: {
        reason_for_booking: reasonForBooking.value || null,
        meal_mode:          'standalone',
        start_date:         startDate.value        || null,
        end_date:           endDate.value          || null,
        schedule_mode:      scheduleMode.value,
        notes:              notes.value            || null,
        sessions: flattenMeals(mealObj, null).map(m => ({
          session_name:       m.sessionName       || null,
          meal_date:          m.mealDate          || null,
          meal_period:        m.mealPeriod,
          service_type:       m.serviceType,
          menu_item_id:       m.serviceType === 'buffet' ? (m.buffetItemId || null) : null,
          pax_count:          m.paxCount          || null,
          dietary_notes:      m.dietaryNotes      || null,
          arrangements_notes: m.arrangementsNotes || null,
          individual_orders:  participantMode.value === 'detailed' && (m.individualOrders ?? []).filter(o => o.menuItemId).length
            ? (m.individualOrders ?? []).filter(o => o.menuItemId).map(o => ({
                attendant_idx: o.attendantIdx,
                menu_item_id:  o.menuItemId,
                quantity:      o.quantity,
                notes:         o.notes || undefined,
              }))
            : undefined,
        })),
      },
    }

    const endpoint = bookingContext.value === 'corporate'
      ? '/guest/bookings/corporate-meal'
      : '/guest/bookings/meal'
    const { data } = await api.post(endpoint, payload)
    return data
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  function reset() {
    bookingContext.value   = 'individual'
    bookedBy.value         = { name: '', email: '', phone: '', jobTitle: '', manNumber: '' }
    participantMode.value  = 'headcount'
    participantCount.value = 10
    attendants.value       = [blankAttendant(true)]
    reasonForBooking.value = ''
    startDate.value        = ''
    endDate.value          = ''
    scheduleMode.value     = 'uniform'
    masterMeals.value      = [blankMeal()]
    mealOverrides.value    = {}
    notes.value            = ''
    companyName.value = ''; tpin.value = ''; industry.value = ''
    companyEmail.value = ''; companyPhone.value = ''; city.value = ''
    streetAddress.value = ''; branchName.value = ''; departmentName.value = ''
    costCenter.value = ''; costCenterType.value = 'cost_center'; glCode.value = ''
    approverName.value = ''; approverEmail.value = ''; approverPhone.value = ''; approverTitle.value = ''
  }

  return {
    lodgeId, lodgeName, branchId,
    bookingContext, isCorporate,
    bookedBy, participantMode, participantCount, attendants,
    companyName, tpin, industry, companyEmail, companyPhone,
    city, streetAddress, branchName, departmentName, costCenter, costCenterType, glCode,
    approverName, approverEmail, approverPhone, approverTitle,
    reasonForBooking, startDate, endDate, scheduleMode, masterMeals, mealOverrides,
    notes,
    setLodge, fillFromAuth,
    addAttendant, removeAttendant, setLead,
    addMasterMeal, removeMasterMeal,
    setMealOverride, clearMealOverride, toggleMealDayExcluded,
    addOverrideMeal, removeOverrideMeal,
    submit, reset,
  }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/lib/api'

function blankAttendant(isLead = false) {
  return { fullName: '', email: '', phone: '', idNumber: '', dietaryNotes: '', company: '', isLead }
}

function blankSessionTemplate() {
  return {
    sessionName: '',
    eventType: 'conference',
    startTime: '09:00',
    endTime: '17:00',
    expectedAttendees: 10,
    setupType: 'boardroom',
    venueId: '',
    venueName: '',
    venueCapacity: null,
    pricingBasis: 'full_day',
    specialRequirements: '',
  }
}

export function flattenSessions(ev) {
  const { startDate, endDate, masterSessions, dayOverrides } = ev
  if (!startDate || !endDate || endDate < startDate) {
    return masterSessions.map(s => ({ ...s, eventDate: '' }))
  }
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const start = new Date(Date.UTC(sy, sm - 1, sd))
  const end   = new Date(Date.UTC(ey, em - 1, ed))
  const result = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10)
    const override = dayOverrides[date]
    if (override?.excluded) continue
    const sessions = override?.sessions ?? masterSessions
    sessions.forEach(s => result.push({ ...s, eventDate: date }))
  }
  return result
}

function blankMealTemplate() {
  return {
    sessionName: '',
    mealPeriod: 'lunch',
    serviceType: 'buffet',
    paxCount: 10,
    linkedMasterSessionIndex: null,
    dietaryNotes: '',
    arrangementsNotes: '',
    individualOrders: [],
  }
}

export function flattenMeals(meals, events) {
  const { masterMeals, mealOverrides, mealMode } = meals
  const startDate = mealMode === 'standalone' ? (meals.startDate ?? '') : (events?.startDate ?? '')
  const endDate   = mealMode === 'standalone' ? (meals.endDate   ?? '') : (events?.endDate   ?? '')
  if (!startDate || !endDate || endDate < startDate) {
    return masterMeals.map(m => ({ ...m, mealDate: '', individualOrders: [] }))
  }
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const start = new Date(Date.UTC(sy, sm - 1, sd))
  const end   = new Date(Date.UTC(ey, em - 1, ed))
  const result = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10)
    const ov = mealOverrides[date]
    if (ov?.excluded) continue
    const sessions = ov?.sessions ?? masterMeals
    sessions.forEach(m => result.push({ ...m, mealDate: date, individualOrders: m.individualOrders ?? [] }))
  }
  return result
}

export const useCorporateBookingStore = defineStore('corporateBooking', () => {
  // Lodge/property context
  const lodgeId   = ref(null)
  const lodgeName = ref('')
  const branchId  = ref('')  // property branch (for lodge with multiple branches)

  // Company hierarchy — IDs for reporting only; booking stores snapshots
  const selectedCompanyId  = ref(null)
  const selectedBranchId   = ref(null)  // company branch
  const selectedProfileId  = ref(null)

  // Booking snapshot fields (copied from profile, overridable by rep)
  const companyName     = ref('')
  const tpin            = ref('')
  const industry        = ref('')
  const companyEmail    = ref('')
  const companyPhone    = ref('')
  const city            = ref('')
  const streetAddress   = ref('')
  const branchName      = ref('')
  const departmentName  = ref('')
  const costCenter      = ref('')
  const costCenterType  = ref('cost_center') // 'cost_center' | 'internal_order'
  const glCode          = ref('')
  const country         = ref('')
  const approverName    = ref('')
  const approverEmail   = ref('')
  const approverPhone   = ref('')
  const approverTitle   = ref('')

  // Booker (rep submitting the booking — auto-filled from auth user)
  const bookedBy = ref({ name: '', email: '', phone: '', jobTitle: '', manNumber: '' })

  // Services enabled (multiple can be active per booking)
  const accommodationEnabled = ref(false)
  const eventsEnabled        = ref(false)
  const mealsEnabled         = ref(false)

  // Unified attendants — the spine; each person registered once per booking
  const attendants       = ref([blankAttendant(true)])
  const participantMode  = ref('headcount')  // 'headcount' | 'detailed'
  const participantCount = ref(10)           // total attendees in headcount mode

  // Accommodation service
  const accommodation = ref({
    reasonForBooking: '',
    roomType: '',
    roomCount: 1,
    checkIn: '',
    checkOut: '',
    notes: '',
  })

  // Events service — master schedule + per-day overrides
  const events = ref({
    reasonForBooking: '',
    startDate: '',
    endDate: '',
    scheduleMode: 'uniform',    // 'uniform' | 'per_day'
    masterSessions: [blankSessionTemplate()],
    dayOverrides: {},           // { 'YYYY-MM-DD': { excluded: bool, sessions: [...] } }
  })

  // Meals service — master plan + per-day overrides
  const meals = ref({
    reasonForBooking: '',
    mealMode: 'event_linked',   // 'event_linked' | 'standalone'
    startDate: '',              // standalone only
    endDate: '',                // standalone only
    scheduleMode: 'uniform',
    masterMeals: [blankMealTemplate()],
    mealOverrides: {},
  })

  // General booking notes
  const notes = ref('')

  const hasAnyService = computed(() =>
    accommodationEnabled.value || eventsEnabled.value || mealsEnabled.value
  )

  const enabledServicesCount = computed(() =>
    [accommodationEnabled.value, eventsEnabled.value, mealsEnabled.value].filter(Boolean).length
  )

  function setLodge(id, name) {
    lodgeId.value   = id
    lodgeName.value = name
  }

  function fillFromProfile(company, branch, profile) {
    selectedCompanyId.value = company?.id ?? null
    selectedBranchId.value  = branch?.id  ?? null
    selectedProfileId.value = profile?.id ?? null

    companyName.value    = company?.name            ?? companyName.value
    tpin.value           = company?.registrationNo  ?? tpin.value
    industry.value       = company?.industry        ?? industry.value
    companyEmail.value   = company?.billingEmail    ?? companyEmail.value
    companyPhone.value   = branch?.phone            ?? company?.phone   ?? companyPhone.value
    branchName.value     = branch?.name             ?? branchName.value

    if (profile) {
      departmentName.value = profile.departmentName ?? ''
      costCenter.value     = profile.costCenter     ?? ''
      glCode.value         = profile.glCode         ?? ''
      approverName.value   = profile.approverName   ?? ''
      approverEmail.value  = profile.approverEmail  ?? ''
      approverPhone.value  = profile.approverPhone  ?? ''
      approverTitle.value  = profile.approverTitle  ?? ''
    }
  }

  function clearCompanySelection() {
    selectedCompanyId.value  = null
    selectedBranchId.value   = null
    selectedProfileId.value  = null
    companyName.value        = ''
    tpin.value               = ''
    industry.value           = ''
    companyEmail.value       = ''
    companyPhone.value       = ''
    city.value               = ''
    streetAddress.value      = ''
    country.value            = ''
    branchName.value         = ''
    departmentName.value     = ''
    costCenter.value         = ''
    glCode.value             = ''
    approverName.value       = ''
    approverEmail.value      = ''
    approverPhone.value      = ''
    approverTitle.value      = ''
  }

  // Attendant management
  function addAttendant()      { attendants.value.push(blankAttendant()) }
  function removeAttendant(i)  { if (attendants.value.length > 1) attendants.value.splice(i, 1) }

  // Event session management
  function addMasterSession()     { events.value.masterSessions.push(blankSessionTemplate()) }
  function removeMasterSession(i) { if (events.value.masterSessions.length > 1) events.value.masterSessions.splice(i, 1) }

  function setDayOverride(date) {
    if (!events.value.dayOverrides[date]) {
      events.value.dayOverrides[date] = {
        excluded: false,
        sessions: events.value.masterSessions.map(s => ({ ...s })),
      }
    }
  }
  function clearDayOverride(date)  { delete events.value.dayOverrides[date] }
  function toggleDayExcluded(date) {
    const ov = events.value.dayOverrides[date]
    if (!ov) {
      events.value.dayOverrides[date] = { excluded: true, sessions: [] }
    } else {
      ov.excluded = !ov.excluded
    }
  }
  function addOverrideSession(date) {
    const ov = events.value.dayOverrides[date]
    if (ov) ov.sessions.push(blankSessionTemplate())
  }
  function removeOverrideSession(date, i) {
    const ov = events.value.dayOverrides[date]
    if (ov && ov.sessions.length > 1) ov.sessions.splice(i, 1)
  }

  // Meal plan management
  function addMasterMeal()      { meals.value.masterMeals.push(blankMealTemplate()) }
  function removeMasterMeal(i)  { if (meals.value.masterMeals.length > 1) meals.value.masterMeals.splice(i, 1) }

  function setMealOverride(date) {
    if (!meals.value.mealOverrides[date]) {
      meals.value.mealOverrides[date] = {
        excluded: false,
        sessions: meals.value.masterMeals.map(m => ({ ...m, individualOrders: [] })),
      }
    }
  }
  function clearMealOverride(date)  { delete meals.value.mealOverrides[date] }
  function toggleMealDayExcluded(date) {
    const ov = meals.value.mealOverrides[date]
    if (!ov) {
      meals.value.mealOverrides[date] = { excluded: true, sessions: [] }
    } else {
      ov.excluded = !ov.excluded
    }
  }
  function addOverrideMeal(date) {
    const ov = meals.value.mealOverrides[date]
    if (ov) ov.sessions.push({ ...blankMealTemplate(), individualOrders: [] })
  }
  function removeOverrideMeal(date, i) {
    const ov = meals.value.mealOverrides[date]
    if (ov && ov.sessions.length > 1) ov.sessions.splice(i, 1)
  }

  async function submit() {
    const payload = {
      org_id:      lodgeId.value,
      branch_id:   branchId.value   || undefined,
      booking_type: 'corporate',

      // Company snapshot
      company_name:        companyName.value    || undefined,
      tpin:                tpin.value           || undefined,
      industry:            industry.value       || undefined,
      company_email:       companyEmail.value   || undefined,
      company_phone:       companyPhone.value   || undefined,
      city:                city.value           || undefined,
      street_address:      streetAddress.value  || undefined,
      country:             country.value        || undefined,
      branch_name:         branchName.value     || undefined,
      department_name:     departmentName.value || undefined,
      cost_center:         costCenter.value      || undefined,
      cost_center_type:    costCenterType.value,
      gl_code:             glCode.value          || undefined,
      approver_name:       approverName.value   || undefined,
      approver_email:      approverEmail.value  || undefined,
      approver_phone:      approverPhone.value  || undefined,
      approver_title:      approverTitle.value  || undefined,
      corporate_profile_id: selectedProfileId.value || undefined,

      booked_by: {
        name:       bookedBy.value.name,
        email:      bookedBy.value.email,
        phone:      bookedBy.value.phone     || undefined,
        job_title:  bookedBy.value.jobTitle  || undefined,
        man_number: bookedBy.value.manNumber || undefined,
      },

      attendants: participantMode.value === 'headcount'
        ? [{ full_name: bookedBy.value.name, email: bookedBy.value.email || undefined, phone: bookedBy.value.phone || undefined, is_lead_contact: true }]
        : attendants.value.map(a => ({
            full_name:       a.fullName,
            email:           a.email        || undefined,
            phone:           a.phone        || undefined,
            id_number:       a.idNumber     || undefined,
            dietary_notes:   a.dietaryNotes || undefined,
            company:         a.company      || undefined,
            is_lead_contact: a.isLead,
          })),
      participant_count: participantMode.value === 'headcount' ? participantCount.value : undefined,

      notes: notes.value || undefined,
    }

    if (accommodationEnabled.value) {
      const a = accommodation.value
      payload.accommodation = {
        reason_for_booking: a.reasonForBooking || undefined,
        room_type:          a.roomType         || undefined,
        room_count:         a.roomCount,
        check_in:           a.checkIn          || undefined,
        check_out:          a.checkOut         || undefined,
        notes:              a.notes            || undefined,
      }
    }

    if (eventsEnabled.value) {
      payload.events = {
        reason_for_booking: events.value.reasonForBooking || undefined,
        schedule_mode: events.value.scheduleMode,
        sessions: flattenSessions(events.value).map(s => ({
          event_name:           s.sessionName          || undefined,
          event_type:           s.eventType,
          event_date:           s.eventDate             || undefined,
          start_time:           s.startTime,
          end_time:             s.endTime,
          expected_attendees:   s.expectedAttendees,
          setup_type:           s.setupType,
          venue_id:             s.venueId              || undefined,
          pricing_basis:        s.pricingBasis,
          special_requirements: s.specialRequirements  || undefined,
        })),
      }
    }

    if (mealsEnabled.value) {
      payload.meals = {
        reason_for_booking: meals.value.reasonForBooking || undefined,
        schedule_mode: meals.value.scheduleMode,
        sessions: flattenMeals(meals.value, eventsEnabled.value ? events.value : null).map(m => ({
          session_name:                m.sessionName                || undefined,
          meal_date:                   m.mealDate                   || undefined,
          meal_period:                 m.mealPeriod,
          service_type:                m.serviceType,
          pax_count:                   m.paxCount,
          linked_master_session_index: m.linkedMasterSessionIndex   ?? undefined,
          dietary_notes:               m.dietaryNotes               || undefined,
          arrangements_notes:          m.arrangementsNotes          || undefined,
          individual_orders: participantMode.value === 'detailed' && (m.individualOrders ?? []).length
            ? (m.individualOrders ?? [])
                .filter(o => o.menuItemId)
                .map(o => ({
                  attendant_idx: o.attendantIdx,
                  menu_item_id:  o.menuItemId,
                  quantity:      o.quantity,
                  notes:         o.notes || undefined,
                }))
            : undefined,
        })),
      }
    }

    const { data } = await api.post('/guest/bookings/corporate', payload)
    return data
  }

  function reset() {
    selectedCompanyId.value  = null
    selectedBranchId.value   = null
    selectedProfileId.value  = null
    companyName.value        = ''
    tpin.value               = ''
    industry.value           = ''
    companyEmail.value       = ''
    companyPhone.value       = ''
    city.value               = ''
    streetAddress.value      = ''
    country.value            = ''
    branchName.value         = ''
    departmentName.value     = ''
    costCenter.value         = ''
    costCenterType.value     = 'cost_center'
    glCode.value             = ''
    approverName.value       = ''
    approverEmail.value      = ''
    approverPhone.value      = ''
    approverTitle.value      = ''
    bookedBy.value           = { name: '', email: '', phone: '', jobTitle: '', manNumber: '' }
    accommodationEnabled.value = false
    eventsEnabled.value        = false
    mealsEnabled.value         = false
    attendants.value           = [blankAttendant(true)]
    participantMode.value      = 'headcount'
    participantCount.value     = 10
    accommodation.value = { reasonForBooking: '', roomType: '', roomCount: 1, checkIn: '', checkOut: '', notes: '' }
    events.value        = { reasonForBooking: '', startDate: '', endDate: '', scheduleMode: 'uniform', masterSessions: [blankSessionTemplate()], dayOverrides: {} }
    meals.value         = { reasonForBooking: '', mealMode: 'event_linked', startDate: '', endDate: '', scheduleMode: 'uniform', masterMeals: [blankMealTemplate()], mealOverrides: {} }
    notes.value         = ''
  }

  return {
    lodgeId, lodgeName, branchId,
    selectedCompanyId, selectedBranchId, selectedProfileId,
    companyName, tpin, industry,
    companyEmail, companyPhone, city, streetAddress, country,
    branchName, departmentName, costCenter, costCenterType, glCode,
    approverName, approverEmail, approverPhone, approverTitle,
    bookedBy, notes,
    accommodationEnabled, eventsEnabled, mealsEnabled,
    attendants, accommodation, events, meals,
    hasAnyService, enabledServicesCount,
    participantMode, participantCount,
    setLodge, fillFromProfile, clearCompanySelection,
    addAttendant, removeAttendant,
    addMasterSession, removeMasterSession,
    setDayOverride, clearDayOverride, toggleDayExcluded, addOverrideSession, removeOverrideSession,
    addMasterMeal, removeMasterMeal,
    setMealOverride, clearMealOverride, toggleMealDayExcluded, addOverrideMeal, removeOverrideMeal,
    submit, reset,
  }
})

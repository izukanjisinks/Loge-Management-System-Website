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

function blankMealSession() {
  return {
    sessionName: '',
    mealDate: '',
    mealPeriod: 'lunch',
    serviceType: 'buffet',
    paxCount: 10,
    linkedEventIndex: null,
    dietaryNotes: '',
    arrangementsNotes: '',
    groupItems: [],
    individualOrders: [],
  }
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
  const registrationNo  = ref('')
  const industry        = ref('')
  const branchName      = ref('')
  const departmentName  = ref('')
  const costCenter      = ref('')
  const glCode          = ref('')
  const approverName    = ref('')
  const approverEmail   = ref('')
  const approverPhone   = ref('')
  const approverTitle   = ref('')

  // Booker (rep submitting the booking — auto-filled from auth user)
  const bookedBy = ref({ name: '', email: '', phone: '', jobTitle: '' })

  // Services enabled (multiple can be active per booking)
  const accommodationEnabled = ref(false)
  const eventsEnabled        = ref(false)
  const mealsEnabled         = ref(false)

  // Unified attendants — the spine; each person registered once per booking
  const attendants = ref([blankAttendant(true)])

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

  // Meals service — multiple sessions (breakfast, lunch, gala dinner, etc.)
  const meals = ref({
    reasonForBooking: '',
    sessions: [blankMealSession()],
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
    registrationNo.value = company?.registrationNo  ?? registrationNo.value
    industry.value       = company?.industry        ?? industry.value
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
    registrationNo.value     = ''
    industry.value           = ''
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

  // Meal session management
  function addMealSession()      { meals.value.sessions.push(blankMealSession()) }
  function removeMealSession(i)  { if (meals.value.sessions.length > 1) meals.value.sessions.splice(i, 1) }

  async function submit() {
    const payload = {
      org_id:      lodgeId.value,
      branch_id:   branchId.value   || undefined,
      booking_type: 'corporate',

      // Company snapshot
      company_name:        companyName.value    || undefined,
      registration_no:     registrationNo.value || undefined,
      industry:            industry.value       || undefined,
      branch_name:         branchName.value     || undefined,
      department_name:     departmentName.value || undefined,
      cost_center:         costCenter.value     || undefined,
      gl_code:             glCode.value         || undefined,
      approver_name:       approverName.value   || undefined,
      approver_email:      approverEmail.value  || undefined,
      approver_phone:      approverPhone.value  || undefined,
      approver_title:      approverTitle.value  || undefined,
      corporate_profile_id: selectedProfileId.value || undefined,

      booked_by: {
        name:      bookedBy.value.name,
        email:     bookedBy.value.email,
        phone:     bookedBy.value.phone    || undefined,
        job_title: bookedBy.value.jobTitle || undefined,
      },

      attendants: attendants.value.map(a => ({
        full_name:      a.fullName,
        email:          a.email        || undefined,
        phone:          a.phone        || undefined,
        id_number:      a.idNumber     || undefined,
        dietary_notes:  a.dietaryNotes || undefined,
        company:        a.company      || undefined,
        is_lead_contact: a.isLead,
      })),

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
        sessions: meals.value.sessions.map(s => ({
          session_name:        s.sessionName         || undefined,
          meal_date:           s.mealDate            || undefined,
          meal_period:         s.mealPeriod,
          service_type:        s.serviceType,
          pax_count:           s.paxCount,
          linked_event_index:  s.linkedEventIndex    ?? undefined,
          dietary_notes:       s.dietaryNotes        || undefined,
          arrangements_notes:  s.arrangementsNotes   || undefined,
          individual_orders:   s.individualOrders?.length
            ? s.individualOrders
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

    const { data } = await api.post('/guest/bookings/corporate-event', payload)
    return data
  }

  function reset() {
    selectedCompanyId.value  = null
    selectedBranchId.value   = null
    selectedProfileId.value  = null
    companyName.value        = ''
    registrationNo.value     = ''
    industry.value           = ''
    branchName.value         = ''
    departmentName.value     = ''
    costCenter.value         = ''
    glCode.value             = ''
    approverName.value       = ''
    approverEmail.value      = ''
    approverPhone.value      = ''
    approverTitle.value      = ''
    bookedBy.value           = { name: '', email: '', phone: '', jobTitle: '' }
    accommodationEnabled.value = false
    eventsEnabled.value        = false
    mealsEnabled.value         = false
    attendants.value           = [blankAttendant(true)]
    accommodation.value = { reasonForBooking: '', roomType: '', roomCount: 1, checkIn: '', checkOut: '', notes: '' }
    events.value        = { reasonForBooking: '', startDate: '', endDate: '', scheduleMode: 'uniform', masterSessions: [blankSessionTemplate()], dayOverrides: {} }
    meals.value         = { reasonForBooking: '', sessions: [blankMealSession()] }
    notes.value         = ''
  }

  return {
    lodgeId, lodgeName, branchId,
    selectedCompanyId, selectedBranchId, selectedProfileId,
    companyName, registrationNo, industry,
    branchName, departmentName, costCenter, glCode,
    approverName, approverEmail, approverPhone, approverTitle,
    bookedBy, notes,
    accommodationEnabled, eventsEnabled, mealsEnabled,
    attendants, accommodation, events, meals,
    hasAnyService, enabledServicesCount,
    setLodge, fillFromProfile, clearCompanySelection,
    addAttendant, removeAttendant,
    addMasterSession, removeMasterSession,
    setDayOverride, clearDayOverride, toggleDayExcluded, addOverrideSession, removeOverrideSession,
    addMealSession, removeMealSession,
    submit, reset,
  }
})

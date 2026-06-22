import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/lib/api'
import { flattenSessions } from './corporateBooking'

function blankAttendant(isLead = false) {
  return { fullName: '', email: '', phone: '', idNumber: '', dietaryNotes: '', company: '', isLead }
}

function blankSession() {
  return {
    sessionName:         '',
    eventType:           'conference',
    startTime:           '09:00',
    endTime:             '17:00',
    expectedAttendees:   10,
    setupType:           'boardroom',
    venueId:             '',
    venueName:           '',
    venueCapacity:       null,
    pricingBasis:        'full_day',
    specialRequirements: '',
  }
}

export const useEventBookingStore = defineStore('eventBooking', () => {
  // Lodge context
  const lodgeId   = ref(null)
  const lodgeName = ref('')
  const branchId  = ref('')

  // 'individual' | 'corporate'
  const bookingContext = ref('individual')
  const isCorporate   = computed(() => bookingContext.value === 'corporate')

  // Booker — auto-filled from auth
  const bookedBy = ref({ name: '', email: '', phone: '', jobTitle: '' })

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
  const glCode         = ref('')

  // Corporate approver
  const approverName  = ref('')
  const approverEmail = ref('')
  const approverPhone = ref('')
  const approverTitle = ref('')

  // Event schedule
  const reasonForBooking = ref('')
  const startDate        = ref('')
  const endDate          = ref('')
  const scheduleMode     = ref('uniform')   // 'uniform' | 'per_day'
  const masterSessions   = ref([blankSession()])
  const dayOverrides     = ref({})

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

  // ── Event session management ──────────────────────────────────────────────────

  function addMasterSession()     { masterSessions.value.push(blankSession()) }
  function removeMasterSession(i) { if (masterSessions.value.length > 1) masterSessions.value.splice(i, 1) }

  function setDayOverride(date) {
    if (!dayOverrides.value[date]) {
      dayOverrides.value[date] = {
        excluded: false,
        sessions: masterSessions.value.map(s => ({ ...s })),
      }
    }
  }

  function clearDayOverride(date) {
    delete dayOverrides.value[date]
  }

  function toggleDayExcluded(date) {
    const ov = dayOverrides.value[date]
    if (!ov) {
      dayOverrides.value[date] = { excluded: true, sessions: [] }
    } else {
      ov.excluded = !ov.excluded
    }
  }

  function addOverrideSession(date) {
    const ov = dayOverrides.value[date]
    if (ov) ov.sessions.push(blankSession())
  }

  function removeOverrideSession(date, i) {
    const ov = dayOverrides.value[date]
    if (ov && ov.sessions.length > 1) ov.sessions.splice(i, 1)
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function submit() {
    const useHeadcount = participantMode.value === 'headcount'

    const evObj = { startDate: startDate.value, endDate: endDate.value, masterSessions: masterSessions.value, dayOverrides: dayOverrides.value }

    const payload = {
      org_id:          lodgeId.value,
      branch_id:       branchId.value  || null,
      booking_type:    'event',
      source:          'web',
      currency:        'ZMW',
      booking_context: bookingContext.value,

      participant_mode:  participantMode.value,
      participant_count: useHeadcount ? participantCount.value : null,

      booked_by: {
        name:      bookedBy.value.name     || null,
        email:     bookedBy.value.email    || null,
        phone:     bookedBy.value.phone    || null,
        job_title: bookedBy.value.jobTitle || null,
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
        cost_center:     costCenter.value     || null,
        gl_code:         glCode.value         || null,
      } : null,

      approver: isCorporate.value ? {
        name:  approverName.value  || null,
        email: approverEmail.value || null,
        phone: approverPhone.value || null,
        title: approverTitle.value || null,
      } : null,

      event: {
        reason_for_booking: reasonForBooking.value || null,
        start_date:         startDate.value        || null,
        end_date:           endDate.value          || null,
        schedule_mode:      scheduleMode.value,
        notes:              notes.value            || null,
        sessions: flattenSessions(evObj).map(s => ({
          event_name:           s.sessionName         || null,
          event_type:           s.eventType,
          event_date:           s.eventDate           || null,
          start_time:           s.startTime,
          end_time:             s.endTime,
          expected_attendees:   s.expectedAttendees   || null,
          setup_type:           s.setupType,
          venue_id:             s.venueId             || null,
          venue_name:           s.venueName           || null,
          venue_capacity:       s.venueCapacity       || null,
          pricing_basis:        s.pricingBasis,
          special_requirements: s.specialRequirements || null,
        })),
      },
    }

    const { data } = await api.post('/guest/bookings/event', payload)
    return data
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  function reset() {
    bookingContext.value   = 'individual'
    bookedBy.value         = { name: '', email: '', phone: '', jobTitle: '' }
    participantMode.value  = 'headcount'
    participantCount.value = 10
    attendants.value       = [blankAttendant(true)]
    reasonForBooking.value = ''
    startDate.value        = ''
    endDate.value          = ''
    scheduleMode.value     = 'uniform'
    masterSessions.value   = [blankSession()]
    dayOverrides.value     = {}
    notes.value            = ''
    companyName.value = ''; tpin.value = ''; industry.value = ''
    companyEmail.value = ''; companyPhone.value = ''; city.value = ''
    streetAddress.value = ''; branchName.value = ''; departmentName.value = ''
    costCenter.value = ''; glCode.value = ''
    approverName.value = ''; approverEmail.value = ''; approverPhone.value = ''; approverTitle.value = ''
  }

  return {
    lodgeId, lodgeName, branchId,
    bookingContext, isCorporate,
    bookedBy, participantMode, participantCount, attendants,
    companyName, tpin, industry, companyEmail, companyPhone,
    city, streetAddress, branchName, departmentName, costCenter, glCode,
    approverName, approverEmail, approverPhone, approverTitle,
    reasonForBooking, startDate, endDate, scheduleMode, masterSessions, dayOverrides,
    notes,
    setLodge, fillFromAuth,
    addAttendant, removeAttendant, setLead,
    addMasterSession, removeMasterSession,
    setDayOverride, clearDayOverride, toggleDayExcluded,
    addOverrideSession, removeOverrideSession,
    submit, reset,
  }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/lib/api'

function blankAttendant(isLead = false) {
  return { fullName: '', email: '', phone: '', idNumber: '', dietaryNotes: '', company: '', isLead }
}

export const useAccommodationBookingStore = defineStore('accommodationBooking', () => {
  // Lodge context
  const lodgeId   = ref(null)
  const lodgeName = ref('')
  const branchId  = ref('')

  // 'individual' | 'corporate'
  const bookingContext = ref('individual')
  const isCorporate   = computed(() => bookingContext.value === 'corporate')

  // Booker — auto-filled from auth
  const bookedBy = ref({ name: '', email: '', phone: '', jobTitle: '' })

  const participantMode  = ref('detailed')
  const participantCount = ref(1)
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

  // Accommodation
  const checkIn  = ref('')
  const checkOut = ref('')
  const notes    = ref('')

  // Individual: per-slot room assignments  { attendantIdx, roomId, roomName, roomType, rate }
  const attendantRooms = ref([])

  // Corporate: room preference (property assigns specific rooms)
  const roomCount          = ref(1)
  const roomTypePreference = ref('')

  // ── Helpers ─────────────────────────────────────────────────────────────────

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

  // ── Attendant management ─────────────────────────────────────────────────────

  function addAttendant() { attendants.value.push(blankAttendant()) }

  function removeAttendant(i) {
    if (attendants.value.length > 1) {
      const wasLead = attendants.value[i]?.isLead
      attendants.value.splice(i, 1)
      attendantRooms.value = attendantRooms.value
        .filter(r => r.attendantIdx !== i)
        .map(r => r.attendantIdx > i ? { ...r, attendantIdx: r.attendantIdx - 1 } : r)
      if (wasLead) attendants.value[0].isLead = true
    }
  }

  function setLead(i) {
    attendants.value.forEach((a, idx) => { a.isLead = idx === i })
  }

  // ── Room assignment management ───────────────────────────────────────────────

  function setAttendantRoom(idx, room) {
    const existing = attendantRooms.value.findIndex(r => r.attendantIdx === idx)
    const entry = { attendantIdx: idx, roomId: room.id, roomName: room.name, roomType: room.type, rate: room.price_per_night }
    if (existing >= 0) attendantRooms.value.splice(existing, 1, entry)
    else attendantRooms.value.push(entry)
  }

  function clearAttendantRoom(idx) {
    attendantRooms.value = attendantRooms.value.filter(r => r.attendantIdx !== idx)
  }

  function getAttendantRoom(idx) {
    return attendantRooms.value.find(r => r.attendantIdx === idx) ?? null
  }

  function clearAllRooms() {
    attendantRooms.value = []
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function submit(documents = []) {
    const useHeadcount = participantMode.value === 'headcount'

    const payload = {
      org_id:          lodgeId.value,
      branch_id:       branchId.value  || null,
      booking_type:    'accommodation',
      source:          'web',
      currency:        'ZMW',
      booking_context: bookingContext.value,
      documents,

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

      accommodation: {
        check_in:             checkIn.value           || null,
        check_out:            checkOut.value          || null,
        notes:                notes.value             || null,
        room_count:           isCorporate.value ? roomCount.value : null,
        room_type_preference: isCorporate.value ? (roomTypePreference.value || null) : null,
        rooms: !isCorporate.value
          ? attendantRooms.value.map((r, i) => ({
              slot_index:     i,
              attendant_idx:  r.attendantIdx,
              room_id:        r.roomId,
              room_name:      r.roomName       || null,
              room_type:      r.roomType       || null,
              rate_per_night: r.rate           || null,
            }))
          : null,
      },
    }

    const endpoint = bookingContext.value === 'corporate'
      ? '/guest/bookings/corporate'
      : '/guest/bookings/accommodation'
    const { data } = await api.post(endpoint, payload)
    return data
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  function reset() {
    bookingContext.value   = 'individual'
    bookedBy.value         = { name: '', email: '', phone: '', jobTitle: '' }
    participantMode.value  = 'detailed'
    participantCount.value = 1
    attendants.value       = [blankAttendant(true)]
    attendantRooms.value   = []
    checkIn.value          = ''
    checkOut.value         = ''
    notes.value            = ''
    roomCount.value        = 1
    roomTypePreference.value = ''
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
    checkIn, checkOut, notes,
    attendantRooms, roomCount, roomTypePreference,
    setLodge, fillFromAuth,
    addAttendant, removeAttendant, setLead,
    setAttendantRoom, clearAttendantRoom, getAttendantRoom, clearAllRooms,
    submit, reset,
  }
})

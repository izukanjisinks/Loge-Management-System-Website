import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/lib/api'
import { flattenSessions, flattenMeals } from './corporateBooking'

function blankAttendant(isLead = false) {
  return { fullName: '', email: '', phone: '', idNumber: '', dietaryNotes: '', isLead }
}

function blankSessionTemplate() {
  return {
    sessionName: '',
    eventType: 'conference',
    startTime: '09:00',
    endTime: '17:00',
    expectedAttendees: 1,
    setupType: 'boardroom',
    venueId: '',
    pricingBasis: 'full_day',
    specialRequirements: '',
  }
}

function blankMealTemplate() {
  return {
    sessionName: '',
    mealPeriod: 'lunch',
    serviceType: 'buffet',
    paxCount: 1,
    linkedMasterSessionIndex: null,
    dietaryNotes: '',
    arrangementsNotes: '',
    individualOrders: [],
  }
}

export const useIndividualBookingStore = defineStore('individualBooking', () => {
  const lodgeId   = ref(null)
  const lodgeName = ref('')
  const branchId  = ref('')

  // Auto-filled from auth; stored for audit trail
  const bookedBy = ref({ name: '', email: '', phone: '' })

  const accommodationEnabled = ref(false)
  const eventsEnabled        = ref(false)
  const mealsEnabled         = ref(false)

  const attendants = ref([blankAttendant(true)])

  const accommodation = ref({
    checkIn:        '',
    checkOut:       '',
    notes:          '',
    attendantRooms: [],
  })
  // Guard against stale store instances (HMR / persisted state) missing the new field
  if (!Array.isArray(accommodation.value.attendantRooms)) {
    accommodation.value.attendantRooms = []
  }

  const events = ref({
    reasonForBooking: '',
    startDate: '',
    endDate: '',
    scheduleMode: 'uniform',
    masterSessions: [blankSessionTemplate()],
    dayOverrides: {},
  })

  const meals = ref({
    reasonForBooking: '',
    mealMode: 'event_linked',
    startDate: '',
    endDate: '',
    scheduleMode: 'uniform',
    masterMeals: [blankMealTemplate()],
    mealOverrides: {},
  })

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

  function fillFromAuth(user) {
    if (!user) return
    const fullName = user.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    bookedBy.value.name  = bookedBy.value.name  || fullName
    bookedBy.value.email = bookedBy.value.email || user.email || ''
    bookedBy.value.phone = bookedBy.value.phone || user.phone || ''
    // Pre-fill lead attendant too
    const lead = attendants.value.find(a => a.isLead)
    if (lead && !lead.fullName) {
      lead.fullName = fullName
      lead.email    = user.email || ''
      lead.phone    = user.phone || ''
    }
  }

  // Attendant management
  function addAttendant()     { attendants.value.push(blankAttendant()) }
  function removeAttendant(i) {
    if (attendants.value.length > 1) {
      attendants.value.splice(i, 1)
      ensureRoomsArray()
      accommodation.value.attendantRooms = accommodation.value.attendantRooms
        .filter(r => r.attendantIdx !== i)
        .map(r => r.attendantIdx > i ? { ...r, attendantIdx: r.attendantIdx - 1 } : r)
    }
  }

  // Per-attendant room management
  function ensureRoomsArray() {
    if (!Array.isArray(accommodation.value.attendantRooms)) {
      accommodation.value.attendantRooms = []
    }
  }
  function setAttendantRoom(idx, room) {
    ensureRoomsArray()
    const rooms   = accommodation.value.attendantRooms
    const existing = rooms.findIndex(r => r.attendantIdx === idx)
    const entry    = { attendantIdx: idx, roomId: room.id, roomName: room.name, roomType: room.type, rate: room.price_per_night }
    if (existing >= 0) rooms.splice(existing, 1, entry)   // splice keeps reactivity reliable
    else rooms.push(entry)
  }
  function clearAttendantRoom(idx) {
    ensureRoomsArray()
    accommodation.value.attendantRooms = accommodation.value.attendantRooms.filter(r => r.attendantIdx !== idx)
  }
  function getAttendantRoom(idx) {
    ensureRoomsArray()
    return accommodation.value.attendantRooms.find(r => r.attendantIdx === idx) ?? null
  }

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
      org_id:       lodgeId.value,
      branch_id:    branchId.value || undefined,
      booking_type: 'individual',

      booked_by: {
        name:  bookedBy.value.name,
        email: bookedBy.value.email,
        phone: bookedBy.value.phone || undefined,
      },

      attendants: attendants.value.map(a => ({
        full_name:       a.fullName,
        email:           a.email        || undefined,
        phone:           a.phone        || undefined,
        id_number:       a.idNumber     || undefined,
        dietary_notes:   a.dietaryNotes || undefined,
        is_lead_contact: a.isLead,
      })),

      notes: notes.value || undefined,
    }

    if (accommodationEnabled.value) {
      payload.accommodation = {
        check_in:  accommodation.value.checkIn  || undefined,
        check_out: accommodation.value.checkOut || undefined,
        notes:     accommodation.value.notes    || undefined,
        rooms: accommodation.value.attendantRooms.map(r => ({
          attendant_idx: r.attendantIdx,
          room_id:       r.roomId,
          room_name:     r.roomName,
          room_type:     r.roomType,
        })),
      }
    }

    if (eventsEnabled.value) {
      payload.events = {
        reason_for_booking: events.value.reasonForBooking || undefined,
        schedule_mode: events.value.scheduleMode,
        sessions: flattenSessions(events.value).map(s => ({
          event_name:           s.sessionName         || undefined,
          event_type:           s.eventType,
          event_date:           s.eventDate            || undefined,
          start_time:           s.startTime,
          end_time:             s.endTime,
          expected_attendees:   s.expectedAttendees,
          setup_type:           s.setupType,
          venue_id:             s.venueId             || undefined,
          pricing_basis:        s.pricingBasis,
          special_requirements: s.specialRequirements || undefined,
        })),
      }
    }

    if (mealsEnabled.value) {
      payload.meals = {
        reason_for_booking: meals.value.reasonForBooking || undefined,
        schedule_mode: meals.value.scheduleMode,
        sessions: flattenMeals(meals.value, eventsEnabled.value ? events.value : null).map(m => ({
          session_name:                m.sessionName              || undefined,
          meal_date:                   m.mealDate                 || undefined,
          meal_period:                 m.mealPeriod,
          service_type:                m.serviceType,
          pax_count:                   m.paxCount,
          linked_master_session_index: m.linkedMasterSessionIndex ?? undefined,
          dietary_notes:               m.dietaryNotes             || undefined,
          individual_orders:           (m.individualOrders ?? []).filter(o => o.menuItemId).length
            ? (m.individualOrders ?? []).filter(o => o.menuItemId).map(o => ({
                attendant_idx: o.attendantIdx,
                menu_item_id:  o.menuItemId,
                quantity:      o.quantity,
                notes:         o.notes || undefined,
              }))
            : undefined,
        })),
      }
    }

    const { data } = await api.post('/guest/bookings/individual', payload)
    return data
  }

  function reset() {
    bookedBy.value           = { name: '', email: '', phone: '' }
    accommodationEnabled.value = false
    eventsEnabled.value        = false
    mealsEnabled.value         = false
    attendants.value           = [blankAttendant(true)]
    accommodation.value = { checkIn: '', checkOut: '', notes: '', attendantRooms: [] }
    events.value        = { reasonForBooking: '', startDate: '', endDate: '', scheduleMode: 'uniform', masterSessions: [blankSessionTemplate()], dayOverrides: {} }
    meals.value         = { reasonForBooking: '', mealMode: 'event_linked', startDate: '', endDate: '', scheduleMode: 'uniform', masterMeals: [blankMealTemplate()], mealOverrides: {} }
    notes.value         = ''
  }

  return {
    lodgeId, lodgeName, branchId,
    bookedBy, notes,
    accommodationEnabled, eventsEnabled, mealsEnabled,
    attendants, accommodation, events, meals,
    hasAnyService, enabledServicesCount,
    setLodge, fillFromAuth,
    addAttendant, removeAttendant,
    setAttendantRoom, clearAttendantRoom,
    addMasterSession, removeMasterSession,
    setDayOverride, clearDayOverride, toggleDayExcluded, addOverrideSession, removeOverrideSession,
    addMasterMeal, removeMasterMeal,
    setMealOverride, clearMealOverride, toggleMealDayExcluded, addOverrideMeal, removeOverrideMeal,
    submit, reset,
  }
})

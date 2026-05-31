import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/lib/api'

function blankGuest() {
  return { fullName: '', email: '', phone: '', idNumber: '', checkIn: '', checkOut: '' }
}

function blankSimpleGuest() {
  return { fullName: '', email: '', phone: '', idNumber: '', mealItems: [] }
}

function blankAuthoriser() {
  return { name: '', email: '', phone: '', title: '', department: '', glCode: '' }
}

export const useCorporateBookingStore = defineStore('corporateBooking', () => {
  const lodgeId   = ref(null)
  const lodgeName = ref('')
  const branchId  = ref('')

  const company = ref({
    name:          '',
    regNumber:     '',
    contactPerson: '',
    email:         '',
    phone:         '',
    industry:      '',
    address:       '',
    city:          '',
    country:       '',
    postalCode:    '',
  })

  const accommodation = ref({
    enabled:          true,
    reasonForBooking: '',
    roomType:         '',
    roomCount:        1,
    guests:           [blankGuest()],
    documents:        [],
    authoriser:       blankAuthoriser(),
    costCenter:       '',
    notes:            '',
  })

  const meals = ref({
    enabled:          true,
    reasonForBooking: '',
    planType:         'full_board',
    pax:              1,
    checkIn:          '',
    checkOut:         '',
    dietaryNotes:     '',
    guests:           [blankSimpleGuest()],
    documents:        [],
    authoriser:       blankAuthoriser(),
    costCenter:       '',
  })

  const conference = ref({
    enabled:          true,
    reasonForBooking: '',
    date:             '',
    startTime:        '09:00',
    endTime:          '17:00',
    attendees:        10,
    equipment:        [],
    notes:            '',
    guests:           [blankSimpleGuest()],
    documents:        [],
    authoriser:       blankAuthoriser(),
    costCenter:       '',
  })

  const hasAnyService = computed(() =>
    accommodation.value.enabled || meals.value.enabled || conference.value.enabled
  )

  function setLodge(id, name) {
    lodgeId.value   = id
    lodgeName.value = name
  }

  // Accommodation guests
  function addGuest()      { accommodation.value.guests.push(blankGuest()) }
  function removeGuest(i)  { if (accommodation.value.guests.length > 1) accommodation.value.guests.splice(i, 1) }

  // Meals guests
  function addMealsGuest()      { meals.value.guests.push(blankSimpleGuest()) }
  function removeMealsGuest(i)  { if (meals.value.guests.length > 1) meals.value.guests.splice(i, 1) }

  // Conference guests
  function addConfGuest()      { conference.value.guests.push(blankSimpleGuest()) }
  function removeConfGuest(i)  { if (conference.value.guests.length > 1) conference.value.guests.splice(i, 1) }

  function buildAuthoriserPayload(a) {
    if (!a.name) return undefined
    return {
      name:       a.name,
      email:      a.email      || undefined,
      phone:      a.phone      || undefined,
      title:      a.title      || undefined,
      department: a.department || undefined,
      gl_code:    a.glCode     || undefined,
    }
  }

  function buildSimpleGuests(guests) {
    return guests.map(g => ({
      full_name: g.fullName,
      email:     g.email    || undefined,
      phone:     g.phone    || undefined,
      id_number: g.idNumber || undefined,
    }))
  }

  async function submit() {
    const payload = {
      org_id: lodgeId.value,
      client: {
        company_name:       company.value.name,
        contact_person:     company.value.contactPerson,
        email:              company.value.email,
        phone:              company.value.phone,
        company_reg_number: company.value.regNumber,
        industry:           company.value.industry   || undefined,
        address:            company.value.address    || undefined,
        city:               company.value.city       || undefined,
        country:            company.value.country    || undefined,
        postal_code:        company.value.postalCode || undefined,
      },
    }

    if (branchId.value) payload.branch_id = branchId.value

    if (accommodation.value.enabled) {
      const a = accommodation.value
      payload.accommodation = {
        reason_for_booking: a.reasonForBooking || undefined,
        room_type:          a.roomType  || undefined,
        room_count:         a.roomCount,
        guests: a.guests.map(g => ({
          full_name: g.fullName,
          email:     g.email    || undefined,
          phone:     g.phone    || undefined,
          id_number: g.idNumber || undefined,
          check_in:  g.checkIn,
          check_out: g.checkOut,
        })),
        documents:   a.documents.length ? a.documents : undefined,
        authoriser:  buildAuthoriserPayload(a.authoriser),
        cost_center: a.costCenter || undefined,
        notes:       a.notes      || undefined,
      }
    }

    if (meals.value.enabled) {
      const m = meals.value
      payload.meals = {
        reason_for_booking: m.reasonForBooking || undefined,
        plan_type:          m.planType,
        pax:                m.pax,
        check_in:           m.checkIn      || undefined,
        check_out:          m.checkOut     || undefined,
        dietary_notes:      m.dietaryNotes || undefined,
        guests: m.guests.map(g => ({
          full_name:  g.fullName,
          email:      g.email    || undefined,
          phone:      g.phone    || undefined,
          id_number:  g.idNumber || undefined,
          meal_items: g.mealItems?.length ? g.mealItems.map(item => ({
            menu_item_id: item.menuItemId,
            name:         item.name,
            quantity:     item.quantity,
            price:        item.price || undefined,
          })) : undefined,
        })),
        documents:          m.documents.length ? m.documents : undefined,
        authoriser:         buildAuthoriserPayload(m.authoriser),
        cost_center:        m.costCenter || undefined,
      }
    }

    if (conference.value.enabled) {
      const c = conference.value
      payload.conference = {
        reason_for_booking: c.reasonForBooking || undefined,
        date:               c.date,
        start_time:         c.startTime,
        end_time:           c.endTime,
        attendees:          c.attendees,
        equipment:          c.equipment.length ? c.equipment : undefined,
        notes:              c.notes || undefined,
        guests:             buildSimpleGuests(c.guests),
        documents:          c.documents.length ? c.documents : undefined,
        authoriser:         buildAuthoriserPayload(c.authoriser),
        cost_center:        c.costCenter || undefined,
      }
    }

    const { data } = await api.post('/guest/bookings/corporate-event', payload)
    return data
  }

  function reset() {
    lodgeId.value   = null
    lodgeName.value = ''
    branchId.value  = ''
    company.value   = { name: '', regNumber: '', contactPerson: '', email: '', phone: '', industry: '', address: '', city: '', country: '', postalCode: '' }
    accommodation.value = {
      enabled: true, reasonForBooking: '', roomType: '', roomCount: 1,
      guests: [blankGuest()], documents: [], authoriser: blankAuthoriser(), costCenter: '', notes: '',
    }
    meals.value = {
      enabled: true, reasonForBooking: '', planType: 'full_board', pax: 1, checkIn: '', checkOut: '', dietaryNotes: '',
      guests: [blankSimpleGuest()], documents: [], authoriser: blankAuthoriser(), costCenter: '',
    }
    conference.value = {
      enabled: true, reasonForBooking: '', date: '', startTime: '09:00', endTime: '17:00', attendees: 10, equipment: [], notes: '',
      guests: [blankSimpleGuest()], documents: [], authoriser: blankAuthoriser(), costCenter: '',
    }
  }

  return {
    lodgeId, lodgeName, branchId,
    company, accommodation, meals, conference,
    hasAnyService,
    setLodge,
    addGuest, removeGuest,
    addMealsGuest, removeMealsGuest,
    addConfGuest, removeConfGuest,
    submit, reset,
  }
})

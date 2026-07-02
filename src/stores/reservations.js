import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/api'

export const useReservationsStore = defineStore('reservations', () => {
  const active  = ref([])
  const past    = ref([])
  const loading = ref(false)

  // Normalise a booking row from /web/my-bookings. The same row represents the whole
  // lifecycle: a pending booking carries the raw submission envelope in metadata; an
  // approved one carries that envelope enriched (room_name, nights, assigned_rooms).
  // We read the enriched fields when present and fall back to the raw envelope so
  // pending bookings still render their details.
  function normaliseBooking(b) {
    const meta = b.metadata || {}
    const accom = meta.accommodation || {}
    const firstRoom = Array.isArray(accom.rooms) ? (accom.rooms[0] || {}) : {}
    return {
      id:              b.id,
      bookingNumber:   b.booking_number   || null,
      recordType:      'booking',
      bookingType:     b.booking_type,     // accommodation | event | meals
      bookerType:      b.booker_type,      // individual | corporate
      bookerName:      b.booker_name,
      bookerEmail:     b.booker_email     || null,
      bookerPhone:     b.booker_phone     || null,
      companyName:     b.company_name     || null,
      totalAmount:     b.total_amount     ?? 0,
      status:          b.status,           // pending | confirmed | checked_in | checked_out | cancelled | rejected
      specialRequests: b.special_requests || null,
      createdAt:       b.created_at,
      metadata:        meta,
      // accommodation — enriched (post-approval) first, raw envelope fallback (pending)
      roomId:          meta.room_id       || firstRoom.room_id   || null,
      roomName:        meta.room_name     || firstRoom.room_name || null,
      roomType:        meta.room_type     || firstRoom.room_type || null,
      checkIn:         meta.check_in      || accom.check_in      || null,
      checkOut:        meta.check_out     || accom.check_out     || null,
      nights:          meta.nights        ?? null,
      // accommodation (corporate) — may have assigned_rooms array
      roomCount:       meta.room_count    ?? accom.room_count    ?? null,
      assignedRooms:   meta.assigned_rooms || [],
      // event
      startDate:       meta.start_date    || meta.event?.start_date  || meta.meal?.start_date  || null,
      endDate:         meta.end_date      || meta.event?.end_date    || meta.meal?.end_date    || null,
      sessions:        meta.sessions      || meta.event?.sessions    || [],
      // meal
      headcount:       meta.headcount     ?? meta.participant_count  ?? null,
    }
  }

  async function fetchAll() {
    loading.value = true
    try {
      // Single source of truth: every reservation is a booking row. A customer
      // submission lands as a pending booking; workflow approval flips it to
      // confirmed. So one endpoint returns the full lifecycle.
      const res = await api.get('/web/my-bookings')
      const rows = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
      const withImages = rows.map(b => ({ ...normaliseBooking(b), roomImage: null }))

      // Active: still in flight — pending (awaiting approval), confirmed, checked_in.
      active.value = withImages.filter(b =>
        ['pending', 'confirmed', 'checked_in'].includes(b.status)
      )
      // Past: finished or closed out — checked_out, cancelled, rejected.
      past.value = withImages.filter(b =>
        ['checked_out', 'cancelled', 'rejected'].includes(b.status)
      )

      // Sort each group newest first
      const byDate = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      active.value.sort(byDate)
      past.value.sort(byDate)
    } finally {
      loading.value = false
    }
  }

  // Cancel a pending booking (only allowed while still awaiting approval).
  async function cancelRequest(id) {
    await api.patch(`/web/bookings/${id}/cancel`)
    await fetchAll()
  }

  async function create(payload) {
    let body

    if (payload.bookingType === 'corporate') {
      body = {
        client: {
          company_name:       payload.client.companyName,
          contact_person:     payload.client.contactPerson,
          email:              payload.client.email,
          phone:              payload.client.phone,
          company_reg_number: payload.client.regNumber,
          industry:           payload.client.industry || undefined,
        },
        documents: payload.documents?.length ? payload.documents : undefined,
        guests: payload.guests.map(g => ({
          full_name:  g.fullName,
          email:      g.email      || undefined,
          phone:      g.phone      || undefined,
          id_number:  g.idNumber   || undefined,
          room_id:    g.roomId     || payload.roomId,
          check_in:   g.checkIn    || payload.checkIn,
          check_out:  g.checkOut   || payload.checkOut,
        })),
      }
    } else {
      body = {
        booker_name:      `${payload.client.firstName} ${payload.client.lastName}`.trim(),
        booker_email:     payload.client.email     || undefined,
        booker_phone:     payload.client.phone     || undefined,
        room_id:          payload.roomId,
        check_in:         payload.checkIn,
        check_out:        payload.checkOut,
        special_requests: payload.specialRequests || undefined,
      }
    }

    if (!payload.roomId) throw new Error('No room selected')
    const endpoint = payload.bookingType === 'corporate' ? '/web/bookings/corporate' : '/web/bookings'
    const { data } = await api.post(endpoint, body)
    return data
  }

  return { active, past, loading, fetchAll, cancelRequest, create }
})

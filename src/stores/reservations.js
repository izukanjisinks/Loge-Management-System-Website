import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/api'

export const useReservationsStore = defineStore('reservations', () => {
  const active  = ref([])
  const past    = ref([])
  const loading = ref(false)

  // Normalise a confirmed booking row (from /web/my-bookings → bookings table)
  function normaliseBooking(b) {
    const meta = b.metadata || {}
    return {
      id:              b.id,
      recordType:      'booking',          // confirmed, post-approval
      bookingType:     b.booking_type,     // accommodation | event | meals
      bookerType:      b.booker_type,      // individual | corporate
      bookerName:      b.booker_name,
      companyName:     b.company_name     || null,
      totalAmount:     b.total_amount     ?? 0,
      status:          b.status,
      specialRequests: b.special_requests || null,
      createdAt:       b.created_at,
      metadata:        b.metadata         || {},
      // accommodation (individual)
      roomId:          meta.room_id       || null,
      roomName:        meta.room_name     || null,
      roomType:        meta.room_type     || null,
      checkIn:         meta.check_in      || null,
      checkOut:        meta.check_out     || null,
      nights:          meta.nights        ?? null,
      // accommodation (corporate) — may have assigned_rooms array
      roomCount:       meta.room_count    ?? null,
      assignedRooms:   meta.assigned_rooms || [],
      // event
      startDate:       meta.start_date    || null,
      endDate:         meta.end_date      || null,
      sessions:        meta.sessions      || [],
      // meal
      headcount:       meta.headcount     ?? null,
    }
  }

  // Normalise a pending request row (from /web/bookings → individual_booking_requests)
  function normaliseRequest(r) {
    return {
      id:          r.id,
      recordType:  'request',             // pre-approval, cancellable
      bookingType: r.booking_type || 'accommodation',
      bookerType:  'individual',
      bookerName:  r.booker_name  || null,
      companyName: null,
      totalAmount: 0,
      status:      r.status,             // pending | cancelled | rejected
      specialRequests: r.special_requests || null,
      createdAt:   r.created_at,
      // best-effort fields from request
      roomId:      r.room_id     || null,
      roomName:    r.room_name   || null,
      roomType:    r.room_type   || null,
      checkIn:     r.check_in    || null,
      checkOut:    r.check_out   || null,
      nights:      r.nights      ?? null,
      roomCount:   null,
      assignedRooms: [],
      startDate:   r.start_date  || null,
      endDate:     r.end_date    || null,
      sessions:    [],
      headcount:   r.headcount   ?? null,
    }
  }

  async function fetchAll() {
    loading.value = true
    try {
      // Fetch confirmed bookings and pending requests in parallel
      const [bookingsRes, requestsRes] = await Promise.allSettled([
        api.get('/web/my-bookings'),
        api.get('/web/bookings'),
      ])

      const bookings = bookingsRes.status === 'fulfilled'
        ? (Array.isArray(bookingsRes.value.data) ? bookingsRes.value.data : (bookingsRes.value.data?.data ?? [])).map(normaliseBooking)
        : []

      const requests = requestsRes.status === 'fulfilled'
        ? (Array.isArray(requestsRes.value.data) ? requestsRes.value.data : (requestsRes.value.data?.data ?? [])).map(normaliseRequest)
        : []

      // Only show pending requests that haven't been converted to a booking yet
      const pendingRequests = requests.filter(r => r.status === 'pending')

      const all = [...bookings, ...pendingRequests]

      // Fetch room images for individual accommodation bookings with a room ID
      const uniqueRoomIds = [...new Set(all.filter(b => b.roomId).map(b => b.roomId))]
      const roomImages = {}
      await Promise.allSettled(
        uniqueRoomIds.map(async (roomId) => {
          try {
            const { data: room } = await api.get(`/guest/rooms/${roomId}`)
            roomImages[roomId] = room.images?.[0] || null
          } catch {
            roomImages[roomId] = null
          }
        })
      )

      const withImages = all.map(b => ({ ...b, roomImage: b.roomId ? (roomImages[b.roomId] ?? null) : null }))

      // Active: pending requests + confirmed/pending/checked_in bookings
      active.value = withImages.filter(b =>
        b.recordType === 'request'
          ? b.status === 'pending'
          : ['pending', 'confirmed', 'checked_in'].includes(b.status)
      )
      // Past: checked_out or cancelled bookings (not cancelled requests — those just disappear)
      past.value = withImages.filter(b =>
        b.recordType === 'booking' && ['checked_out', 'cancelled'].includes(b.status)
      )

      // Sort each group newest first
      const byDate = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      active.value.sort(byDate)
      past.value.sort(byDate)
    } finally {
      loading.value = false
    }
  }

  // Cancel a pending booking REQUEST (pre-approval)
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

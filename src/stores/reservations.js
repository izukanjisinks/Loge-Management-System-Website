import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/api'

export const useReservationsStore = defineStore('reservations', () => {
  const active  = ref([])
  const past    = ref([])
  const loading = ref(false)

  function normalise(b) {
    return {
      id:             b.id,
      roomId:         b.room_id,
      roomName:       b.room_name,
      clientName:     b.client_name,
      mealPlanName:   b.meal_plan_name,
      checkIn:        b.check_in,
      checkOut:       b.check_out,
      guests:         b.guests,
      nights:         b.nights,
      roomCost:       b.room_cost,
      mealCost:       b.meal_cost,
      totalAmount:    b.total_amount,
      status:         b.status,
      specialRequests: b.special_requests,
      createdAt:      b.created_at,
    }
  }

  async function fetchAll() {
    loading.value = true
    try {
      const { data } = await api.get('/guest/bookings')
      const bookings = (Array.isArray(data) ? data : (data.data ?? [])).map(normalise)

      // Fetch room images in parallel — bookings list doesn't include them
      const uniqueRoomIds = [...new Set(bookings.map(b => b.roomId))]
      const roomImages = {}
      await Promise.allSettled(
        uniqueRoomIds.map(async (roomId) => {
          try {
            const { data: room } = await api.get(`/rooms/${roomId}`)
            roomImages[roomId] = room.images?.[0] || null
          } catch {
            roomImages[roomId] = null
          }
        })
      )

      const withImages = bookings.map(b => ({ ...b, roomImage: roomImages[b.roomId] ?? null }))
      active.value = withImages.filter(b => ['pending', 'confirmed', 'checked_in'].includes(b.status))
      past.value   = withImages.filter(b => ['checked_out', 'cancelled'].includes(b.status))
    } finally {
      loading.value = false
    }
  }

  async function cancel(id) {
    await api.patch(`/guest/bookings/${id}/cancel`)
    await fetchAll()
  }

  // payload shape:
  // { roomId, checkIn, checkOut, guestCount, mealPlanId, specialRequests }
  async function create(payload) {
    const body = {
      room_id:          payload.roomId,
      check_in:         new Date(payload.checkIn).toISOString(),
      check_out:        new Date(payload.checkOut).toISOString(),
      guests:           payload.guestCount,
      special_requests: payload.specialRequests || undefined,
    }
    if (payload.mealPlanId) body.meal_plan_id = payload.mealPlanId

    const { data } = await api.post('/guest/bookings', body)
    return data
  }

  return { active, past, loading, fetchAll, cancel, create }
})
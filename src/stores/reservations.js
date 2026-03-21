import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/api'

export const useReservationsStore = defineStore('reservations', () => {
  const active  = ref([])
  const past    = ref([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const { data } = await api.get('/guest/bookings')
      const bookings = Array.isArray(data) ? data : (data.data ?? [])
      active.value = bookings.filter(r => ['pending', 'confirmed', 'checked_in'].includes(r.status))
      past.value   = bookings.filter(r => ['checked_out', 'cancelled'].includes(r.status))
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
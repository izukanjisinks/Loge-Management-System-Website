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
      const { data } = await api.get('/reservations')
      active.value = data.filter(r => ['confirmed', 'pending'].includes(r.status))
      past.value   = data.filter(r => r.status === 'completed')
    } finally {
      loading.value = false
    }
  }

  async function cancel(id) {
    await api.patch(`/reservations/${id}/cancel`)
    await fetchAll()
  }

  async function create(payload) {
    const { data } = await api.post('/reservations', payload)
    await fetchAll()
    return data
  }

  return { active, past, loading, fetchAll, cancel, create }
})

import { ref, computed } from 'vue'
import api from '@/lib/api'

export function useLodges() {
  const lodges  = ref([])
  const total   = ref(0)
  const loading = ref(false)
  const error   = ref(null)

  async function fetchLodges(params = {}) {
    loading.value = true
    error.value   = null
    try {
      const { data } = await api.get('/guest/lodges', { params })
      lodges.value = data.data ?? data
      total.value  = data.total ?? lodges.value.length
    } catch {
      error.value = 'Failed to load lodges. Please try again.'
    } finally {
      loading.value = false
    }
  }

  return { lodges, total, loading, error, fetchLodges }
}

export function useRooms() {
  const rooms    = ref([])
  const total    = ref(0)
  const page     = ref(1)
  const pageSize = ref(9)
  const loading  = ref(false)
  const error    = ref(null)

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  async function fetchRooms(params = {}) {
    loading.value = true
    error.value   = null
    const merged = { page: page.value, page_size: pageSize.value, ...params }
    if (params.page)      page.value     = params.page
    if (params.page_size) pageSize.value = params.page_size
    try {
      const { data } = await api.get('/guest/rooms', { params: merged })
      rooms.value = data.data ?? data
      total.value = data.total ?? rooms.value.length
    } catch {
      error.value = 'Failed to load rooms. Please try again.'
    } finally {
      loading.value = false
    }
  }

  return { rooms, total, page, pageSize, totalPages, loading, error, fetchRooms }
}

export function useRoom() {
  const room    = ref(null)
  const loading = ref(false)
  const error   = ref(null)

  async function fetchRoom(id) {
    loading.value = true
    error.value   = null
    try {
      const { data } = await api.get(`/guest/rooms/${id}`)
      room.value = data
    } catch {
      error.value = 'Room not found.'
    } finally {
      loading.value = false
    }
  }

  return { room, loading, error, fetchRoom }
}

export function useAvailableRooms() {
  const available = ref([])
  const loading   = ref(false)
  const error     = ref(null)
  const searched  = ref(false)

  async function fetchAvailable(checkIn, checkOut, orgId) {
    loading.value = true
    error.value   = null
    searched.value = false
    try {
      const params = { check_in: checkIn, check_out: checkOut }
      if (orgId) params.org_id = orgId
      const { data } = await api.get('/guest/rooms', { params })
      available.value = Array.isArray(data) ? data : (data.data ?? [])
      searched.value  = true
    } catch {
      error.value = 'Failed to check availability. Please try again.'
    } finally {
      loading.value = false
    }
  }

  return { available, loading, error, searched, fetchAvailable }
}

// Maps a string amenity name to a Material Symbol icon
export function amenityIcon(name = '') {
  const map = {
    'wifi': 'wifi',
    'air conditioning': 'ac_unit',
    'tv': 'tv',
    'mini bar': 'local_bar',
    'jacuzzi': 'hot_tub',
    'lounge area': 'weekend',
    'pool': 'pool',
    'gym': 'fitness_center',
    'spa': 'spa',
    'parking': 'local_parking',
    'restaurant': 'restaurant',
    'room service': 'room_service',
    'laundry': 'local_laundry_service',
    'safe': 'lock',
    'balcony': 'balcony',
    'kitchen': 'kitchen',
    'fireplace': 'fireplace',
  }
  return map[name.toLowerCase()] ?? 'check_circle'
}

const FALLBACKS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
  'https://images.unsplash.com/photo-1444201983204-c43cbd584d93?w=800&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
]

export function roomImage(room, index = 0) {
  return room?.images?.[index] ?? FALLBACKS[index % FALLBACKS.length]
}

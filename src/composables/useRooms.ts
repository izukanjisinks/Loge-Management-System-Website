import { ref, computed } from 'vue'
import api, { publicApi } from '@/lib/api'
import type { Lodge, Room } from '@/types'

export function useLodges() {
  const lodges  = ref<Lodge[]>([])
  const total   = ref(0)
  const loading = ref(false)
  const error   = ref<string | null>(null)

  async function fetchLodges(params: Record<string, unknown> = {}) {
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
  const rooms    = ref<Room[]>([])
  const total    = ref(0)
  const page     = ref(1)
  const pageSize = ref(9)
  const loading  = ref(false)
  const error    = ref<string | null>(null)

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  async function fetchRooms(params: Record<string, unknown> = {}) {
    loading.value = true
    error.value   = null
    if (params.page)      page.value     = params.page as number
    if (params.page_size) pageSize.value = params.page_size as number
    try {
      const merged = { page: page.value, page_size: pageSize.value, ...params }
      const { data } = await publicApi.get('/guest/rooms', { params: merged })
      rooms.value = Array.isArray(data) ? (data as Room[]) : ((data.data ?? data) as Room[])
      total.value = Array.isArray(data) ? rooms.value.length : ((data.total as number) ?? rooms.value.length)
    } catch {
      error.value = 'Failed to load rooms. Please try again.'
    } finally {
      loading.value = false
    }
  }

  return { rooms, total, page, pageSize, totalPages, loading, error, fetchRooms }
}

export function useRoom() {
  const room    = ref<Room | null>(null)
  const loading = ref(false)
  const error   = ref<string | null>(null)

  async function fetchRoom(id: string) {
    loading.value = true
    error.value   = null
    try {
      const { data } = await api.get(`/rooms/${id}`)
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
  const available = ref<Room[]>([])
  const loading   = ref(false)
  const error     = ref<string | null>(null)
  const searched  = ref(false)

  async function fetchAvailable(checkIn: string, checkOut: string, orgId?: string) {
    loading.value  = true
    error.value    = null
    searched.value = false
    try {
      const params: Record<string, string> = { check_in: checkIn, check_out: checkOut }
      if (orgId) params.org_id = orgId
      const { data } = await publicApi.get('/guest/rooms', { params })
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

const AMENITY_ICONS: Record<string, string> = {
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

export function amenityIcon(name = ''): string {
  return AMENITY_ICONS[name.toLowerCase()] ?? 'check_circle'
}

const FALLBACKS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
  'https://images.unsplash.com/photo-1444201983204-c43cbd584d93?w=800&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
]

export function roomImage(room: Room | null | undefined, index = 0): string {
  return room?.images?.[index] ?? FALLBACKS[index % FALLBACKS.length]
}

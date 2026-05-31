import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/api'

export const useLodgesStore = defineStore('lodges', () => {
  const lodges  = ref([])
  const loading = ref(false)
  const error   = ref(null)

  async function fetchLodges() {
    if (lodges.value.length) return  // already loaded
    loading.value = true
    error.value   = null
    try {
      const { data } = await api.get('/guest/lodges', { params: { page: 1, page_size: 100 } })
      const raw = data.data ?? data
      lodges.value = raw.map(l => ({
        id:       l.id,
        name:     l.name,
        logoUrl:  l.logo_url     || null,
        address:  l.street_address || null,
        email:    l.email        || null,
        phone:    l.phone        || null,
        branches: (l.branches ?? []).map(b => ({
          id:         b.id,
          name:       b.name,
          restaurant: b.restaurant  ?? true,
          conference: b.conference_room ?? b.conference ?? true,
          parking:    b.parking     ?? true,
        })),
      }))
    } catch {
      error.value = 'Failed to load lodges.'
    } finally {
      loading.value = false
    }
  }

  function branchesFor(lodgeId) {
    return lodges.value.find(l => String(l.id) === String(lodgeId))?.branches ?? []
  }

  async function fetchLodgeDetail(lodgeId) {
    try {
      const { data } = await api.get(`/guest/lodges/${lodgeId}`)
      const payload = data.data ?? data
      const lodge = lodges.value.find(l => String(l.id) === String(lodgeId))
      if (lodge) {
        const rawBranches = payload.branches ?? data.branches ?? []
        lodge.branches = rawBranches.map(b => ({
          id:         b.id,
          name:       b.name,
          restaurant: b.restaurant      ?? true,
          conference: b.conference_room ?? b.conference ?? true,
          parking:    b.parking         ?? true,
        }))
      }
    } catch {
      // silently ignore — branch selector just won't appear
    }
  }

  return { lodges, loading, error, fetchLodges, branchesFor, fetchLodgeDetail }
})

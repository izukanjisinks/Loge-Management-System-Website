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
      lodges.value = (data.data ?? data).map(l => ({
        id:       l.id,
        name:     l.name,
        logoUrl:  l.logo_url     || null,
        address:  l.street_address || null,
        email:    l.email        || null,
        phone:    l.phone        || null,
        branches: (l.branches ?? []).map(b => ({
          id:   b.id,
          name: b.name,
        })),
      }))
    } catch {
      error.value = 'Failed to load lodges.'
    } finally {
      loading.value = false
    }
  }

  function branchesFor(lodgeId) {
    return lodges.value.find(l => l.id === lodgeId)?.branches ?? []
  }

  return { lodges, loading, error, fetchLodges, branchesFor }
})

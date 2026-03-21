import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/lib/api'

export const useMealPlansStore = defineStore('mealPlans', () => {
  const plans   = ref([])
  const loading = ref(false)

  async function fetchAll() {
    if (plans.value.length) return   // already loaded
    loading.value = true
    try {
      const { data } = await api.get('/meal-plans', { params: { is_active: true, page_size: 100 } })
      plans.value = data.data ?? data
    } finally {
      loading.value = false
    }
  }

  return { plans, loading, fetchAll }
})
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMealPlansStore = defineStore('mealPlans', () => {
  const plans   = ref([])
  const loading = ref(false)

  async function fetchAll() {
    // meal plans endpoint not yet available
  }

  return { plans, loading, fetchAll }
})
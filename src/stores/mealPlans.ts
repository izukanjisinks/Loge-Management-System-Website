import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MealPlan } from '@/types'

export const useMealPlansStore = defineStore('mealPlans', () => {
  const plans   = ref<MealPlan[]>([])
  const loading = ref(false)

  async function fetchAll() {
    // meal plans endpoint not yet available
  }

  return { plans, loading, fetchAll }
})

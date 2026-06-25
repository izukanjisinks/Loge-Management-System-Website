import { defineStore } from 'pinia'
import { ref } from 'vue'

// Holds prefill data for a single "book again" navigation.
// The booking view drains it on mount — it self-clears after use.
export const useRebookStore = defineStore('rebook', () => {
  const draft = ref(null)

  // Set from BookingDetailView before navigating to the booking flow
  function set(data) {
    draft.value = data
  }

  // Called by booking views on mount — returns the draft and clears it
  function drain() {
    const d = draft.value
    draft.value = null
    return d
  }

  return { draft, set, drain }
})

import { onMounted, onUnmounted } from 'vue'

/**
 * Calls `handler` when a click occurs outside `targetRef`.
 * @param {Ref<HTMLElement>} targetRef
 * @param {Function} handler
 */
export function useClickOutside(targetRef, handler) {
  function onClick(e) {
    if (targetRef.value && !targetRef.value.contains(e.target)) {
      handler()
    }
  }
  onMounted(() => document.addEventListener('mousedown', onClick))
  onUnmounted(() => document.removeEventListener('mousedown', onClick))
}

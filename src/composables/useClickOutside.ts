import { type Ref, onMounted, onUnmounted } from 'vue'

export function useClickOutside(targetRef: Ref<HTMLElement | null>, handler: () => void) {
  function onClick(e: MouseEvent) {
    if (targetRef.value && !targetRef.value.contains(e.target as Node)) {
      handler()
    }
  }
  onMounted(() => document.addEventListener('mousedown', onClick))
  onUnmounted(() => document.removeEventListener('mousedown', onClick))
}

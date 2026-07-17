<script setup>
import { RouterLink } from 'vue-router'
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    // 'primary' | 'secondary' | 'ghost'
  },
  as: {
    type: [String, Object],
    default: 'button',
  },
  to: {
    type: [String, Object],
    default: null,
  },
})

const tag = computed(() => {
  if (props.to) return RouterLink
  return props.as
})
</script>

<template>
  <component
    :is="tag"
    :to="to ?? undefined"
    class="inline-flex items-center justify-center gap-2 font-sans font-semibold cursor-pointer select-none
           transition-all duration-200 focus-visible:outline-none focus-visible:ring-2
           focus-visible:ring-(--color-primary) focus-visible:ring-offset-2"
    :class="{
      'bg-(--color-primary) text-white px-6 py-2.5 rounded-2xl text-sm font-semibold tracking-[0.05em] hover:bg-(--color-primary-container) active:scale-[0.98]':
        variant === 'primary',
      'border-2 border-(--color-primary) text-(--color-primary) px-6 py-2.5 rounded-2xl text-sm font-semibold tracking-[0.05em] bg-transparent hover:bg-(--color-primary) hover:text-white active:scale-[0.98]':
        variant === 'secondary',
      'text-(--color-primary) px-4 py-2 text-sm hover:underline':
        variant === 'ghost',
    }"
  >
    <slot />
  </component>
</template>

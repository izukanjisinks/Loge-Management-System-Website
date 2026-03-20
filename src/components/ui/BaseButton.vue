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

// When `to` is provided, always render as RouterLink regardless of `as`
const tag = computed(() => {
  if (props.to) return RouterLink
  return props.as
})
</script>

<template>
  <component
    :is="tag"
    :to="to ?? undefined"
    class="inline-flex items-center justify-center gap-2 font-sans font-semibold
           transition-transform duration-300 cursor-pointer select-none
           rounded focus-visible:outline-none focus-visible:ring-2
           focus-visible:ring-[--color-primary] focus-visible:ring-offset-2"
    :class="{
      // Primary — terracotta gradient
      'bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-light))] text-white px-6 py-3 text-sm tracking-wide hover:scale-[1.02] active:scale-[0.99]':
        variant === 'primary',

      // Secondary — ghost with outline
      'border border-[oklch(0.55_0.12_45/0.25)] text-[--color-primary] px-6 py-3 text-sm tracking-wide bg-transparent hover:bg-[oklch(0.55_0.12_45/0.06)] hover:scale-[1.02]':
        variant === 'secondary',

      // Ghost — text only, minimal
      'text-[--color-on-muted] px-4 py-2 text-sm hover:text-[--color-on-surface]':
        variant === 'ghost',
    }"
  >
    <slot />
  </component>
</template>

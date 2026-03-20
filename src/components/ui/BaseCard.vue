<script setup>
defineProps({
  hover: { type: Boolean, default: false },
})
</script>

<template>
  <div
    class="bg-[--color-surface-card] rounded-lg"
    :class="hover && 'transition-transform duration-700 ease-out hover:scale-[1.01] cursor-pointer shadow-[var(--shadow-card)]'"
    style="box-shadow: var(--shadow-card);"
  >
    <slot />
  </div>
</template>

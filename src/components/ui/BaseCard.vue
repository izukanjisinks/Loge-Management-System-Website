<script setup>
defineProps({
  hover: { type: Boolean, default: false },
})
</script>

<template>
  <div
    class="bg-(--color-surface-container-lowest) rounded-xl border border-(--color-savannah-mist)"
    :class="hover && 'group cursor-pointer transition-shadow duration-300 hover:shadow-lg shadow-sm'"
  >
    <slot />
  </div>
</template>

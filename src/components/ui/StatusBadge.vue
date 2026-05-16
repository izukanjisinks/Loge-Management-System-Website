<script setup>
defineProps({
  status: {
    type: String,
    required: true,
    // 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'checked_in' | 'checked_out'
  },
})

const config = {
  confirmed:   { label: 'Confirmed',   classes: 'bg-(--color-tertiary-fixed) text-(--color-tertiary)' },
  pending:     { label: 'Pending',     classes: 'bg-(--color-secondary-container) text-(--color-on-secondary-container)' },
  completed:   { label: 'Completed',   classes: 'bg-(--color-surface-container-high) text-(--color-on-surface-variant)' },
  cancelled:   { label: 'Cancelled',   classes: 'bg-(--color-error-container) text-(--color-on-error-container)' },
  checked_in:  { label: 'Checked In',  classes: 'bg-(--color-primary-fixed) text-(--color-on-primary-fixed-variant)' },
  checked_out: { label: 'Checked Out', classes: 'bg-(--color-surface-container-high) text-(--color-on-surface-variant)' },
}
</script>

<template>
  <span
    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold font-sans tracking-wide"
    :class="config[status]?.classes ?? config.pending.classes"
  >
    {{ config[status]?.label ?? status }}
  </span>
</template>

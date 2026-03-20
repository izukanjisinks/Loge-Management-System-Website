<script setup>
defineProps({
  status: {
    type: String,
    required: true,
    // 'confirmed' | 'pending' | 'completed' | 'cancelled'
  },
})

const config = {
  confirmed:  { label: 'Confirmed',  classes: 'bg-[--color-accent-light] text-[--color-accent]' },
  pending:    { label: 'Pending',    classes: 'bg-[oklch(0.95_0.06_80)] text-[oklch(0.50_0.10_70)]' },
  completed:  { label: 'Completed',  classes: 'bg-[--color-secondary-dim] text-[--color-on-muted]' },
  cancelled:  { label: 'Cancelled',  classes: 'bg-[oklch(0.95_0.02_25)] text-[--color-error]' },
}
</script>

<template>
  <span
    class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold font-sans tracking-wide"
    :class="config[status]?.classes ?? config.pending.classes"
  >
    {{ config[status]?.label ?? status }}
  </span>
</template>

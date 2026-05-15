<script lang="ts" setup>
import type { CalendarCellTriggerProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { CalendarCellTrigger, useForwardProps } from "reka-ui"
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<CalendarCellTriggerProps & { class?: HTMLAttributes["class"] }>(), {
  as: "button",
})

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CalendarCellTrigger
    data-slot="calendar-cell-trigger"
    :class="cn('cal-trigger', props.class)"
    v-bind="forwardedProps"
  >
    <slot />
  </CalendarCellTrigger>
</template>

<style>
.cal-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 0.875rem;
  width: 2rem;
  height: 2rem;
  padding: 0;
  font-weight: 400;
  cursor: default;
  transition: background-color 0.15s, color 0.15s;
  color: var(--color-on-surface);
}
.cal-trigger:hover {
  background-color: var(--color-secondary);
}
.cal-trigger:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.cal-trigger[data-today]:not([data-selected]) {
  background-color: var(--color-secondary);
  font-weight: 600;
}
.cal-trigger[data-selected] {
  background-color: var(--color-primary);
  color: white;
  opacity: 1;
}
.cal-trigger[data-disabled] {
  color: var(--color-on-muted);
  opacity: 0.5;
  pointer-events: none;
}
.cal-trigger[data-unavailable] {
  color: var(--color-error);
  text-decoration: line-through;
}
.cal-trigger[data-outside-view] {
  color: var(--color-on-muted);
  opacity: 0.4;
}
</style>

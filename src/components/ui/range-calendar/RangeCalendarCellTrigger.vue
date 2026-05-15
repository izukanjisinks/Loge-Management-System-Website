<script lang="ts" setup>
import type { RangeCalendarCellTriggerProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { RangeCalendarCellTrigger, useForwardProps } from "reka-ui"
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<RangeCalendarCellTriggerProps & { class?: HTMLAttributes["class"] }>(), {
  as: "button",
})

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RangeCalendarCellTrigger
    data-slot="range-calendar-trigger"
    :class="cn('rcal-trigger', props.class)"
    v-bind="forwardedProps"
  >
    <slot />
  </RangeCalendarCellTrigger>
</template>

<style>
.rcal-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 0.875rem;
  height: 2rem;
  width: 2rem;
  padding: 0;
  font-weight: 400;
  cursor: default;
  transition: background-color 0.15s, color 0.15s;
  color: var(--color-on-surface);
}
.rcal-trigger:hover {
  background-color: var(--color-secondary);
}
.rcal-trigger:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.rcal-trigger[data-today]:not([data-selected]) {
  background-color: var(--color-secondary);
  font-weight: 600;
}
.rcal-trigger[data-selected] {
  opacity: 1;
}
.rcal-trigger[data-selection-start],
.rcal-trigger[data-selection-end] {
  background-color: var(--color-primary);
  color: white;
}
.rcal-trigger[data-selection-start] {
  border-radius: 6px 0 0 6px;
}
.rcal-trigger[data-selection-end] {
  border-radius: 0 6px 6px 0;
}
.rcal-trigger[data-selection-start][data-selection-end] {
  border-radius: 6px;
}
.rcal-trigger[data-outside-view] {
  opacity: 0.3;
}
.rcal-trigger[data-disabled] {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}
.rcal-trigger[data-unavailable] {
  text-decoration: line-through;
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
  color: var(--color-error);
}
</style>

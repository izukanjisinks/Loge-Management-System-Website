<script lang="ts" setup>
import type { RangeCalendarCellProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { RangeCalendarCell, useForwardProps } from "reka-ui"
import { cn } from '@/lib/utils'

const props = defineProps<RangeCalendarCellProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RangeCalendarCell
    data-slot="range-calendar-cell"
    :class="cn('rcal-cell', props.class)"
    v-bind="forwardedProps"
  >
    <slot />
  </RangeCalendarCell>
</template>

<style>
.rcal-cell {
  position: relative;
  padding: 0;
  text-align: center;
  font-size: 0.875rem;
}
.rcal-cell:has([data-selected]) {
  background-color: color-mix(in oklab, var(--color-primary) 12%, transparent);
}
.rcal-cell:first-child:has([data-selected]),
.rcal-cell:has([data-selected][data-selection-start]) {
  border-radius: 6px 0 0 6px;
}
.rcal-cell:last-child:has([data-selected]),
.rcal-cell:has([data-selected][data-selection-end]) {
  border-radius: 0 6px 6px 0;
}
.rcal-cell:has([data-selected][data-selection-start][data-selection-end]) {
  border-radius: 6px;
}
</style>

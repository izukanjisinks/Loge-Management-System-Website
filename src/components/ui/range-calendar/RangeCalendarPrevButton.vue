<script lang="ts" setup>
import type { RangeCalendarPrevProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { RangeCalendarPrev, useForwardProps } from "reka-ui"
import { cn } from '@/lib/utils'

const props = defineProps<RangeCalendarPrevProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RangeCalendarPrev
    data-slot="range-calendar-prev-button"
    :class="cn('cal-nav-btn shrink-0', props.class)"
    v-bind="forwardedProps"
  >
    <slot>
      <span class="material-symbols-outlined text-base">chevron_left</span>
    </slot>
  </RangeCalendarPrev>
</template>

<style>
.cal-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid var(--color-outline);
  background: transparent;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  opacity: 0.5;
  transition: opacity 0.15s, background-color 0.15s;
  cursor: pointer;
}
.cal-nav-btn:hover {
  opacity: 1;
  background-color: var(--color-secondary);
}
.cal-nav-btn:focus-visible { outline: none; }
</style>

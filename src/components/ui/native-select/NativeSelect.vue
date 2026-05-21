<script setup lang="ts">
import type { AcceptableValue } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit, useVModel } from "@vueuse/core"
import { cn } from '@/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{ modelValue?: AcceptableValue | AcceptableValue[], class?: HTMLAttributes["class"] }>()

const emit = defineEmits<{
  "update:modelValue": AcceptableValue
}>()

const modelValue = useVModel(props, "modelValue", emit, {
  passive: true,
  defaultValue: "",
})

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <div
    class="group/native-select relative w-fit has-[select:disabled]:opacity-50"
    data-slot="native-select-wrapper"
  >
    <select
      v-bind="{ ...$attrs, ...delegatedProps }"
      v-model="modelValue"
      data-slot="native-select"
      :class="cn(
        'border-(--color-outline) placeholder:text-(--color-on-muted) selection:bg-(--color-primary) selection:text-white h-9 w-full min-w-0 appearance-none rounded-md border bg-(--color-surface-card) px-3 py-2 pr-9 text-sm transition-[color,box-shadow] outline-none text-(--color-on-surface) disabled:pointer-events-none disabled:cursor-not-allowed',
        'focus-visible:border-(--color-primary) focus-visible:ring-2 focus-visible:ring-(--color-primary)/30',
        props.class,
      )"
    >
      <slot />
    </select>
    <span
      class="material-symbols-outlined text-(--color-on-muted) pointer-events-none absolute top-[50%] right-3.5 text-base -translate-y-1/2 opacity-50 select-none"
      aria-hidden="true"
      data-slot="native-select-icon"
    >expand_more</span>
  </div>
</template>

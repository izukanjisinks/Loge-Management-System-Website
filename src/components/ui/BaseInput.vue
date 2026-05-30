<script setup lang="ts">
defineProps({
  label:       { type: String,  default: '' },
  placeholder: { type: String,  default: '' },
  type:        { type: String,  default: 'text' },
  modelValue:  { type: String,  default: '' },
  required:    { type: Boolean, default: false },
  error:       { type: String,  default: '' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex flex-col gap-2">
    <label
      v-if="label"
      class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)"
    >
      {{ label }}<span v-if="required" class="text-(--color-error) ml-0.5">*</span>
    </label>

    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3
             font-sans text-sm text-(--color-on-surface)
             placeholder:text-(--color-on-surface-variant)
             focus:outline-none focus:ring-2 focus:ring-(--color-primary)
             transition-all duration-200"
      @input="$emit('update:modelValue', $event.target.value)"
    />

    <span v-if="error" class="font-sans text-xs text-(--color-error) mt-0.5">{{ error }}</span>
  </div>
</template>

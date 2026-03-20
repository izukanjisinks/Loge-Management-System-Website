<script setup>
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
  <div class="flex flex-col gap-1">
    <label
      v-if="label"
      class="font-sans text-xs font-semibold tracking-widest uppercase text-[--color-on-muted]"
    >
      {{ label }}<span v-if="required" class="text-[--color-error] ml-0.5">*</span>
    </label>

    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      class="w-full bg-transparent border-0 border-b border-[--color-outline]
             py-2.5 font-sans text-sm text-[--color-on-surface]
             placeholder:text-[--color-on-muted]
             focus:outline-none focus:border-[--color-primary]
             transition-colors duration-200"
      @input="$emit('update:modelValue', $event.target.value)"
    />

    <span v-if="error" class="font-sans text-xs text-[--color-error] mt-0.5">{{ error }}</span>
  </div>
</template>

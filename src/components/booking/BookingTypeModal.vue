<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  context: {
    type: Object,
    default: () => ({ itemType: 'room', name: '', lodgeName: '' }),
  },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const selectedType = ref('individual')

function close() { emit('update:modelValue', false) }
function confirm() { emit('confirm', selectedType.value); close() }
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close" />

        <!-- Panel -->
        <div class="relative bg-(--color-surface) rounded-2xl shadow-2xl w-full max-w-md">

          <!-- Header -->
          <div class="px-8 pt-8 pb-6 border-b border-(--color-outline-variant)">
            <button type="button"
              class="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full hover:bg-(--color-surface-container) text-(--color-on-surface-variant) transition-colors"
              @click="close">
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
            <h2 class="font-serif text-2xl text-(--color-on-surface) pr-10">Start Your Booking</h2>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1.5 leading-relaxed">
              <span class="font-semibold text-(--color-on-surface)">{{ context.name }}</span>
              <template v-if="context.lodgeName"> &mdash; {{ context.lodgeName }}</template>
            </p>
          </div>

          <!-- Options -->
          <div class="px-8 py-6 space-y-3">
            <label v-for="opt in [
              {
                value: 'individual',
                icon: 'person',
                label: 'Individual Booking',
                description: 'For personal travel, leisure stays, event attendance, and independent guests.',
              },
              {
                value: 'corporate',
                icon: 'corporate_fare',
                label: 'Corporate Booking',
                description: 'For companies, conference groups, training workshops, and organisational events.',
              },
            ]" :key="opt.value"
              class="flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all select-none"
              :class="selectedType === opt.value
                ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                : 'border-(--color-outline-variant) hover:border-(--color-outline)'"
              @click="selectedType = opt.value"
            >
              <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                :class="selectedType === opt.value
                  ? 'bg-(--color-primary) text-white'
                  : 'bg-(--color-surface-container) text-(--color-on-surface-variant)'">
                <span class="material-symbols-outlined text-xl">{{ opt.icon }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ opt.label }}</p>
                <p class="font-sans text-xs text-(--color-on-surface-variant) mt-1 leading-relaxed">{{ opt.description }}</p>
              </div>
              <span class="material-symbols-outlined text-lg shrink-0 mt-1 transition-colors"
                :class="selectedType === opt.value ? 'text-(--color-primary)' : 'text-(--color-outline)'"
                style="font-variation-settings: 'FILL' 1">
                {{ selectedType === opt.value ? 'radio_button_checked' : 'radio_button_unchecked' }}
              </span>
            </label>
          </div>

          <!-- Actions -->
          <div class="px-8 pb-8 flex gap-3">
            <button type="button"
              class="flex-1 py-3 rounded-xl border border-(--color-outline-variant) font-sans text-sm font-semibold text-(--color-on-surface-variant) hover:bg-(--color-surface-container) transition-colors"
              @click="close">
              Cancel
            </button>
            <button type="button"
              class="flex-1 py-3 rounded-xl bg-(--color-primary) text-white font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors flex items-center justify-center gap-2"
              @click="confirm">
              Continue
              <span class="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

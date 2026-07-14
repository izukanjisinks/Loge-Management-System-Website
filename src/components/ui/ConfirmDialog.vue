<script setup>
defineProps({
  open:         { type: Boolean, required: true },
  title:        { type: String,  required: true },
  message:      { type: String,  required: true },
  confirmLabel: { type: String,  default: 'Confirm' },
  cancelLabel:  { type: String,  default: 'Cancel' },
  icon:         { type: String,  default: 'help' },
})
defineEmits(['confirm', 'cancel'])
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">

        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('cancel')" />

        <!-- Card -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4 sm:translate-y-0"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4 sm:translate-y-0">
          <div v-if="open"
            class="relative z-10 bg-(--color-surface) rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-(--color-outline-variant)">

            <!-- Icon -->
            <div class="w-11 h-11 rounded-full bg-(--color-savannah-mist) flex items-center justify-center mb-4">
              <span class="material-symbols-outlined text-xl text-(--color-primary)" style="font-variation-settings: 'FILL' 1">
                {{ icon }}
              </span>
            </div>

            <h3 class="font-serif text-xl text-(--color-on-surface) mb-2">{{ title }}</h3>
            <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed mb-6">{{ message }}</p>

            <div class="flex gap-3">
              <button type="button" @click="$emit('cancel')"
                class="flex-1 py-3 rounded-full border border-(--color-outline-variant) font-sans text-sm font-semibold text-(--color-on-surface-variant) hover:bg-(--color-surface-container) transition-colors">
                {{ cancelLabel }}
              </button>
              <button type="button" @click="$emit('confirm')"
                class="flex-1 py-3 rounded-full bg-(--color-primary) text-white font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors">
                {{ confirmLabel }}
              </button>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

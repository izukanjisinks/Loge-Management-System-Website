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

const selectedService = ref('accommodation')

function close() { emit('update:modelValue', false) }
function confirm() { emit('confirm', selectedService.value); close() }
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
            <h2 class="font-serif text-2xl text-(--color-on-surface) pr-10">What would you like to book?</h2>
            <p v-if="context.name" class="font-sans text-sm text-(--color-on-surface-variant) mt-1.5 leading-relaxed">
              <span class="font-semibold text-(--color-on-surface)">{{ context.name }}</span>
              <template v-if="context.lodgeName"> &mdash; {{ context.lodgeName }}</template>
            </p>
          </div>

          <!-- Options -->
          <div class="px-8 py-6 space-y-3">

            <!-- Accommodation (active) -->
            <label
              class="flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all select-none"
              :class="selectedService === 'accommodation'
                ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                : 'border-(--color-outline-variant) hover:border-(--color-outline)'"
              @click="selectedService = 'accommodation'"
            >
              <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                :class="selectedService === 'accommodation'
                  ? 'bg-(--color-primary) text-white'
                  : 'bg-(--color-surface-container) text-(--color-on-surface-variant)'">
                <span class="material-symbols-outlined text-xl">bed</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Accommodation</p>
                <p class="font-sans text-xs text-(--color-on-surface-variant) mt-1 leading-relaxed">Book rooms for individual stays, family trips, group accommodation, or corporate delegates.</p>
              </div>
              <span class="material-symbols-outlined text-lg shrink-0 mt-1 transition-colors"
                :class="selectedService === 'accommodation' ? 'text-(--color-primary)' : 'text-(--color-outline)'"
                style="font-variation-settings: 'FILL' 1">
                {{ selectedService === 'accommodation' ? 'radio_button_checked' : 'radio_button_unchecked' }}
              </span>
            </label>

            <!-- Event Booking (active) -->
            <label
              class="flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all select-none"
              :class="selectedService === 'event'
                ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                : 'border-(--color-outline-variant) hover:border-(--color-outline)'"
              @click="selectedService = 'event'"
            >
              <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                :class="selectedService === 'event'
                  ? 'bg-(--color-primary) text-white'
                  : 'bg-(--color-surface-container) text-(--color-on-surface-variant)'">
                <span class="material-symbols-outlined text-xl">event</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Event Booking</p>
                <p class="font-sans text-xs text-(--color-on-surface-variant) mt-1 leading-relaxed">Conferences, workshops, training sessions, meetings, and venue hire.</p>
              </div>
              <span class="material-symbols-outlined text-lg shrink-0 mt-1 transition-colors"
                :class="selectedService === 'event' ? 'text-(--color-primary)' : 'text-(--color-outline)'"
                style="font-variation-settings: 'FILL' 1">
                {{ selectedService === 'event' ? 'radio_button_checked' : 'radio_button_unchecked' }}
              </span>
            </label>

            <!-- Meal Booking (active) -->
            <label
              class="flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all select-none"
              :class="selectedService === 'meal'
                ? 'border-(--color-primary) bg-(--color-savannah-mist)'
                : 'border-(--color-outline-variant) hover:border-(--color-outline)'"
              @click="selectedService = 'meal'"
            >
              <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                :class="selectedService === 'meal'
                  ? 'bg-(--color-primary) text-white'
                  : 'bg-(--color-surface-container) text-(--color-on-surface-variant)'">
                <span class="material-symbols-outlined text-xl">restaurant</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-sans text-sm font-semibold text-(--color-on-surface)">Meal Booking</p>
                <p class="font-sans text-xs text-(--color-on-surface-variant) mt-1 leading-relaxed">Catering, group meals, banquets, and standalone dining reservations.</p>
              </div>
              <span class="material-symbols-outlined text-lg shrink-0 mt-1 transition-colors"
                :class="selectedService === 'meal' ? 'text-(--color-primary)' : 'text-(--color-outline)'"
                style="font-variation-settings: 'FILL' 1">
                {{ selectedService === 'meal' ? 'radio_button_checked' : 'radio_button_unchecked' }}
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

<script setup>
import { ref } from 'vue'

const email     = ref('')
const submitted = ref(false)

function submit() {
  if (!email.value) return
  submitted.value = true
  email.value     = ''
}
</script>

<template>
  <section class="py-24 px-5 md:px-16 max-w-[1280px] mx-auto text-center">
    <div class="max-w-2xl mx-auto reveal">
      <span class="text-(--color-primary) font-sans text-sm font-semibold tracking-widest uppercase mb-2 block">
        Join the Circle
      </span>
      <h2 class="font-serif text-[32px] font-semibold leading-10 text-(--color-on-surface) mb-4">
        Travel with Intention.
      </h2>
      <p class="font-sans text-base text-(--color-on-surface-variant) mb-10 leading-relaxed">
        Subscribe to our monthly journal for exclusive early access to new collection openings and curated travel insights.
      </p>

      <Transition
        enter-active-class="transition duration-300"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
      >
        <p v-if="submitted" class="font-sans text-sm text-(--color-tertiary) font-medium">
          <span class="material-symbols-outlined text-base align-middle mr-1" style="font-variation-settings: 'FILL' 1">check_circle</span>
          You're on the list. Welcome to the circle.
        </p>
      </Transition>

      <form
        v-if="!submitted"
        class="flex flex-col md:flex-row gap-3 max-w-lg mx-auto"
        @submit.prevent="submit"
      >
        <input
          v-model="email"
          type="email"
          placeholder="Your email address"
          required
          class="grow bg-(--color-savannah-mist) border-none rounded-lg px-4 py-3
                 font-sans text-sm text-(--color-on-surface)
                 placeholder:text-(--color-on-surface-variant)
                 focus:outline-none focus:ring-2 focus:ring-(--color-primary)
                 transition-all"
        />
        <button
          type="submit"
          class="bg-(--color-primary) text-white px-8 py-3 rounded-2xl
                 font-sans font-semibold text-sm tracking-[0.05em]
                 hover:bg-(--color-primary-container) transition-colors duration-200"
        >
          Subscribe
        </button>
      </form>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const email     = ref('')
const submitted = ref(false)

function submit() {
  if (!email.value) return
  // TODO: wire to API in Phase 8
  submitted.value = true
  email.value     = ''
}
</script>

<template>
  <section class="max-w-7xl mx-auto px-6 md:px-16 py-32 text-center">
    <div class="max-w-2xl mx-auto reveal">
      <span class="font-sans text-[10px] uppercase tracking-[0.3em] font-bold text-[--color-primary] mb-6 block">
        Join the Circle
      </span>
      <h2 class="font-serif text-4xl md:text-5xl text-[--color-on-surface] mb-6">
        Travel with <em>Intention.</em>
      </h2>
      <p class="font-sans text-[--color-on-muted] mb-10 leading-relaxed">
        Subscribe to our monthly journal for exclusive early access to new collection openings and curated travel insights.
      </p>

      <Transition
        enter-active-class="transition duration-300"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
      >
        <p v-if="submitted" class="font-sans text-sm text-[--color-accent] font-medium">
          <span class="material-symbols-outlined text-base align-middle mr-1" style="font-variation-settings: 'FILL' 1">check_circle</span>
          You're on the list. Welcome to the circle.
        </p>
      </Transition>

      <form
        v-if="!submitted"
        class="flex flex-col md:flex-row gap-4 max-w-lg mx-auto"
        @submit.prevent="submit"
      >
        <input
          v-model="email"
          type="email"
          placeholder="Your email address"
          required
          class="flex-grow bg-transparent border-0 border-b border-[--color-outline]/40
                 focus:ring-0 focus:border-[--color-primary] focus:outline-none
                 px-0 py-3 font-sans text-sm text-[--color-on-surface]
                 placeholder:text-[--color-on-muted] transition-colors"
        />
        <button
          type="submit"
          class="bg-[--color-on-surface] text-[--color-secondary] px-8 py-3 rounded-lg
                 font-sans font-bold text-sm tracking-wide
                 hover:bg-[--color-primary] hover:text-white transition-colors duration-300"
        >
          Subscribe
        </button>
      </form>
    </div>
  </section>
</template>

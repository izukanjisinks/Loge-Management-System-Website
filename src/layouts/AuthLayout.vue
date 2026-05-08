<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="min-h-screen grid grid-cols-1 lg:grid-cols-2">

    <!-- Left panel — form -->
    <div class="flex flex-col bg-[--color-secondary]">
      <!-- Mobile logo -->
      <header class="lg:hidden px-8 pt-8 pb-4">
        <RouterLink to="/" class="font-serif italic text-xl text-[--color-on-surface]">
          Mwakanda
        </RouterLink>
      </header>

      <main class="flex-1 flex items-center justify-center px-6 py-12">
        <div class="w-full max-w-md">
          <RouterView />
        </div>
      </main>

      <footer class="px-8 py-6 text-center font-sans text-xs text-[--color-on-muted]">
        © {{ new Date().getFullYear() }} Mwakanda ·
        <RouterLink to="/" class="hover:text-[--color-on-surface] transition-colors ml-1">Back to home</RouterLink>
      </footer>
    </div>

    <!-- Right panel — decorative image (hidden on mobile) -->
    <div class="hidden lg:block relative overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80"
        alt="Forest path at dawn"
        class="absolute inset-0 w-full h-full object-cover"
      />
      <!-- Overlay -->
      <div class="absolute inset-0 bg-linear-to-bl from-[oklch(0.12_0.02_45/0.70)] to-[oklch(0.25_0.06_145/0.50)]" />

      <!-- Brand mark -->
      <div class="relative z-10 p-12 flex flex-col justify-between h-full">
        <RouterLink to="/" class="font-serif italic text-2xl text-white tracking-tight">
          Mwakanda
        </RouterLink>
        <blockquote class="max-w-xs">
          <p class="font-serif text-xl text-white/90 leading-relaxed italic mb-4">
            "The clearest way into the Universe is through a forest wilderness."
          </p>
          <cite class="font-sans text-xs text-white/60 tracking-widest uppercase not-italic">
            — John Muir
          </cite>
        </blockquote>
      </div>
    </div>

  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-(--color-background)">

    <!-- Left: Form panel -->
    <div class="flex flex-col bg-(--color-surface)">
      <!-- Mobile logo -->
      <header class="lg:hidden px-8 pt-8 pb-4">
        <RouterLink to="/" class="flex items-center gap-2">
          <img src="/mwakwanda_favicon.svg" alt="Mwakwanda logo" class="h-8 w-8" />
          <span class="font-serif text-2xl font-bold text-(--color-primary) tracking-tight">Mwakwanda</span>
        </RouterLink>
      </header>

      <main class="flex-1 flex items-center justify-center px-5 py-12">
        <div class="w-full max-w-md">
          <RouterView />
        </div>
      </main>

      <footer
        class="px-8 py-6 text-center font-sans text-xs text-(--color-on-surface-variant) border-t border-(--color-outline-variant)">
        Copyright © {{ new Date().getFullYear() }} Mwakwanda Hospitality Group
        <!-- <RouterLink to="/" class="hover:text-(--color-primary) transition-colors ml-1">Back to home</RouterLink> -->
      </footer>
    </div>

    <!-- Right: Decorative image (desktop only) -->
    <div class="hidden lg:block relative overflow-hidden">
      <img src="https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&q=80"
        alt="Luxury African landscape at dusk" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />

      <div class="relative z-10 p-12 flex flex-col justify-between h-full">
        <RouterLink to="/" class="flex items-center gap-2">
          <img src="/mwakwanda_favicon.svg" alt="Mwakwanda logo" class="h-8 w-8 brightness-0 invert" />
          <span class="font-serif text-2xl font-bold text-white tracking-tight">Mwakwanda</span>
        </RouterLink>
        <blockquote class="max-w-xs">
          <!-- <p class="font-serif text-xl text-white/90 leading-relaxed italic mb-4">
            "An unrivaled arrival into the soul of the continent."
          </p> -->
          <cite class="font-sans text-xs text-white/60 tracking-widest uppercase not-italic">
            Simplifying Hospitality
          </cite>
        </blockquote>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth     = useAuthStore()
const router   = useRouter()
const menuOpen = ref(false)

function handleLogout() {
  if (!confirm('Are you sure you want to sign out?')) return
  auth.logout()
  router.push({ name: 'home' })
}
</script>

<template>
  <header class="sticky top-0 z-100 w-full bg-(--color-surface) shadow-sm">
    <nav class="flex justify-between items-center w-full px-5 md:px-16 py-4 max-w-[1280px] mx-auto">

      <!-- Logo -->
      <RouterLink to="/" class="flex items-center gap-2">
        <img src="/mwakwanda_favicon.svg" alt="Mwakwanda logo" class="h-8 w-8" />
        <span class="font-serif text-2xl font-bold text-(--color-primary) tracking-tight">Mwakwanda</span>
      </RouterLink>

      <!-- Desktop nav links -->
      <div class="hidden md:flex gap-6 items-center">
        <RouterLink
          to="/explore"
          class="text-(--color-on-surface-variant) font-medium hover:text-(--color-primary) transition-colors duration-200 text-sm font-sans tracking-[0.05em]"
          active-class="!text-(--color-primary) border-b-2 border-(--color-primary) font-bold pb-1"
        >
          Explore
        </RouterLink>
        <RouterLink
          to="/bookings"
          class="text-(--color-on-surface-variant) font-medium hover:text-(--color-primary) transition-colors duration-200 text-sm font-sans tracking-[0.05em]"
          active-class="!text-(--color-primary) border-b-2 border-(--color-primary) font-bold pb-1"
        >
          Reservations
        </RouterLink>
        <RouterLink
          to="/about"
          class="text-(--color-on-surface-variant) font-medium hover:text-(--color-primary) transition-colors duration-200 text-sm font-sans tracking-[0.05em]"
          active-class="!text-(--color-primary) border-b-2 border-(--color-primary) font-bold pb-1"
        >
          About
        </RouterLink>
      </div>

      <!-- Desktop CTA -->
      <div class="hidden md:flex items-center gap-4">
        <template v-if="auth.isAuthenticated">
          <button
            class="text-sm text-(--color-on-surface-variant) font-sans font-medium hover:text-(--color-on-surface) transition-colors"
            @click="handleLogout"
          >
            Sign Out
          </button>
        </template>
        <template v-else>
          <RouterLink
            to="/login"
            class="bg-(--color-primary) text-white px-6 py-2 rounded-full text-sm font-sans font-semibold tracking-[0.05em] hover:bg-(--color-primary-container) active:scale-90 transition-all"
          >
            Sign In
          </RouterLink>
        </template>
      </div>

      <!-- Mobile hamburger -->
      <button
        class="md:hidden text-(--color-primary)"
        :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
        @click="menuOpen = !menuOpen"
      >
        <span class="material-symbols-outlined">{{ menuOpen ? 'close' : 'menu' }}</span>
      </button>
    </nav>

    <!-- Mobile dropdown -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="menuOpen"
        class="md:hidden bg-(--color-surface) px-5 pb-6 pt-2 flex flex-col gap-4 border-t border-(--color-outline-variant)"
        @click="menuOpen = false"
      >
        <RouterLink to="/explore"  class="font-sans text-sm text-(--color-on-surface-variant) py-2">Explore</RouterLink>
        <RouterLink to="/bookings" class="font-sans text-sm text-(--color-on-surface-variant) py-2">Reservations</RouterLink>
        <RouterLink to="/about"    class="font-sans text-sm text-(--color-on-surface-variant) py-2">About</RouterLink>
        <template v-if="auth.isAuthenticated">
          <button class="font-sans text-sm text-(--color-on-surface-variant) py-2 text-left" @click="handleLogout">
            Sign Out
          </button>
        </template>
        <template v-else>
          <RouterLink
            to="/login"
            class="mt-2 w-full text-center bg-(--color-primary) text-white py-3 rounded-full text-sm font-sans font-semibold tracking-[0.05em]"
          >
            Sign In
          </RouterLink>
        </template>
      </div>
    </Transition>
  </header>
</template>

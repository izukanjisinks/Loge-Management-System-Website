<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth              = useAuthStore()
const router            = useRouter()
const menuOpen          = ref(false)
const showLogoutDialog  = ref(false)

function handleLogout() {
  menuOpen.value = false
  showLogoutDialog.value = true
}

function confirmLogout() {
  showLogoutDialog.value = false
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
          to="/lodges"
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
        <RouterLink to="/lodges"   class="font-sans text-sm text-(--color-on-surface-variant) py-2">Explore</RouterLink>
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

  <!-- Sign out confirmation dialog -->
  <Transition
    enter-active-class="transition duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="showLogoutDialog"
      class="fixed inset-0 z-200 flex items-center justify-center px-5"
      @click.self="showLogoutDialog = false"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <!-- Dialog -->
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
      >
        <div
          v-if="showLogoutDialog"
          class="relative bg-(--color-surface) rounded-2xl shadow-xl p-8 w-full max-w-sm border border-(--color-outline-variant)"
        >
          <div class="flex flex-col items-center text-center gap-4">
            <span
              class="material-symbols-outlined text-5xl text-(--color-primary)"
              style="font-variation-settings: 'FILL' 0"
            >logout</span>
            <div>
              <h2 class="font-serif text-xl text-(--color-on-surface)">Sign out?</h2>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1.5 leading-relaxed">
                You'll need to sign in again to access your reservations and bookings.
              </p>
            </div>
          </div>

          <div class="flex gap-3 mt-7">
            <button
              type="button"
              class="flex-1 py-3 rounded-xl border border-(--color-outline-variant) font-sans text-sm font-semibold text-(--color-on-surface) hover:bg-(--color-surface-container-low) transition-colors"
              @click="showLogoutDialog = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="flex-1 py-3 rounded-xl bg-(--color-primary) text-white font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors"
              @click="confirmLogout"
            >
              Sign Out
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

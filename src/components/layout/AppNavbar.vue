<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useClickOutside } from '@/composables/useClickOutside'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth         = useAuthStore()
const router       = useRouter()
const menuOpen     = ref(false)
const userMenuOpen = ref(false)
const userMenuRef  = ref(null)

useClickOutside(userMenuRef, () => { userMenuOpen.value = false })

const userInitials = computed(() => {
  const u = auth.user
  if (!u) return ''
  const first = u.firstName?.[0] ?? u.name?.[0] ?? ''
  const last  = u.lastName?.[0]  ?? ''
  return (first + last).toUpperCase()
})

function handleLogout() {
  auth.logout()
  userMenuOpen.value = false
  router.push({ name: 'home' })
}
</script>

<template>
  <header
    class="fixed top-0 inset-x-0 z-50
           bg-[oklch(1_0_0/0.80)] backdrop-blur-xl
           border-b border-[oklch(0_0_0/0.04)]"
  >
    <nav class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">

      <!-- Logo -->
      <RouterLink
        to="/"
        class="font-serif italic text-xl text-[--color-on-surface] tracking-tight shrink-0"
      >
        The Sanctuary
      </RouterLink>

      <!-- Desktop nav links -->
      <ul class="hidden md:flex items-center gap-7 text-sm font-sans font-medium text-[--color-on-muted]">
        <li><RouterLink to="/rooms"    active-class="text-[--color-primary]" class="hover:text-[--color-on-surface] transition-colors">Rooms</RouterLink></li>
        <li><RouterLink to="/#why"     class="hover:text-[--color-on-surface] transition-colors">Experiences</RouterLink></li>
        <li><RouterLink to="/#about"   class="hover:text-[--color-on-surface] transition-colors">About</RouterLink></li>
        <li><RouterLink to="/#contact" class="hover:text-[--color-on-surface] transition-colors">Concierge</RouterLink></li>
      </ul>

      <!-- Desktop auth / CTA -->
      <div class="hidden md:flex items-center gap-3 shrink-0">
        <template v-if="auth.isAuthenticated">
          <!-- User avatar + dropdown -->
          <div ref="userMenuRef" class="relative">
            <button
              class="flex items-center gap-2 font-sans text-sm text-[--color-on-muted] hover:text-[--color-on-surface] transition-colors"
              :aria-expanded="userMenuOpen"
              aria-haspopup="true"
              @click="userMenuOpen = !userMenuOpen"
            >
              <span
                class="w-8 h-8 rounded-lg bg-[--color-primary] text-white text-xs font-semibold
                       flex items-center justify-center select-none"
              >{{ userInitials || '?' }}</span>
              <span
                class="material-symbols-outlined text-base transition-transform duration-200"
                :class="userMenuOpen ? 'rotate-180' : ''"
              >expand_more</span>
            </button>

            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 scale-95 -translate-y-1"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="userMenuOpen"
                class="absolute right-0 top-full mt-2 w-44 bg-[--color-surface-card] rounded-lg py-1 z-50"
                style="box-shadow: var(--shadow-float);"
              >
                <RouterLink
                  to="/bookings"
                  class="flex items-center gap-2 px-4 py-2.5 font-sans text-sm text-[--color-on-muted]
                         hover:text-[--color-on-surface] hover:bg-[--color-secondary] transition-colors"
                  @click="userMenuOpen = false"
                >
                  <span class="material-symbols-outlined text-base">calendar_month</span>My Bookings
                </RouterLink>
                <button
                  class="w-full flex items-center gap-2 px-4 py-2.5 font-sans text-sm
                         text-[--color-error] hover:bg-[--color-secondary] transition-colors"
                  @click="handleLogout"
                >
                  <span class="material-symbols-outlined text-base">logout</span>Sign Out
                </button>
              </div>
            </Transition>
          </div>
        </template>
        <template v-else>
          <RouterLink
            to="/login"
            class="font-sans text-sm text-[--color-on-muted] hover:text-[--color-on-surface] transition-colors"
          >
            Sign In
          </RouterLink>
        </template>

        <BaseButton to="/rooms" variant="primary" class="text-xs px-5 py-2.5">
          Reserve
        </BaseButton>
      </div>

      <!-- Mobile hamburger -->
      <button
        class="md:hidden p-2 text-[--color-on-surface]"
        :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
        @click="menuOpen = !menuOpen"
      >
        <span class="material-symbols-outlined text-2xl">{{ menuOpen ? 'close' : 'menu' }}</span>
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
        class="md:hidden bg-[oklch(1_0_0/0.96)] backdrop-blur-xl px-6 pb-6 pt-2 flex flex-col gap-4"
        @click="menuOpen = false"
      >
        <RouterLink to="/rooms"    class="font-sans text-sm text-[--color-on-muted] py-2">Rooms</RouterLink>
        <RouterLink to="/"         class="font-sans text-sm text-[--color-on-muted] py-2">Experiences</RouterLink>
        <RouterLink to="/"         class="font-sans text-sm text-[--color-on-muted] py-2">About</RouterLink>
        <template v-if="auth.isAuthenticated">
          <RouterLink to="/bookings" class="font-sans text-sm text-[--color-on-muted] py-2">My Bookings</RouterLink>
          <button class="font-sans text-sm text-[--color-on-muted] py-2 text-left" @click="handleLogout">
            Sign Out
          </button>
        </template>
        <template v-else>
          <RouterLink to="/login"    class="font-sans text-sm text-[--color-on-muted] py-2">Sign In</RouterLink>
          <RouterLink to="/register" class="font-sans text-sm text-[--color-on-muted] py-2">Register</RouterLink>
        </template>
        <BaseButton to="/rooms" variant="primary" class="mt-2 w-full justify-center">
          Reserve Now
        </BaseButton>
      </div>
    </Transition>
  </header>
</template>

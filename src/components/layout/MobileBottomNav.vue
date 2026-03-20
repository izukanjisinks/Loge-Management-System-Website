<script setup>
import { RouterLink } from 'vue-router'

const links = [
  { to: '/',         icon: 'explore',       label: 'Explore'   },
  { to: '/rooms',    icon: 'bed',           label: 'Rooms'     },
  { to: '/bookings', icon: 'calendar_month', label: 'Bookings' },
  { to: '/login',    icon: 'person',        label: 'Profile'   },
]
</script>

<template>
  <nav
    class="md:hidden fixed bottom-0 inset-x-0 z-50
           bg-[oklch(1_0_0/0.92)] backdrop-blur-xl
           border-t border-[oklch(0_0_0/0.05)]
           flex justify-around py-2 safe-area-bottom"
  >
    <RouterLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="flex flex-col items-center gap-0.5 px-4 py-1 text-[--color-on-muted]"
      active-class="text-[--color-primary]"
    >
      <span class="material-symbols-outlined text-2xl">{{ link.icon }}</span>
      <span class="font-sans text-[10px] font-medium tracking-wide">{{ link.label }}</span>
    </RouterLink>
  </nav>
</template>

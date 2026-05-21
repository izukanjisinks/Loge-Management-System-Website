<script setup lang="ts">
import { RouterLink } from 'vue-router'

const links = [
  { to: '/',         icon: 'explore',        label: 'Discover'  },
  { to: '/rooms',    icon: 'search',         label: 'Search'    },
  { to: '/bookings', icon: 'calendar_today', label: 'Bookings'  },
  { to: '/login',    icon: 'person',         label: 'Profile'   },
]
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 md:hidden
           bg-(--color-surface) border-t border-(--color-outline-variant) shadow-lg"
  >
    <RouterLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="flex flex-col items-center justify-center text-(--color-on-surface-variant) active:scale-95 transition-transform duration-150 px-3 py-1"
      active-class="!text-(--color-primary) bg-[rgba(255,182,147,0.2)] rounded-full"
    >
      <span class="material-symbols-outlined">{{ link.icon }}</span>
      <span class="font-sans text-[10px] font-medium mt-0.5">{{ link.label }}</span>
    </RouterLink>
  </nav>
</template>

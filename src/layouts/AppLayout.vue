<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'

const route = useRoute()
</script>

<template>
  <div class="h-dvh flex flex-col overflow-hidden bg-(--color-background)">
    <AppNavbar />
    <main class="flex-1 min-h-0 overflow-y-auto">
      <RouterView />
      <AppFooter v-if="route.name !== 'home'" />
    </main>
    <MobileBottomNav />
  </div>
</template>

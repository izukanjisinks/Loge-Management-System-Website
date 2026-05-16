<script setup>
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'

const route = useRoute()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-(--color-background)">
    <AppNavbar />
    <main class="flex-1">
      <RouterView />
    </main>
    <AppFooter v-if="route.name !== 'home'" />
    <MobileBottomNav />
  </div>
</template>

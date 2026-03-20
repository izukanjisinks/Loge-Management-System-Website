<script setup>
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[--color-secondary]">
    <AppNavbar />
    <main class="flex-1 pt-16">
      <RouterView />
    </main>
    <AppFooter />
    <MobileBottomNav />
  </div>
</template>

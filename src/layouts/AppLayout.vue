<script setup>
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'

const route = useRoute()
</script>

<template>
  <div class="h-dvh flex flex-col overflow-hidden bg-(--color-background)">
    <!-- Navbar + content share one scroll container so the sticky, translucent
         bar has page content scrolling underneath it (frosted-glass effect). -->
    <main class="flex-1 min-h-0 overflow-y-auto">
      <AppNavbar />
      <RouterView v-slot="{ Component }">
        <keep-alive>
          <component v-if="route.meta.keepAlive" :is="Component" :key="route.path" />
        </keep-alive>
        <component v-if="!route.meta.keepAlive" :is="Component" />
      </RouterView>
      <AppFooter />
    </main>
    <MobileBottomNav />
  </div>
</template>

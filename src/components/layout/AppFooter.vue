<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <footer class="w-full border-t border-(--color-outline-variant) bg-(--color-surface-container-low)">
    <div
      class="w-full px-5 md:px-16 py-12 max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-start gap-8">

      <!-- Brand -->
      <div class="max-w-xs">
        <div class="flex items-center gap-2">
          <img src="/mwakwanda_favicon.svg" alt="Mwakwanda logo" class="h-8 w-8" />
          <span class="font-serif text-2xl text-[var(--color-primary)]">
            Mwakwanda
          </span>
        </div>

        <p class="font-sans text-sm text-[var(--color-on-surface-variant)] leading-relaxed mt-2">
          Simplifying Hospitality.
        </p>
      </div>

      <!-- Links -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-12">
        <div class="flex flex-col gap-3">
          <span class="font-sans text-sm font-semibold text-(--color-on-surface) mb-1">Company</span>
          <RouterLink to="/about"
            class="font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) transition-colors">
            About Us</RouterLink>
          <!-- <a href="#" class="font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) transition-colors">Sustainability</a> -->
          <a href="#"
            class="font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) transition-colors">Contact</a>
        </div>
        <div class="flex flex-col gap-3">
          <span class="font-sans text-sm font-semibold text-(--color-on-surface) mb-1">Service</span>
          <RouterLink to="/bookings"
            class="font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) transition-colors">
            Corporate Booking</RouterLink>
          <RouterLink to="/rooms"
            class="font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) transition-colors">
            Partner Lodges</RouterLink>
          <!-- <a href="#"                class="font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) transition-colors">Concierge</a> -->
        </div>
        <div class="flex flex-col gap-3">
          <span class="font-sans text-sm font-semibold text-(--color-on-surface) mb-1">Legal</span>
          <a href="#"
            class="font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) transition-colors">Privacy
            Policy</a>
          <a href="#"
            class="font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-primary) transition-colors">Terms
            of Service</a>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <div
      class="w-full px-5 md:px-16 py-5 max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 opacity-60 border-t border-(--color-outline-variant)">
      <p class="font-sans text-xs text-(--color-on-surface-variant)">
        Copyright © {{ new Date().getFullYear() }} Mwakwanda Hospitality Group. All rights reserved.
      </p>
      <div class="flex gap-6">
        <span class="material-symbols-outlined text-(--color-on-surface-variant) cursor-pointer">language</span>
        <span
          class="material-symbols-outlined text-(--color-on-surface-variant) cursor-pointer">account_balance_wallet</span>
      </div>
    </div>
  </footer>
</template>

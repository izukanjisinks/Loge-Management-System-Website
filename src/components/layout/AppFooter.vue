<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <footer class="bg-(--color-charcoal) text-white">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-16 max-w-[1280px] mx-auto px-5 md:px-16 py-20">

      <!-- Brand -->
      <div class="col-span-1">
        <div class="font-serif text-2xl font-bold text-(--color-primary-container) mb-6">Mwakwanda</div>
        <p class="font-sans text-sm text-white/60 leading-relaxed">
          Defining the art of modern hospitality through minimalist architectural excellence and unparalleled personalized service.
        </p>
      </div>

      <!-- Navigation -->
      <div>
        <h5 class="font-sans text-xs font-bold text-white uppercase tracking-[0.2em] mb-8">Navigation</h5>
        <ul class="space-y-4">
          <li><RouterLink to="/rooms"    class="font-sans text-sm text-white/60 hover:text-(--color-primary-container) transition-colors">Rooms &amp; Suites</RouterLink></li>
          <li><RouterLink to="/venues"   class="font-sans text-sm text-white/60 hover:text-(--color-primary-container) transition-colors">Venues &amp; Events</RouterLink></li>
          <li><RouterLink to="/lodges"   class="font-sans text-sm text-white/60 hover:text-(--color-primary-container) transition-colors">Partner Lodges</RouterLink></li>
          <li><RouterLink to="/bookings" class="font-sans text-sm text-white/60 hover:text-(--color-primary-container) transition-colors">My Reservations</RouterLink></li>
        </ul>
      </div>

      <!-- Support -->
      <div>
        <h5 class="font-sans text-xs font-bold text-white uppercase tracking-[0.2em] mb-8">Support</h5>
        <ul class="space-y-4">
          <li><RouterLink to="/about" class="font-sans text-sm text-white/60 hover:text-(--color-primary-container) transition-colors">About Us</RouterLink></li>
          <li><a href="#" class="font-sans text-sm text-white/60 hover:text-(--color-primary-container) transition-colors">Privacy &amp; Legal</a></li>
          <li><a href="#" class="font-sans text-sm text-white/60 hover:text-(--color-primary-container) transition-colors">Concierge Contact</a></li>
        </ul>
      </div>

      <!-- Follow -->
      <div>
        <h5 class="font-sans text-xs font-bold text-white uppercase tracking-[0.2em] mb-8">Follow Us</h5>
        <div class="flex gap-4">
          <a href="#" aria-label="Instagram"
            class="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 font-sans text-sm font-semibold text-white hover:bg-(--color-primary) hover:border-(--color-primary) transition-all">IG</a>
          <a href="#" aria-label="Facebook"
            class="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 font-sans text-sm font-semibold text-white hover:bg-(--color-primary) hover:border-(--color-primary) transition-all">FB</a>
          <a href="#" aria-label="Twitter"
            class="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 font-sans text-sm font-semibold text-white hover:bg-(--color-primary) hover:border-(--color-primary) transition-all">TW</a>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <div class="max-w-[1280px] mx-auto px-5 md:px-16 py-8 border-t border-white/10 text-center md:text-left">
      <p class="font-sans text-xs text-white/50 uppercase tracking-widest">
        Copyright © {{ new Date().getFullYear() }} Mwakwanda Hospitality Group. Curated Architectural Stays.
      </p>
    </div>
  </footer>
</template>

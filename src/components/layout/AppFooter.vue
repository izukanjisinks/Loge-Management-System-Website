<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <footer class="bg-[--color-on-surface] text-[oklch(0.75_0.02_50)] font-sans">
    <div class="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">

      <!-- Brand -->
      <div class="md:col-span-1">
        <p class="font-serif italic text-xl text-white mb-3">The Sanctuary</p>
        <p class="text-sm leading-relaxed">
          Curated escapes nestled in nature. Every stay, a story worth telling.
        </p>
      </div>

      <!-- Explore -->
      <div>
        <p class="text-xs font-semibold tracking-widest uppercase text-white mb-4">Explore</p>
        <ul class="space-y-2 text-sm">
          <li><RouterLink to="/rooms" class="hover:text-white transition-colors">Our Rooms</RouterLink></li>
          <li><a href="#" class="hover:text-white transition-colors">Experiences</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Dining</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Wellness</a></li>
        </ul>
      </div>

      <!-- Stay -->
      <div>
        <p class="text-xs font-semibold tracking-widest uppercase text-white mb-4">Your Stay</p>
        <ul class="space-y-2 text-sm">
          <li><RouterLink to="/bookings" class="hover:text-white transition-colors">My Bookings</RouterLink></li>
          <li><a href="#" class="hover:text-white transition-colors">Packages</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Gift Cards</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Loyalty</a></li>
        </ul>
      </div>

      <!-- Contact -->
      <div>
        <p class="text-xs font-semibold tracking-widest uppercase text-white mb-4">Concierge</p>
        <ul class="space-y-2 text-sm">
          <li class="flex items-center gap-2">
            <span class="material-symbols-outlined text-base">call</span>+1 800 SANCTUARY
          </li>
          <li class="flex items-center gap-2">
            <span class="material-symbols-outlined text-base">mail</span>hello@thesanctuary.com
          </li>
          <li class="flex items-center gap-2">
            <span class="material-symbols-outlined text-base">location_on</span>The Highland Reserve
          </li>
        </ul>
      </div>
    </div>

    <div class="border-t border-white/10 max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between gap-3 text-xs text-[oklch(0.55_0.02_50)]">
      <span>© {{ new Date().getFullYear() }} The Sanctuary. All rights reserved.</span>
      <div class="flex gap-5">
        <a href="#" class="hover:text-white transition-colors">Privacy</a>
        <a href="#" class="hover:text-white transition-colors">Terms</a>
        <a href="#" class="hover:text-white transition-colors">Cookies</a>
      </div>
    </div>
  </footer>
</template>

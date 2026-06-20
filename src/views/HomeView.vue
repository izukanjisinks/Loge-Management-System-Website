<script setup>
import { useScrollReveal } from '@/composables/useScrollReveal'
import HeroSection from '@/components/home/HeroSection.vue'

useScrollReveal()

const DISCOVERY_CARDS = [
  {
    to:          '/rooms',
    icon:        'bed',
    label:       'Explore Accommodation',
    description: 'Browse hotel rooms, suites, villas, and lodge accommodation across all our properties.',
    badge:       'Rooms',
    image:       'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
    cta:         'Browse Rooms',
  },
  {
    to:          '/venues',
    icon:        'event',
    label:       'Explore Venues',
    description: 'Discover conference halls, boardrooms, wedding gardens, banquet halls, and event spaces.',
    badge:       'Venues',
    image:       'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80',
    cta:         'Browse Venues',
  },
  {
    to:          '/explore',
    icon:        'explore',
    label:       'Explore Everything',
    description: 'Browse rooms and venues together with smart filters to find exactly what you need.',
    badge:       'All',
    image:       'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
    cta:         'Browse All',
    featured:    true,
  },
]
</script>

<template>
  <!-- Hero — viewport-height hero with embedded search -->
  <div class="h-[calc(100dvh-64px)] min-h-[520px]">
    <HeroSection />
  </div>

  <!-- Discovery Section -->
  <section class="bg-(--color-background) py-16 px-5 md:px-16">
    <div class="max-w-[1280px] mx-auto">

      <!-- Heading -->
      <div class="text-center mb-12 reveal">
        <p class="font-sans text-xs font-semibold tracking-[0.12em] uppercase text-(--color-primary) mb-3">Discover</p>
        <h2 class="font-serif text-3xl md:text-4xl font-semibold text-(--color-on-surface) mb-4">
          What are you looking for?
        </h2>
        <p class="font-sans text-base text-(--color-on-surface-variant) max-w-xl mx-auto leading-relaxed">
          Whether you need a room for the night or a venue for your next event, we have the perfect space waiting for you.
        </p>
      </div>

      <!-- Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RouterLink
          v-for="(card, i) in DISCOVERY_CARDS"
          :key="card.to"
          :to="card.to"
          class="reveal group relative overflow-hidden rounded-2xl border border-(--color-outline-variant) bg-(--color-surface-container-lowest) hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
          :style="`transition-delay: ${i * 100}ms`"
        >
          <!-- Card image -->
          <div class="relative h-52 overflow-hidden shrink-0">
            <img
              :src="card.image"
              :alt="card.label"
              class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-linear-to-t from-black/60 to-transparent"></div>

            <!-- Badge -->
            <div
              :class="card.featured ? 'bg-(--color-primary)' : 'bg-black/50 backdrop-blur-sm'"
              class="absolute top-4 left-4 flex items-center gap-1.5 text-white px-3 py-1 rounded-full font-sans text-xs font-semibold"
            >
              <span class="material-symbols-outlined text-sm">{{ card.icon }}</span>
              {{ card.badge }}
            </div>
          </div>

          <!-- Card content -->
          <div class="p-6 flex flex-col flex-1">
            <h3 class="font-serif text-xl text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors mb-2 leading-snug">
              {{ card.label }}
            </h3>
            <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed flex-1 mb-5">
              {{ card.description }}
            </p>
            <div
              :class="card.featured ? 'bg-(--color-primary) text-white' : 'border border-(--color-primary) text-(--color-primary) hover:bg-(--color-savannah-mist)'"
              class="flex items-center justify-center gap-2 py-3 rounded-xl font-sans text-sm font-semibold transition-colors"
            >
              {{ card.cta }}
              <span class="material-symbols-outlined text-base">arrow_forward</span>
            </div>
          </div>
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- Property Strip -->
  <section class="bg-(--color-surface-container-lowest) py-14 px-5 md:px-16 border-t border-(--color-outline-variant)">
    <div class="max-w-[1280px] mx-auto">
      <div class="text-center mb-10 reveal">
        <h2 class="font-serif text-2xl md:text-3xl font-semibold text-(--color-on-surface) mb-3">Our Properties</h2>
        <p class="font-sans text-sm text-(--color-on-surface-variant) max-w-md mx-auto">
          Explore our curated collection of hotels, lodges, and resorts across Southern Africa.
        </p>
      </div>
      <div class="flex justify-center reveal">
        <RouterLink
          to="/lodges"
          class="flex items-center gap-2 px-8 py-3.5 bg-(--color-primary) text-white rounded-full font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors shadow-md"
        >
          <span class="material-symbols-outlined text-base">apartment</span>
          View All Properties
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- Why Choose Us -->
  <section class="py-16 px-5 md:px-16 bg-(--color-background)">
    <div class="max-w-[1280px] mx-auto">
      <div class="text-center mb-12 reveal">
        <p class="font-sans text-xs font-semibold tracking-[0.12em] uppercase text-(--color-primary) mb-3">Why Mwakwanda</p>
        <h2 class="font-serif text-2xl md:text-3xl font-semibold text-(--color-on-surface)">Simplifying Hospitality</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div
          v-for="(feature, i) in [
            { icon: 'verified', title: 'Trusted Properties', text: 'Every property on our platform is verified for quality, comfort, and genuine African hospitality.' },
            { icon: 'flash_on', title: 'Instant Booking', text: 'Book rooms and enquire about venues instantly. No waiting, no back-and-forth — just results.' },
            { icon: 'support_agent', title: 'Dedicated Support', text: 'Our team is available to help you find the right space and make your event or stay unforgettable.' },
          ]"
          :key="feature.icon"
          class="reveal flex flex-col items-center text-center gap-4"
          :style="`transition-delay: ${i * 100}ms`"
        >
          <div class="w-14 h-14 rounded-2xl bg-(--color-savannah-mist) flex items-center justify-center">
            <span class="material-symbols-outlined text-2xl text-(--color-primary)">{{ feature.icon }}</span>
          </div>
          <div>
            <h3 class="font-serif text-lg text-(--color-on-surface) mb-2">{{ feature.title }}</h3>
            <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed">{{ feature.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

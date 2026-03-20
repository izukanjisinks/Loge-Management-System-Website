<script setup>
import BaseButton from '@/components/ui/BaseButton.vue'
</script>

<template>
  <section class="relative h-[90vh] min-h-[700px] overflow-hidden">
    <!-- Background image -->
    <div class="absolute inset-0">
      <img
        src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1600&q=80"
        alt="Luxury mountain lodge at dusk"
        class="w-full h-full object-cover"
        loading="eager"
        fetchpriority="high"
      />
      <!-- Bottom-fade overlay to surface colour so search bar overlaps smoothly -->
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[--color-secondary]" />
      <!-- Left-side vignette for text legibility -->
      <div class="absolute inset-0 bg-gradient-to-r from-[oklch(0.12_0.02_45/0.55)] via-[oklch(0.12_0.02_45/0.20)] to-transparent" />
    </div>

    <!-- Content -->
    <div class="relative z-10 max-w-7xl mx-auto px-6 md:px-16 h-full flex flex-col justify-center">
      <div class="max-w-3xl">
        <p class="font-sans text-xs font-semibold tracking-[0.28em] uppercase text-[oklch(0.85_0.04_60)] mb-6 reveal">
          A Curated Escape
        </p>
        <h1
          class="font-serif text-5xl md:text-7xl text-white leading-[1.08] mb-8 tracking-tight reveal"
          style="transition-delay: 100ms"
        >
          Seek the <em class="text-[oklch(0.80_0.10_55)]">Unspoken</em><br />
          Beauty of the Wild.
        </h1>
        <p
          class="font-sans text-base md:text-lg text-[oklch(0.88_0.02_60)] max-w-md leading-relaxed mb-10 reveal"
          style="transition-delay: 200ms"
        >
          Secluded retreats crafted for those who seek beauty in silence and meaning in rest.
        </p>
        <div class="flex gap-3 reveal" style="transition-delay: 300ms">
          <BaseButton to="/rooms" variant="primary" class="px-8 py-3.5">
            Explore Rooms
          </BaseButton>
          <BaseButton to="/#why" variant="ghost" class="text-white/80 hover:text-white px-6 py-3.5">
            Our Story
          </BaseButton>
        </div>
      </div>
    </div>
  </section>
</template>

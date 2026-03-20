<script setup>
import { useScrollReveal } from '@/composables/useScrollReveal'
import HeroSection   from '@/components/home/HeroSection.vue'
import SearchBar     from '@/components/home/SearchBar.vue'
import PropertyGrid  from '@/components/home/PropertyGrid.vue'
import WhyChooseUs   from '@/components/home/WhyChooseUs.vue'
import NewsletterCta from '@/components/home/NewsletterCta.vue'
import BaseButton    from '@/components/ui/BaseButton.vue'

useScrollReveal()

// Placeholder — replace with API call in Phase 5
const featured = [
  {
    id: 1,
    name: 'The Obsidian Glasshouse',
    type: 'Suite',
    price: 1250,
    rating: 5,
    reviews: 48,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    location: 'Iceland',
  },
  {
    id: 2,
    name: 'Savanna Horizon Lodge',
    type: 'Lodge',
    price: 2100,
    rating: 4,
    reviews: 32,
    image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80',
    location: 'Botswana',
  },
  {
    id: 3,
    name: 'Eiger Peak Sanctuary',
    type: 'Chalet',
    price: 1890,
    rating: 5,
    reviews: 124,
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80',
    location: 'Switzerland',
  },
]
</script>

<template>
  <!-- Hero — full viewport height -->
  <HeroSection />

  <!-- Search bar — -120px editorial overlap over hero bottom -->
  <SearchBar />

  <!-- Featured properties -->
  <section class="max-w-7xl mx-auto px-6 md:px-16 pt-48 pb-24">
    <div class="flex flex-col md:flex-row justify-between items-baseline mb-16 gap-4 reveal">
      <div class="max-w-xl">
        <h2 class="font-serif text-4xl text-[--color-on-surface] mb-4">Curated Escapes</h2>
        <p class="font-sans text-[--color-on-muted] leading-relaxed">
          A handpicked selection of residences where architectural brilliance meets untouched nature.
        </p>
      </div>
      <BaseButton to="/rooms" variant="ghost" class="text-[--color-primary] font-bold text-xs tracking-widest uppercase border-b border-[--color-primary]/30 hover:border-[--color-primary] rounded-none pb-1 px-0 hover:scale-100">
        View All Residences
      </BaseButton>
    </div>

    <PropertyGrid :rooms="featured" />
  </section>

  <!-- Why Choose Us — asymmetric bento -->
  <WhyChooseUs />

  <!-- Newsletter CTA -->
  <NewsletterCta />
</template>

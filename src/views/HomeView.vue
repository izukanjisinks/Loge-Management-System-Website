<script setup>
import { useScrollReveal } from '@/composables/useScrollReveal'
import HeroSection   from '@/components/home/HeroSection.vue'
import PropertyGrid  from '@/components/home/PropertyGrid.vue'
import WhyChooseUs   from '@/components/home/WhyChooseUs.vue'
import NewsletterCta from '@/components/home/NewsletterCta.vue'

useScrollReveal()

const featured = [
  {
    id: 1,
    name: 'The Mist Highlands',
    type: 'Suite',
    price: 850,
    rating: 5,
    reviews: 48,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    location: 'Nyanga Mountains, Zimbabwe',
  },
  {
    id: 2,
    name: 'Savannah Oasis',
    type: 'Lodge',
    price: 1200,
    rating: 5,
    reviews: 32,
    image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80',
    location: 'Serengeti, Tanzania',
  },
  {
    id: 3,
    name: 'Coastal Sanctuary',
    type: 'Villa',
    price: 950,
    rating: 5,
    reviews: 61,
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80',
    location: 'Bazaruto Archipelago, Mozambique',
  },
  {
    id: 4,
    name: 'The Crimson Ridge',
    type: 'Lodge',
    price: 1450,
    rating: 5,
    reviews: 19,
    image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=600&q=80',
    location: 'Great Rift Valley, Kenya',
  },
]
</script>

<template>
  <!-- Hero â€” full bleed with embedded search -->
  <HeroSection />

</template>

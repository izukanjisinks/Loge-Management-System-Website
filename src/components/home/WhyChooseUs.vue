<script setup>
const features = [
  {
    icon: 'spa',
    title: 'Holistic Wellness',
    body: 'Spas and experiences designed to align your spirit with the rhythms of the earth.',
  },
  {
    icon: 'restaurant',
    title: 'Savanna-to-Table',
    body: 'Culinary journeys featuring ingredients sourced directly from local cooperatives.',
  },
  {
    icon: 'public',
    title: 'Radical Respect',
    body: "Sustainability isn't a feature; it's our foundation. We leave only footprints.",
  },
]
</script>

<template>
  <section class="bg-(--color-inverse-surface) text-(--color-inverse-on-surface) py-24">
    <div class="px-5 md:px-16 max-w-[1280px] mx-auto text-center">
      <h2 class="font-serif text-[32px] font-semibold leading-10 mb-12">The Mwakwanda Standard</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div
          v-for="f in features"
          :key="f.icon"
          class="flex flex-col items-center reveal"
        >
          <div class="w-16 h-16 rounded-full bg-(--color-primary-container)/20 flex items-center justify-center mb-6">
            <span class="material-symbols-outlined text-(--color-primary-fixed-dim) text-3xl">{{ f.icon }}</span>
          </div>
          <h4 class="font-serif text-2xl mb-3">{{ f.title }}</h4>
          <p class="font-sans text-base opacity-70">{{ f.body }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

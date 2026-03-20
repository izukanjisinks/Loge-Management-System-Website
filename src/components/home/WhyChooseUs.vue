<script setup>
const features = [
  {
    icon: 'auto_awesome',
    title: 'Curated Collection',
    body: 'Every property in our sanctuary undergoes a 200-point inspection by our global design board.',
  },
  {
    icon: 'encrypted',
    title: 'Seamless Booking',
    body: 'Direct communication with your personal concierge through our encrypted sanctuary portal.',
  },
  {
    icon: 'concierge',
    title: 'Exceptional Service',
    body: 'From private arrangements to local hidden gem access, your journey is entirely bespoke.',
  },
]

const images = [
  { src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&q=80', alt: 'Luxury breakfast with mountain view',  class: 'aspect-[4/5]' },
  { src: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&q=80', alt: 'Spa treatment room with natural light', class: 'aspect-square' },
  { src: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=500&q=80', alt: 'Luxury in-room amenities',             class: 'aspect-square' },
  { src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&q=80', alt: 'Night sky over remote retreat',         class: 'aspect-[4/5]' },
]
</script>

<template>
  <section id="why" class="bg-[--color-surface] py-32">
    <div class="max-w-7xl mx-auto px-6 md:px-16">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

        <!-- Text column -->
        <div class="lg:col-span-5 reveal">
          <h2 class="font-serif text-4xl text-[--color-on-surface] mb-10 leading-tight">
            The Art of <br /><em>Intentional Travel</em>
          </h2>

          <div class="space-y-10">
            <div
              v-for="f in features"
              :key="f.icon"
              class="flex gap-6"
            >
              <div
                class="shrink-0 w-12 h-12 bg-[--color-surface-card] flex items-center justify-center rounded-lg"
                style="box-shadow: var(--shadow-card);"
              >
                <span class="material-symbols-outlined text-[--color-primary]">{{ f.icon }}</span>
              </div>
              <div>
                <h4 class="font-serif text-xl text-[--color-on-surface] mb-2">{{ f.title }}</h4>
                <p class="font-sans text-sm text-[--color-on-muted] leading-relaxed">{{ f.body }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Asymmetric 2×2 image grid — right column offset by pt-12 -->
        <div class="lg:col-span-7 grid grid-cols-2 gap-4">
          <!-- Left column: tall then square -->
          <div class="space-y-4">
            <img
              :src="images[0].src"
              :alt="images[0].alt"
              :class="`w-full ${images[0].class} object-cover rounded-xl reveal`"
              loading="lazy"
            />
            <img
              :src="images[1].src"
              :alt="images[1].alt"
              :class="`w-full ${images[1].class} object-cover rounded-xl reveal`"
              loading="lazy"
              style="transition-delay: 80ms"
            />
          </div>
          <!-- Right column: offset down, square then tall -->
          <div class="pt-12 space-y-4">
            <img
              :src="images[2].src"
              :alt="images[2].alt"
              :class="`w-full ${images[2].class} object-cover rounded-xl reveal`"
              loading="lazy"
              style="transition-delay: 160ms"
            />
            <img
              :src="images[3].src"
              :alt="images[3].alt"
              :class="`w-full ${images[3].class} object-cover rounded-xl reveal`"
              loading="lazy"
              style="transition-delay: 240ms"
            />
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

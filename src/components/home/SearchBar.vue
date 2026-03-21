<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function search() {
  router.push({ name: 'rooms' })
}
</script>

<template>
  <!--
    editorial-overlap: -120px margin-top pulls this over the hero section bottom.
    relative + z-20 keeps it above the hero gradient.
  -->
  <section class="max-w-7xl mx-auto px-6 md:px-16 relative z-20" style="margin-top: -120px;">
    <div
      class="bg-[--color-surface-card] rounded-lg p-2"
      style="box-shadow: 0px 24px 48px oklch(0.18 0.02 45 / 0.12);"
    >
      <button
        class="w-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-light))]
               text-white rounded-lg py-5 font-sans font-bold text-sm
               flex items-center justify-center gap-2
               hover:scale-[1.01] transition-transform duration-300"
        @click="search"
      >
        <span class="material-symbols-outlined text-xl">search</span>
        Explore Collection
      </button>
    </div>
  </section>
</template>
<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { lodges } from '@/data/lodges'

const route  = useRoute()
const router = useRouter()

const lodge = computed(() => lodges.find(l => l.id === Number(route.params.id)))

function reserve(suiteId) {
  router.push({ name: 'reservation', params: { roomId: suiteId } })
}
</script>

<template>
  <div v-if="!lodge" class="max-w-[1280px] mx-auto px-5 md:px-16 py-32 text-center">
    <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">search_off</span>
    <p class="font-serif text-2xl text-(--color-on-surface) mb-2">Lodge not found</p>
    <RouterLink to="/lodges" class="font-sans text-sm text-(--color-primary) hover:underline">← Back to lodges</RouterLink>
  </div>

  <div v-else class="pb-24">

    <!-- ── Bento Gallery ────────────────────────────────────────────── -->
    <section class="px-5 md:px-16 pt-8 max-w-[1280px] mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-3 h-72 md:h-[520px]">
        <!-- Main large image -->
        <div class="md:col-span-2 md:row-span-2 relative overflow-hidden rounded-2xl">
          <img
            :src="lodge.images[0]"
            :alt="lodge.name"
            class="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <!-- Small images -->
        <div class="hidden md:block relative overflow-hidden rounded-2xl">
          <img :src="lodge.images[1]" :alt="lodge.name" class="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div class="hidden md:block relative overflow-hidden rounded-2xl">
          <img :src="lodge.images[2]" :alt="lodge.name" class="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div class="hidden md:col-span-2 md:block relative overflow-hidden rounded-2xl">
          <img :src="lodge.images[3]" :alt="lodge.name" class="absolute inset-0 w-full h-full object-cover" />
        </div>
      </div>
    </section>

    <!-- ── Main Content ─────────────────────────────────────────────── -->
    <div class="max-w-[1280px] mx-auto px-5 md:px-16 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">

      <!-- Left: Description & Amenities -->
      <div class="lg:col-span-2 space-y-8">

        <!-- Title -->
        <div>
          <h1 class="font-serif text-[32px] font-semibold leading-10 text-(--color-on-surface) mb-2">{{ lodge.name }}</h1>
          <p class="flex items-center gap-2 font-sans text-base text-(--color-on-surface-variant)">
            <span class="material-symbols-outlined text-base text-(--color-primary)">location_on</span>
            {{ lodge.location }}
          </p>
        </div>

        <!-- About card -->
        <div class="bg-(--color-surface-container-lowest) p-8 rounded-2xl border border-(--color-outline-variant) shadow-sm">
          <h2 class="font-serif text-2xl text-(--color-on-surface) mb-4">About the Sanctuary</h2>
          <p class="font-sans text-base text-(--color-on-surface-variant) leading-relaxed">{{ lodge.description }}</p>
        </div>

        <!-- Amenities -->
        <div>
          <h3 class="font-serif text-2xl text-(--color-on-surface) mb-6">World-Class Amenities</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-5">
            <div v-for="a in lodge.amenities" :key="a.label" class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-(--color-savannah-mist) flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-base text-(--color-primary)">{{ a.icon }}</span>
              </div>
              <span class="font-sans text-sm font-semibold text-(--color-on-surface)">{{ a.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Booking widget -->
      <aside class="lg:sticky lg:top-24 space-y-4">
        <div class="bg-(--color-surface-container-high) p-6 rounded-2xl border border-(--color-outline-variant) shadow-lg">
          <div class="flex justify-between items-baseline mb-6">
            <span class="font-serif text-2xl text-(--color-on-surface)">From K{{ lodge.priceFrom.toLocaleString() }}</span>
            <span class="font-sans text-sm text-(--color-on-surface-variant)">/ night</span>
          </div>

          <!-- Rating -->
          <div class="flex items-center gap-2 mb-6">
            <div class="flex">
              <span
                v-for="i in 5"
                :key="i"
                class="material-symbols-outlined text-base text-amber-500"
                style="font-variation-settings:'FILL' 1"
              >star</span>
            </div>
            <span class="font-sans text-sm text-(--color-on-surface-variant)">{{ lodge.reviews }} reviews</span>
          </div>

          <RouterLink
            :to="`/lodges/${lodge.id}#suites`"
            class="w-full block text-center bg-(--color-primary) text-white py-3.5 rounded-full font-sans text-sm font-semibold hover:bg-(--color-primary-container) transition-colors shadow-md mb-3"
          >
            View Available Suites
          </RouterLink>
          <RouterLink
            to="/lodges"
            class="w-full block text-center font-sans text-sm text-(--color-primary) hover:underline"
          >
            ← Back to all lodges
          </RouterLink>
        </div>

        <!-- Info note -->
        <div class="p-4 bg-(--color-tertiary-fixed) rounded-xl flex items-start gap-3">
          <span class="material-symbols-outlined text-(--color-tertiary) shrink-0">info</span>
          <p class="font-sans text-xs text-(--color-on-tertiary-fixed-variant) leading-relaxed">
            Our prices include full-board dining and two guided game drives daily.
          </p>
        </div>
      </aside>
    </div>

    <!-- ── Available Suites Table ───────────────────────────────────── -->
    <section id="suites" class="max-w-[1280px] mx-auto px-5 md:px-16 mt-20">
      <h2 class="font-serif text-[32px] font-semibold leading-10 text-(--color-on-surface) mb-8">Available Suites</h2>

      <div class="overflow-x-auto rounded-2xl border border-(--color-outline-variant) bg-(--color-surface-container-lowest)">
        <table class="w-full text-left border-collapse">
          <thead class="bg-(--color-surface-container-highest) border-b border-(--color-outline-variant)">
            <tr>
              <th class="px-6 py-4 font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Suite Type</th>
              <th class="px-6 py-4 font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Sleeps</th>
              <th class="px-6 py-4 font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Amenities</th>
              <th class="px-6 py-4 font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">Rate</th>
              <th class="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-(--color-outline-variant)">
            <tr
              v-for="suite in lodge.suites"
              :key="suite.id"
              class="hover:bg-(--color-surface-container-low) transition-colors"
            >
              <!-- Suite info -->
              <td class="px-6 py-5">
                <div class="flex gap-4 items-center">
                  <div class="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-(--color-surface-container)">
                    <img :src="suite.image" :alt="suite.name" class="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p class="font-serif text-lg text-(--color-on-surface) mb-0.5">{{ suite.name }}</p>
                    <p class="font-sans text-sm text-(--color-on-surface-variant)">{{ suite.size }} · {{ suite.view }}</p>
                  </div>
                </div>
              </td>
              <!-- Sleeps -->
              <td class="px-6 py-5 font-sans text-sm text-(--color-on-surface)">{{ suite.sleeps }}</td>
              <!-- Amenities chips -->
              <td class="px-6 py-5">
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="a in suite.amenities"
                    :key="a"
                    class="px-2 py-0.5 bg-(--color-savannah-mist) text-(--color-primary) font-sans text-xs font-bold rounded uppercase tracking-tight"
                  >
                    {{ a }}
                  </span>
                </div>
              </td>
              <!-- Rate -->
              <td class="px-6 py-5">
                <p class="font-serif text-xl text-(--color-primary)">K{{ suite.price.toLocaleString() }}</p>
                <p class="font-sans text-xs text-(--color-on-surface-variant)">per night</p>
              </td>
              <!-- CTA -->
              <td class="px-6 py-5 text-right">
                <button
                  class="px-5 py-2 border-2 border-(--color-primary) text-(--color-primary) font-sans text-sm font-semibold rounded-full hover:bg-(--color-primary) hover:text-white transition-all"
                  @click="reserve(suite.id)"
                >
                  Select
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useReservationsStore } from '@/stores/reservations'
import { useScrollReveal } from '@/composables/useScrollReveal'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'

const reservations = useReservationsStore()
useScrollReveal()

onMounted(() => reservations.fetchAll())
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="max-w-7xl mx-auto px-6 pt-16 pb-12">
      <p class="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-[--color-primary] mb-2">
        Your Account
      </p>
      <h1 class="font-serif text-4xl md:text-5xl text-[--color-on-surface]">
        Your <em>Journeys</em>
      </h1>
      <p class="font-sans text-base text-[--color-on-muted] mt-3 max-w-md leading-relaxed">
        Every reservation, past and present — gathered in one quiet place.
      </p>
    </section>

    <!-- Loading -->
    <div v-if="reservations.loading" class="max-w-7xl mx-auto px-6 py-24 text-center">
      <span class="material-symbols-outlined text-4xl text-[--color-on-muted] animate-spin">progress_activity</span>
    </div>

    <template v-else>
      <!-- Active reservations -->
      <section class="max-w-7xl mx-auto px-6 pb-16">
        <h2 class="font-serif text-2xl text-[--color-on-surface] mb-8 reveal">Active Reservations</h2>

        <div v-if="reservations.active.length === 0" class="reveal text-center py-16 text-[--color-on-muted] font-sans text-sm">
          No upcoming reservations.
          <RouterLink to="/rooms" class="text-[--color-primary] ml-1 hover:underline">Browse rooms →</RouterLink>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div
            v-for="(r, i) in reservations.active"
            :key="r.id"
            class="reveal"
            :style="`transition-delay: ${i * 100}ms`"
          >
            <BaseCard hover>
              <div class="flex flex-col sm:flex-row gap-0">
                <div class="relative sm:w-44 shrink-0 overflow-hidden rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none">
                  <img
                    :src="r.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80'"
                    :alt="r.roomName"
                    class="w-full h-40 sm:h-full object-cover transition-transform duration-1000 hover:scale-110"
                  />
                </div>
                <div class="p-5 flex flex-col gap-3 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <h3 class="font-serif text-lg text-[--color-on-surface]">{{ r.roomName || 'Forest Suite' }}</h3>
                    <StatusBadge :status="r.status || 'confirmed'" />
                  </div>
                  <div class="space-y-1.5 text-sm font-sans text-[--color-on-muted]">
                    <p class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-base">calendar_today</span>
                      {{ r.checkIn }} → {{ r.checkOut }}
                    </p>
                    <p class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-base">group</span>
                      {{ r.guestCount || 2 }} guests
                    </p>
                    <p class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-base">restaurant</span>
                      {{ r.mealPlan?.replace('_', ' ') || 'Breakfast' }}
                    </p>
                  </div>
                  <div class="flex gap-2 pt-1">
                    <BaseButton as="RouterLink" :to="`/reserve/${r.roomId}`" variant="primary" class="text-xs px-4 py-2">
                      View Details
                    </BaseButton>
                    <BaseButton variant="secondary" class="text-xs px-4 py-2" @click="reservations.cancel(r.id)">
                      Cancel
                    </BaseButton>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>
        </div>
      </section>

      <!-- Past journeys -->
      <section class="bg-[--color-surface] py-16">
        <div class="max-w-7xl mx-auto px-6">
          <h2 class="font-serif text-2xl text-[--color-on-surface] mb-8 reveal">Past Journeys</h2>

          <div v-if="reservations.past.length === 0" class="reveal text-center py-12 text-[--color-on-muted] font-sans text-sm">
            Your story is just beginning.
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              v-for="(r, i) in reservations.past"
              :key="r.id"
              class="reveal group"
              :style="`transition-delay: ${i * 80}ms`"
            >
              <BaseCard>
                <div class="relative overflow-hidden rounded-t-lg aspect-[4/3]">
                  <img
                    :src="r.image || 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&q=80'"
                    :alt="r.roomName"
                    class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                  />
                  <span class="absolute top-3 left-3 flex items-center gap-1 font-sans text-xs px-2.5 py-1 rounded-lg bg-[oklch(1_0_0/0.85)] text-[--color-accent]">
                    <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1">verified</span>
                    Verified Stay
                  </span>
                </div>
                <div class="p-4">
                  <h3 class="font-serif text-base text-[--color-on-surface] mb-1">{{ r.roomName || 'Highland Cottage' }}</h3>
                  <p class="font-sans text-xs text-[--color-on-muted] mb-3">{{ r.checkIn }} — {{ r.checkOut }}</p>
                  <BaseButton variant="secondary" class="w-full justify-center text-xs py-2">
                    Rebook
                  </BaseButton>
                </div>
              </BaseCard>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

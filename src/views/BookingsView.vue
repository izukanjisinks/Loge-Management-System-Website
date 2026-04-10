<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useReservationsStore } from '@/stores/reservations'
import { useScrollReveal } from '@/composables/useScrollReveal'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

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
            <RouterLink :to="`/bookings/${r.id}`">
              <BaseCard hover>
                <div class="flex flex-col sm:flex-row gap-0">
                  <!-- Room image -->
                  <div class="relative sm:w-44 shrink-0 overflow-hidden rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none">
                    <img
                      v-if="r.roomImage"
                      :src="r.roomImage"
                      :alt="r.roomName"
                      class="w-full h-40 sm:h-full object-cover transition-transform duration-700 hover:scale-110"
                    />
                    <div
                      v-else
                      class="w-full h-40 sm:h-full bg-[--color-secondary] flex items-center justify-center"
                    >
                      <span class="material-symbols-outlined text-3xl text-[--color-outline]">image_not_supported</span>
                    </div>
                  </div>
                  <!-- Info -->
                  <div class="p-5 flex flex-col gap-3 flex-1">
                    <div class="flex items-start justify-between gap-2">
                      <h3 class="font-serif text-lg text-[--color-on-surface]">{{ r.roomName }}</h3>
                      <StatusBadge :status="r.status" />
                    </div>
                    <div class="space-y-1.5 text-sm font-sans text-[--color-on-muted]">
                      <p class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-base">calendar_today</span>
                        {{ formatDate(r.checkIn) }} → {{ formatDate(r.checkOut) }}
                        <span class="ml-auto font-medium text-[--color-on-surface]">{{ r.nights }} nights</span>
                      </p>
                      <p class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-base">group</span>
                        {{ r.guests }} {{ r.guests === 1 ? 'guest' : 'guests' }}
                      </p>
                      <p v-if="r.mealPlanName" class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-base">restaurant</span>
                        {{ r.mealPlanName }}
                      </p>
                    </div>
                    <div class="flex items-center justify-between pt-1 mt-auto border-t border-[--color-outline]/20">
                      <span class="font-sans text-sm font-semibold text-[--color-on-surface]">
                        K{{ r.totalAmount.toLocaleString() }}
                      </span>
                      <BaseButton
                        v-if="['pending', 'confirmed'].includes(r.status)"
                        variant="secondary"
                        class="text-xs px-4 py-2"
                        @click.prevent="reservations.cancel(r.id)"
                      >
                        Cancel
                      </BaseButton>
                    </div>
                  </div>
                </div>
              </BaseCard>
            </RouterLink>
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
                <div class="p-4 flex flex-col gap-2">
                  <div class="flex items-start justify-between gap-2">
                    <h3 class="font-serif text-base text-[--color-on-surface]">{{ r.roomName }}</h3>
                    <StatusBadge :status="r.status" />
                  </div>
                  <p class="font-sans text-xs text-[--color-on-muted]">
                    {{ formatDate(r.checkIn) }} — {{ formatDate(r.checkOut) }}
                  </p>
                  <p v-if="r.mealPlanName" class="font-sans text-xs text-[--color-on-muted] flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">restaurant</span>
                    {{ r.mealPlanName }}
                  </p>
                  <p class="font-sans text-sm font-semibold text-[--color-on-surface] pt-1">
                    K{{ r.totalAmount.toLocaleString() }}
                  </p>
                  <BaseButton :to="`/rooms/${r.roomId}`" variant="secondary" class="w-full justify-center text-xs py-2 mt-1">
                    Book Again
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

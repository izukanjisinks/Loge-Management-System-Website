<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useReservationsStore } from '@/stores/reservations'
import StatusBadge from '@/components/ui/StatusBadge.vue'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const reservations = useReservationsStore()
onMounted(() => reservations.fetchAll())
</script>

<template>
  <div class="max-w-[1280px] mx-auto px-5 md:px-16 py-12">

    <!-- Page Header -->
    <header class="mb-12">
      <span class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-primary) mb-2 block">
        Your Account
      </span>
      <h1 class="font-serif text-[32px] font-semibold leading-10 text-(--color-on-surface)">Your Journeys</h1>
      <p class="font-sans text-base text-(--color-on-surface-variant) mt-3 max-w-md leading-relaxed">
        Every reservation, past and present — gathered in one quiet place.
      </p>
    </header>

    <!-- Loading -->
    <div v-if="reservations.loading" class="py-32 flex flex-col items-center gap-4">
      <span class="material-symbols-outlined text-5xl text-(--color-outline) animate-spin">progress_activity</span>
      <p class="font-sans text-sm text-(--color-on-surface-variant)">Loading your reservations…</p>
    </div>

    <template v-else>

      <!-- ── Active Reservations ─────────────────────────────────────── -->
      <section class="mb-16">
        <div class="flex items-center justify-between mb-8">
          <h2 class="font-serif text-2xl text-(--color-on-surface)">Active Reservations</h2>
          <RouterLink
            to="/lodges"
            class="font-sans text-sm font-semibold text-(--color-primary) flex items-center gap-1 hover:underline"
          >
            Browse lodges
            <span class="material-symbols-outlined text-base">arrow_forward</span>
          </RouterLink>
        </div>

        <!-- Empty state -->
        <div
          v-if="reservations.active.length === 0"
          class="text-center py-20 bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant)"
        >
          <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">calendar_today</span>
          <p class="font-serif text-xl text-(--color-on-surface) mb-2">No upcoming stays</p>
          <p class="font-sans text-sm text-(--color-on-surface-variant) mb-6">Your next adventure is waiting to be planned.</p>
          <RouterLink
            to="/lodges"
            class="inline-flex items-center gap-2 bg-(--color-primary) text-white px-6 py-2.5 rounded-full font-sans text-sm font-semibold hover:bg-(--color-primary-container) transition-colors"
          >
            <span class="material-symbols-outlined text-base">search</span>
            Explore Lodges
          </RouterLink>
        </div>

        <!-- Reservation cards -->
        <div v-else class="space-y-4">
          <RouterLink
            v-for="r in reservations.active"
            :key="r.id"
            :to="`/bookings/${r.id}`"
            class="group block"
          >
            <article class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row">

              <!-- Image -->
              <div class="sm:w-52 shrink-0 overflow-hidden relative">
                <img
                  v-if="r.roomImage"
                  :src="r.roomImage"
                  :alt="r.roomName"
                  class="w-full h-44 sm:h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div
                  v-else
                  class="w-full h-44 sm:h-full bg-(--color-surface-container) flex items-center justify-center"
                >
                  <span class="material-symbols-outlined text-4xl text-(--color-outline)">image_not_supported</span>
                </div>
                <!-- Status ribbon -->
                <div class="absolute top-3 left-3">
                  <StatusBadge :status="r.status" />
                </div>
              </div>

              <!-- Content -->
              <div class="flex-1 p-6 flex flex-col gap-4">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-primary) mb-1">Reservation #{{ r.id }}</p>
                    <h3 class="font-serif text-2xl text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">{{ r.roomName }}</h3>
                  </div>
                  <p class="font-serif text-2xl text-(--color-primary) shrink-0">K{{ r.totalAmount.toLocaleString() }}</p>
                </div>

                <!-- Details row -->
                <div class="flex flex-wrap gap-x-6 gap-y-2 font-sans text-sm text-(--color-on-surface-variant)">
                  <span class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-base text-(--color-primary)">calendar_today</span>
                    {{ formatDate(r.checkIn) }} → {{ formatDate(r.checkOut) }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-base text-(--color-primary)">nights_stay</span>
                    {{ r.nights }} {{ r.nights === 1 ? 'night' : 'nights' }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-base text-(--color-primary)">group</span>
                    {{ r.guests }} {{ r.guests === 1 ? 'guest' : 'guests' }}
                  </span>
                  <span v-if="r.mealPlanName" class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-base text-(--color-primary)">restaurant</span>
                    {{ r.mealPlanName }}
                  </span>
                </div>

                <!-- Footer row -->
                <div class="flex items-center justify-between pt-4 mt-auto border-t border-(--color-outline-variant)">
                  <span class="font-sans text-xs text-(--color-on-surface-variant)">
                    View details →
                  </span>
                  <button
                    v-if="['pending', 'confirmed'].includes(r.status)"
                    class="border-2 border-(--color-primary) text-(--color-primary) px-4 py-1.5 rounded-full font-sans text-xs font-semibold hover:bg-(--color-primary) hover:text-white transition-all"
                    @click.prevent="reservations.cancel(r.id)"
                  >
                    Cancel Reservation
                  </button>
                </div>
              </div>
            </article>
          </RouterLink>
        </div>
      </section>

      <!-- ── Past Journeys ──────────────────────────────────────────── -->
      <section>
        <h2 class="font-serif text-2xl text-(--color-on-surface) mb-8">Past Journeys</h2>

        <div
          v-if="reservations.past.length === 0"
          class="text-center py-16 font-sans text-sm text-(--color-on-surface-variant) bg-(--color-surface-container-low) rounded-2xl"
        >
          Your story is just beginning.
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <article
            v-for="r in reservations.past"
            :key="r.id"
            class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden flex flex-col"
          >
            <!-- Image -->
            <div class="relative h-44 overflow-hidden">
              <img
                v-if="r.roomImage"
                :src="r.roomImage"
                :alt="r.roomName"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full bg-(--color-surface-container) flex items-center justify-center"
              >
                <span class="material-symbols-outlined text-4xl text-(--color-outline)">image_not_supported</span>
              </div>
              <div class="absolute inset-0 bg-linear-to-t from-black/50 to-transparent"></div>
              <div class="absolute bottom-3 left-3">
                <StatusBadge :status="r.status" />
              </div>
            </div>

            <!-- Content -->
            <div class="p-5 flex flex-col gap-3 flex-1">
              <h3 class="font-serif text-xl text-(--color-on-surface)">{{ r.roomName }}</h3>
              <div class="space-y-1.5 font-sans text-xs text-(--color-on-surface-variant)">
                <p class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">calendar_today</span>
                  {{ formatDate(r.checkIn) }} — {{ formatDate(r.checkOut) }}
                </p>
                <p class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">group</span>
                  {{ r.guests }} {{ r.guests === 1 ? 'guest' : 'guests' }} · {{ r.nights }} nights
                </p>
                <p v-if="r.mealPlanName" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm text-(--color-primary)">restaurant</span>
                  {{ r.mealPlanName }}
                </p>
              </div>

              <div class="flex items-center justify-between pt-3 mt-auto border-t border-(--color-outline-variant)">
                <p class="font-serif text-xl text-(--color-primary)">K{{ r.totalAmount.toLocaleString() }}</p>
                <RouterLink
                  :to="`/rooms/${r.roomId}`"
                  class="border-2 border-(--color-primary) text-(--color-primary) px-4 py-1.5 rounded-full font-sans text-xs font-semibold hover:bg-(--color-primary) hover:text-white transition-all"
                >
                  Book Again
                </RouterLink>
              </div>
            </div>
          </article>
        </div>
      </section>

    </template>
  </div>
</template>

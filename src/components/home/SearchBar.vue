<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const destination = ref('')
const checkIn     = ref('')
const checkOut    = ref('')
const guests      = ref(2)

function search() {
  router.push({
    name: 'rooms',
    query: {
      destination: destination.value || undefined,
      checkIn:     checkIn.value     || undefined,
      checkOut:    checkOut.value    || undefined,
      guests:      guests.value      || undefined,
    },
  })
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
      <div class="grid grid-cols-1 md:grid-cols-4 gap-0 items-stretch">

        <!-- Destination -->
        <div
          class="px-6 py-4 flex flex-col gap-1.5 rounded-lg hover:bg-[--color-secondary] transition-colors cursor-pointer"
        >
          <span class="font-sans text-[10px] uppercase tracking-[0.2em] font-bold text-[--color-on-muted]">
            Destination
          </span>
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[--color-primary] text-xl">location_on</span>
            <input
              v-model="destination"
              type="text"
              placeholder="Where are you going?"
              class="bg-transparent border-none outline-none font-sans font-medium text-sm text-[--color-on-surface] placeholder:text-[--color-on-muted] w-full"
            />
          </div>
        </div>

        <!-- Dates -->
        <div
          class="px-6 py-4 flex flex-col gap-1.5 rounded-lg hover:bg-[--color-secondary] transition-colors cursor-pointer
                 border-t md:border-t-0 md:border-l border-[--color-outline]/20"
        >
          <span class="font-sans text-[10px] uppercase tracking-[0.2em] font-bold text-[--color-on-muted]">
            Dates
          </span>
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[--color-primary] text-xl">calendar_today</span>
            <div class="flex items-center gap-1 font-sans font-medium text-sm text-[--color-on-surface]">
              <input
                v-model="checkIn"
                type="date"
                class="bg-transparent border-none outline-none text-sm font-sans text-[--color-on-surface] w-28"
              />
              <span class="text-[--color-on-muted]">/</span>
              <input
                v-model="checkOut"
                type="date"
                class="bg-transparent border-none outline-none text-sm font-sans text-[--color-on-surface] w-28"
              />
            </div>
          </div>
        </div>

        <!-- Guests -->
        <div
          class="px-6 py-4 flex flex-col gap-1.5 rounded-lg hover:bg-[--color-secondary] transition-colors cursor-pointer
                 border-t md:border-t-0 md:border-l border-[--color-outline]/20"
        >
          <span class="font-sans text-[10px] uppercase tracking-[0.2em] font-bold text-[--color-on-muted]">
            Guests
          </span>
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[--color-primary] text-xl">person</span>
            <div class="flex items-center gap-3">
              <button
                class="w-6 h-6 rounded-full bg-[--color-secondary] text-[--color-on-surface] text-sm font-semibold flex items-center justify-center hover:bg-[--color-outline]/20 transition-colors"
                @click="guests = Math.max(1, guests - 1)"
              >−</button>
              <span class="font-sans font-medium text-sm text-[--color-on-surface] w-12 text-center">
                {{ guests }} {{ guests === 1 ? 'guest' : 'guests' }}
              </span>
              <button
                class="w-6 h-6 rounded-full bg-[--color-secondary] text-[--color-on-surface] text-sm font-semibold flex items-center justify-center hover:bg-[--color-outline]/20 transition-colors"
                @click="guests++"
              >+</button>
            </div>
          </div>
        </div>

        <!-- Search CTA -->
        <div class="p-2">
          <button
            class="w-full h-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-light))]
                   text-white rounded-lg py-4 font-sans font-bold text-sm
                   flex items-center justify-center gap-2
                   hover:scale-[1.02] transition-transform duration-300"
            @click="search"
          >
            <span class="material-symbols-outlined text-xl">search</span>
            Explore Collection
          </button>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useScrollReveal } from '@/composables/useScrollReveal'
import api from '@/lib/api'

useScrollReveal()
const router = useRouter()

// ── Featured rooms (real data) ────────────────────────────────────────────────
const rooms        = ref([])
const roomsLoading = ref(true)

function roomImage(r) {
  return r.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80'
}

onMounted(async () => {
  try {
    const { data } = await api.get('/guest/rooms', { params: { page: 1, page_size: 3 } })
    rooms.value = (data.data ?? data).slice(0, 3)
  } catch {
    rooms.value = []
  } finally {
    roomsLoading.value = false
  }
})

function goSearch() { router.push({ name: 'lodges' }) }

const AMENITIES = [
  { icon: 'pool',         title: 'Infinity Pool', desc: 'Temperature controlled waters merging with the horizon.' },
  { icon: 'spa',          title: 'Luxury Spa',    desc: 'Curated wellness treatments for body and spirit.' },
  { icon: 'restaurant',   title: 'Fine Dining',   desc: 'Gastronomic excellence by world-class chefs.' },
  { icon: 'beach_access', title: 'Private Beach', desc: 'Exclusive access to pristine, untouched sands.' },
]
</script>

<template>
  <div>

    <!-- ══════════ HERO (slides up under the floating translucent navbar) ══════════ -->
    <section class="relative -mt-20 h-[85vh] min-h-[640px] flex items-center justify-center overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1600&q=80"
        alt="Luxury lodge suite at dusk"
        class="absolute inset-0 w-full h-full object-cover"
        loading="eager" fetchpriority="high"
      />
      <div class="absolute inset-0 bg-black/40"></div>

      <div class="relative z-10 text-center px-5 max-w-4xl w-full">
        <h1 class="font-serif text-[44px] md:text-[64px] font-bold leading-[1.05] tracking-tight text-white mb-12 drop-shadow-lg">
          Discover Your Serene Sanctuary
        </h1>

        <!-- Search widget -->
        <div class="bg-(--color-surface-container-lowest) p-3 rounded-[1.5rem] shadow-2xl flex flex-col md:flex-row items-stretch gap-3 max-w-3xl mx-auto">
          <div class="flex-1 flex flex-col md:flex-row items-stretch gap-2">
            <div class="flex-1 p-4 text-left hover:bg-(--color-surface-container-low) rounded-xl transition-colors">
              <label class="block font-sans text-xs font-medium text-(--color-on-surface-variant) uppercase tracking-wider mb-1">Check-in</label>
              <input type="text" placeholder="Add date"
                class="w-full bg-transparent border-none focus:outline-none p-0 font-sans text-sm font-semibold text-(--color-on-surface) placeholder:text-(--color-outline)" />
            </div>
            <div class="flex-1 p-4 text-left hover:bg-(--color-surface-container-low) rounded-xl transition-colors">
              <label class="block font-sans text-xs font-medium text-(--color-on-surface-variant) uppercase tracking-wider mb-1">Check-out</label>
              <input type="text" placeholder="Add date"
                class="w-full bg-transparent border-none focus:outline-none p-0 font-sans text-sm font-semibold text-(--color-on-surface) placeholder:text-(--color-outline)" />
            </div>
          </div>
          <button
            class="bg-(--color-primary) text-white px-8 py-5 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-(--color-charcoal) transition-all flex items-center justify-center gap-2"
            @click="goSearch">
            <span class="material-symbols-outlined">search</span>
            Search Rooms
          </button>
        </div>
      </div>
    </section>

    <!-- ══════════ FEATURED ACCOMMODATIONS ══════════ -->
    <section class="reveal py-24 max-w-[1280px] mx-auto px-5 md:px-16">
      <div class="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
        <div>
          <span class="font-sans text-xs font-bold tracking-[0.2em] uppercase text-(--color-primary) block mb-3">Exquisite Living</span>
          <h2 class="font-serif text-[32px] md:text-[40px] font-bold text-(--color-on-surface) leading-none">Featured Accommodations</h2>
        </div>
        <RouterLink to="/rooms"
          class="group inline-flex items-center gap-3 bg-(--color-surface-container-lowest) px-8 py-4 rounded-2xl border border-(--color-outline-variant) shadow-sm font-sans text-xs font-bold text-(--color-on-surface) uppercase tracking-wider hover:bg-(--color-primary) hover:text-white hover:border-(--color-primary) transition-all whitespace-nowrap">
          Explore All Rooms
          <span class="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
        </RouterLink>
      </div>

      <!-- Skeleton -->
      <div v-if="roomsLoading" class="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div v-for="i in 3" :key="i" class="h-[500px] rounded-[2rem] bg-(--color-surface-container-high) animate-pulse"></div>
      </div>

      <!-- Real room cards -->
      <div v-else-if="rooms.length" class="grid grid-cols-1 md:grid-cols-3 gap-10">
        <RouterLink
          v-for="room in rooms" :key="room.id"
          :to="`/rooms/${room.id}`"
          class="group relative h-[500px] rounded-[2rem] overflow-hidden shadow-xl block">
          <img :src="roomImage(room)" :alt="room.name"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div v-if="room.type"
            class="absolute top-5 left-5 z-20 bg-(--color-charcoal) text-white px-4 py-1.5 rounded-full font-sans text-xs font-semibold uppercase tracking-widest shadow-lg">
            {{ room.type }}
          </div>
          <div class="absolute inset-x-0 bottom-0 z-10 bg-(--color-surface-container-lowest)/90 backdrop-blur-sm p-6 border-t border-white/20">
            <div class="flex justify-between items-start gap-3 mb-2">
              <h3 class="font-serif text-xl font-semibold text-(--color-on-surface) leading-tight">{{ room.name }}</h3>
              <span class="shrink-0 flex items-center gap-1 font-sans text-xs font-semibold text-(--color-on-surface-variant)">
                <span class="material-symbols-outlined text-base text-(--color-primary)">group</span>
                {{ room.capacity }}
              </span>
            </div>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mb-5 line-clamp-2">
              {{ room.description || 'A comfortable and well-appointed room.' }}
            </p>
            <div class="flex justify-between items-center">
              <span class="font-sans text-xl font-bold text-(--color-on-surface)">
                K{{ Number(room.price_per_night).toLocaleString() }}<span class="text-sm font-normal text-(--color-on-surface-variant)">/night</span>
              </span>
              <span class="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-(--color-primary) group-hover:text-(--color-charcoal) transition-colors">
                Details <span class="material-symbols-outlined text-base">arrow_forward</span>
              </span>
            </div>
          </div>
        </RouterLink>
      </div>

      <!-- Empty -->
      <div v-else class="py-16 text-center bg-(--color-surface-container-lowest) rounded-2xl">
        <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">bed</span>
        <p class="font-serif text-xl text-(--color-on-surface)">No featured rooms yet</p>
        <RouterLink to="/lodges" class="inline-block mt-4 font-sans text-sm text-(--color-primary) hover:underline">Browse all lodges</RouterLink>
      </div>
    </section>

    <!-- ══════════ AMENITIES ══════════ -->
    <section class="reveal py-24">
      <div class="max-w-[1280px] mx-auto px-5 md:px-16">
        <div class="text-center mb-16">
          <span class="font-sans text-xs font-bold tracking-[0.2em] uppercase text-(--color-primary) block mb-3">The Mwakwanda Experience</span>
          <h2 class="font-serif text-[32px] md:text-[40px] font-bold text-(--color-on-surface)">World-Class Amenities</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div v-for="a in AMENITIES" :key="a.title"
            class="flex flex-col items-center text-center group bg-(--color-surface-container-low) p-8 rounded-3xl border border-transparent hover:border-(--color-primary) transition-all">
            <div class="w-20 h-20 rounded-[1.5rem] bg-(--color-surface-container-lowest) shadow-sm flex items-center justify-center mb-8 transition-transform duration-300 group-hover:scale-110 group-hover:text-(--color-primary)">
              <span class="material-symbols-outlined text-[36px]">{{ a.icon }}</span>
            </div>
            <h4 class="font-serif text-xl text-(--color-on-surface) mb-3">{{ a.title }}</h4>
            <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed">{{ a.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════ CTA ══════════ -->
    <section class="reveal relative py-32 overflow-hidden bg-(--color-charcoal)">
      <img
        src="https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1600&q=80"
        alt="" aria-hidden="true"
        class="absolute inset-0 w-full h-full object-cover opacity-20"
      />
      <div class="relative z-10 text-center text-white px-5 max-w-3xl mx-auto">
        <h2 class="font-serif text-[36px] md:text-[56px] font-bold mb-8">Begin Your Journey</h2>
        <p class="font-sans text-lg text-white/70 mb-12 leading-relaxed">
          Reservations are now open. Secure your private sanctuary today.
        </p>
        <div class="flex flex-col sm:flex-row gap-6 justify-center">
          <RouterLink to="/lodges"
            class="bg-(--color-primary) text-white px-16 py-5 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-transform">
            Reserve Now
          </RouterLink>
          <RouterLink to="/venues"
            class="bg-white/10 backdrop-blur-md border border-white/20 text-white px-16 py-5 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-(--color-charcoal) transition-all">
            Explore Venues
          </RouterLink>
        </div>
      </div>
    </section>

  </div>
</template>

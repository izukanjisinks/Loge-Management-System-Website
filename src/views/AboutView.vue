<script setup>
import { RouterLink } from 'vue-router'

const values = [
  {
    icon: 'landscape',
    title: 'Simplicity',
    body: 'Booking a stay should be easy, not stressful. We design our platform to be clear, intuitive, and effortless for both travelers and lodge owners.',
  },
  {
    icon: 'volunteer_activism',
    title: 'Connection',
    body: 'We connect people to places — and to experiences that matter. Mwakwanda bridges travelers, businesses, and local hospitality across regions.',
  },
  {
    icon: 'eco',
    title: 'Empowerment',
    body: 'We support lodge owners with tools to grow, manage, and showcase their spaces with confidence.',
  },
  {
    icon: 'workspace_premium',
    title: 'Trust & Transparency',
    body: 'From pricing to availability, what you see is what you get. We are committed to honest information and reliable bookings every time.',
  },
]

const team = [
  {
    name: 'Amara Dube',
    role: 'Founder & Chief Experience Officer',
    image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80',
    bio: 'Born in Bulawayo, Amara spent fifteen years running conservation lodges across East and Southern Africa before founding Mwakwanda.',
  },
  {
    name: 'Sipho Nkosi',
    role: 'Head of Lodge Partnerships',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',
    bio: 'A hospitality veteran with placements in Nairobi, Cape Town, and Maputo, Sipho curates every property that joins the Mwakwanda collection.',
  },
  {
    name: 'Lena Osei',
    role: 'Director of Guest Relations',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
    bio: 'Lena leads the concierge team with the belief that every traveller deserves a journey tailored entirely to their own sense of wonder.',
  },
]

const stats = [
  { value: '40+', label: 'Partner lodges' },
  { value: '12', label: 'Countries across Africa' },
  { value: '8K+', label: 'Guests hosted' },
  { value: '2018', label: 'Year founded' },
]
</script>

<template>
  <div class="bg-(--color-background)">

    <!-- ── Hero ─────────────────────────────────────────────────────── -->
    <section class="relative h-[480px] md:h-[560px] overflow-hidden">
      <img src="https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=1600&q=80"
        alt="Sweeping African savannah at golden hour" class="absolute inset-0 w-full h-full object-cover"
        loading="eager" />
      <div class="absolute inset-0 bg-linear-to-t from-black/65 via-black/25 to-transparent" />
      <div class="relative z-10 h-full flex flex-col items-center justify-end pb-14 px-5 text-center text-white">
        <!-- <p class="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-(--color-inverse-primary) mb-3">
          Our Story
        </p> -->
        <h1 class="font-serif text-4xl md:text-5xl font-bold leading-tight max-w-2xl mb-4">
          Simplifying Hospitality
        </h1>
        <p class="font-sans text-base md:text-lg text-white/80 max-w-xl leading-relaxed">
          Mwakwanda began with a simple belief — that discovering and booking the perfect stay should be simple,
          transparent, and accessible to everyone.
        </p>
      </div>
    </section>

    <!-- ── Stats bar ─────────────────────────────────────────────────── -->
    <!-- <section class="bg-(--color-surface) border-b border-(--color-outline-variant)">
      <div class="max-w-[1280px] mx-auto px-5 md:px-16 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div v-for="s in stats" :key="s.label">
          <p class="font-serif text-3xl md:text-4xl text-(--color-primary) font-semibold">{{ s.value }}</p>
          <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1">{{ s.label }}</p>
        </div>
      </div>
    </section> -->

    <!-- ── Our story ─────────────────────────────────────────────────── -->
    <section class="max-w-[1280px] mx-auto px-5 md:px-16 py-20 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
      <div>
        <h2 class="font-serif text-3xl md:text-4xl text-(--color-on-surface) font-semibold leading-tight mb-6">
          About Us
        </h2>
        <p class="font-sans text-base text-(--color-on-surface-variant) leading-relaxed mb-5">
          At Mwakwanda, we believe every journey should begin with a warm welcome. <br><br>

          Derived from the Namwanga word meaning “Welcome,” Mwakwanda is more than just a booking platform — it is a
          gateway to comfort, convenience, and authentic hospitality. We connect travelers with a wide range of lodges
          across the country, making it easy to discover, compare, and book the perfect stay in any location. <br><br>

          Whether you’re an individual traveler looking for a peaceful getaway or a corporate client arranging
          accommodation for your team, Mwakwanda simplifies the entire experience. From browsing beautiful rooms and
          checking real-time availability to making seamless bookings, everything is designed with ease and reliability
          in mind. <br><br>

          We also empower lodge owners by providing a digital platform to showcase their spaces, manage bookings, and
          deliver exceptional service to their guests. <br><br>

          At its heart, Mwakwanda is built on a simple idea:
          wherever you go, you should feel welcome. <br><br>
        </p>
        <RouterLink to="/lodges"
          class="inline-flex items-center gap-2 bg-(--color-primary) text-white px-7 py-3.5 rounded-full font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors">
          Explore Our Lodges
          <span class="material-symbols-outlined text-base">arrow_forward</span>
        </RouterLink>
      </div>
      <div class="relative h-80 lg:h-auto lg:aspect-[4/5] rounded-2xl overflow-hidden shadow-lg">
        <img src="https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80"
          alt="Lodge veranda overlooking the plains" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-linear-to-t from-black/30 to-transparent" />
      </div>
    </section>

    <!-- ── Values ────────────────────────────────────────────────────── -->
    <section class="bg-(--color-savannah-mist)">
      <div class="max-w-[1280px] mx-auto px-5 md:px-16 py-20">
        <div class="text-center mb-12">
          <p class="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-(--color-primary) mb-3">What We
            Stand For</p>
          <h2 class="font-serif text-3xl md:text-4xl text-(--color-on-surface) font-semibold">Our Values</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="v in values" :key="v.title"
            class="bg-(--color-surface) rounded-2xl p-7 border border-(--color-outline-variant) shadow-sm">
            <span class="material-symbols-outlined text-3xl text-(--color-primary) mb-4 block">{{ v.icon }}</span>
            <h3 class="font-serif text-lg text-(--color-on-surface) font-semibold mb-3">{{ v.title }}</h3>
            <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed">{{ v.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Team ──────────────────────────────────────────────────────── -->
    <!-- <section class="max-w-[1280px] mx-auto px-5 md:px-16 py-20">
      <div class="text-center mb-12">
        <p class="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-(--color-primary) mb-3">The People
        </p>
        <h2 class="font-serif text-3xl md:text-4xl text-(--color-on-surface) font-semibold">Leadership Team</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div v-for="member in team" :key="member.name" class="group text-center">
          <div
            class="w-32 h-32 rounded-full overflow-hidden mx-auto mb-5 ring-4 ring-(--color-outline-variant) group-hover:ring-(--color-primary) transition-all duration-300">
            <img :src="member.image" :alt="member.name" class="w-full h-full object-cover" />
          </div>
          <h3 class="font-serif text-xl text-(--color-on-surface) font-semibold mb-1">{{ member.name }}</h3>
          <p class="font-sans text-xs font-semibold tracking-[0.15em] uppercase text-(--color-primary) mb-3">{{
            member.role }}</p>
          <p class="font-sans text-sm text-(--color-on-surface-variant) leading-relaxed max-w-xs mx-auto">{{ member.bio
          }}</p>
        </div>
      </div>
    </section> -->

    <!-- ── CTA ───────────────────────────────────────────────────────── -->
    <!-- <section class="relative overflow-hidden">
      <img src="https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&q=80"
        alt="Tented camp under a star-lit sky" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-black/60" />
      <div class="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16 py-24 text-center text-white">
        <h2 class="font-serif text-3xl md:text-4xl font-bold mb-5 max-w-xl mx-auto leading-tight">
          Ready to Experience Mwakwanda?
        </h2>
        <p class="font-sans text-base text-white/80 max-w-lg mx-auto mb-8 leading-relaxed">
          Browse our curated collection of lodges and begin planning a journey that stays with you long after you leave.
        </p>
        <RouterLink to="/lodges"
          class="inline-flex items-center gap-2 bg-(--color-clay-earth) text-white px-8 py-4 rounded-full font-sans text-sm font-semibold hover:bg-(--color-primary) transition-colors">
          <span class="material-symbols-outlined text-base">explore</span>
          Start Exploring
        </RouterLink>
      </div>
    </section> -->

  </div>
</template>

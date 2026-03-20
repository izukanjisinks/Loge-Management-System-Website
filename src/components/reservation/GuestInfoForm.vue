<script setup>
import BaseInput from '@/components/ui/BaseInput.vue'
import { useBookingStore } from '@/stores/booking'

const booking = useBookingStore()

defineProps({
  errors: { type: Object, default: () => ({}) },
})
</script>

<template>
  <section>
    <!-- Section header -->
    <div class="flex items-center gap-4 mb-8">
      <span class="font-serif text-2xl text-[--color-primary]/40 select-none">01</span>
      <h2 class="font-serif text-2xl text-[--color-on-surface]">Guest Information</h2>
    </div>

    <div
      class="bg-[--color-surface-card] p-8 rounded-lg"
      style="box-shadow: var(--shadow-card);"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <BaseInput
          v-model="booking.guestInfo.firstName"
          label="First Name"
          required
          autocomplete="given-name"
          :error="errors.firstName"
        />
        <BaseInput
          v-model="booking.guestInfo.lastName"
          label="Last Name"
          required
          autocomplete="family-name"
          :error="errors.lastName"
        />
        <BaseInput
          v-model="booking.guestInfo.email"
          label="Email Address"
          type="email"
          required
          autocomplete="email"
          :error="errors.email"
          class="md:col-span-2"
        />
        <BaseInput
          v-model="booking.guestInfo.phone"
          label="Phone Number"
          type="tel"
          required
          autocomplete="tel"
          :error="errors.phone"
        />
        <BaseInput
          v-model="booking.guestInfo.nationality"
          label="Nationality"
          autocomplete="country-name"
        />
        <BaseInput
          v-model="booking.guestInfo.passportId"
          label="ID / Passport Number"
          class="md:col-span-2"
        />
      </div>
    </div>
  </section>
</template>

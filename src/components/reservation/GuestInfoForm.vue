<script setup>
import BaseInput from '@/components/ui/BaseInput.vue'
import { useBookingStore } from '@/stores/booking'

const booking = useBookingStore()

defineProps({
  errors: { type: Object, default: () => ({}) },
})

const COUNTRIES = [
  'Afghan', 'Albanian', 'Algerian', 'American', 'Andorran', 'Angolan', 'Argentine', 'Armenian',
  'Australian', 'Austrian', 'Azerbaijani', 'Bahamian', 'Bahraini', 'Bangladeshi', 'Barbadian',
  'Belarusian', 'Belgian', 'Belizean', 'Beninese', 'Bhutanese', 'Bolivian', 'Bosnian', 'Botswanan',
  'Brazilian', 'British', 'Bruneian', 'Bulgarian', 'Burkinabe', 'Burundian', 'Cambodian',
  'Cameroonian', 'Canadian', 'Cape Verdean', 'Central African', 'Chadian', 'Chilean', 'Chinese',
  'Colombian', 'Comorian', 'Congolese', 'Costa Rican', 'Croatian', 'Cuban', 'Cypriot', 'Czech',
  'Danish', 'Djiboutian', 'Dominican', 'Dutch', 'Ecuadorian', 'Egyptian', 'Emirati', 'Equatorial Guinean',
  'Eritrean', 'Estonian', 'Eswatini', 'Ethiopian', 'Fijian', 'Finnish', 'French', 'Gabonese',
  'Gambian', 'Georgian', 'German', 'Ghanaian', 'Greek', 'Grenadian', 'Guatemalan', 'Guinean',
  'Guyanese', 'Haitian', 'Honduran', 'Hungarian', 'Icelandic', 'Indian', 'Indonesian', 'Iranian',
  'Iraqi', 'Irish', 'Israeli', 'Italian', 'Ivorian', 'Jamaican', 'Japanese', 'Jordanian',
  'Kazakhstani', 'Kenyan', 'Kuwaiti', 'Kyrgyz', 'Laotian', 'Latvian', 'Lebanese', 'Lesothan',
  'Liberian', 'Libyan', 'Liechtensteiner', 'Lithuanian', 'Luxembourgish', 'Malagasy', 'Malawian',
  'Malaysian', 'Maldivian', 'Malian', 'Maltese', 'Mauritanian', 'Mauritian', 'Mexican', 'Moldovan',
  'Monacan', 'Mongolian', 'Montenegrin', 'Moroccan', 'Mozambican', 'Namibian', 'Nepalese',
  'New Zealander', 'Nicaraguan', 'Nigerian', 'Nigerien', 'North Korean', 'North Macedonian',
  'Norwegian', 'Omani', 'Pakistani', 'Panamanian', 'Papua New Guinean', 'Paraguayan', 'Peruvian',
  'Philippine', 'Polish', 'Portuguese', 'Qatari', 'Romanian', 'Russian', 'Rwandan', 'Salvadoran',
  'Samoan', 'Saudi', 'Senegalese', 'Serbian', 'Sierra Leonean', 'Singaporean', 'Slovak', 'Slovenian',
  'Somali', 'South African', 'South Korean', 'South Sudanese', 'Spanish', 'Sri Lankan', 'Sudanese',
  'Surinamese', 'Swedish', 'Swiss', 'Syrian', 'Taiwanese', 'Tajik', 'Tanzanian', 'Thai', 'Togolese',
  'Trinidadian', 'Tunisian', 'Turkish', 'Turkmen', 'Ugandan', 'Ukrainian', 'Uruguayan', 'Uzbek',
  'Venezuelan', 'Vietnamese', 'Yemeni', 'Zambian', 'Zimbabwean',
]
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
        <div class="flex flex-col gap-1">
          <label class="font-sans text-xs font-semibold tracking-widest uppercase text-[--color-on-muted]">
            Nationality
          </label>
          <select
            v-model="booking.guestInfo.nationality"
            autocomplete="country-name"
            class="w-full bg-transparent border-0 border-b border-[--color-outline]
                   py-2.5 font-sans text-sm text-[--color-on-surface]
                   focus:outline-none focus:border-[--color-primary] transition-colors duration-200
                   cursor-pointer"
          >
            <option value="" disabled>Select nationality</option>
            <option v-for="country in COUNTRIES" :key="country" :value="country">{{ country }}</option>
          </select>
        </div>
        <BaseInput
          v-model="booking.guestInfo.passportId"
          label="ID / Passport Number"
          class="md:col-span-2"
        />
      </div>
    </div>
  </section>
</template>

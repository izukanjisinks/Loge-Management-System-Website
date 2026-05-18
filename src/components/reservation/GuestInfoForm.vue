<script setup>
import { ref, computed } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/index'
import { useBookingStore } from '@/stores/booking'

const booking = useBookingStore()

defineProps({
  errors: { type: Object, default: () => ({}) },
})

const nationalityOpen  = ref(false)
const nationalityQuery = ref('')

const filteredCountries = computed(() => {
  const q = nationalityQuery.value.toLowerCase()
  if (!q) return COUNTRIES
  return COUNTRIES.filter(c => c.toLowerCase().includes(q))
})

function selectNationality(country) {
  booking.guestInfo.nationality = country
  nationalityOpen.value  = false
  nationalityQuery.value = ''
}

const COUNTRIES = [
  'Afghan', 'Albanian', 'Algerian', 'American', 'Andorran', 'Angolan', 'Argentine', 'Armenian',
  'Australian', 'Austrian', 'Azerbaijani', 'Bahamian', 'Bahraini', 'Bangladeshi', 'Barbadian',
  'Belarusian', 'Belgian', 'Belizean', 'Beninese', 'Bhutanese', 'Bolivian', 'Bosnian', 'Botswanan',
  'Brazilian', 'British', 'Bruneian', 'Bulgarian', 'Burkinabe', 'Burundian', 'Cambodian',
  'Cameroonian', 'Canadian', 'Cape Verdean', 'Central African', 'Chadian', 'Chilean', 'Chinese',
  'Colombian', 'Comorian', 'Congolese', 'Costa Rican', 'Croatian', 'Cuban', 'Cypriot', 'Czech',
  'Danish', 'Djiboutian', 'Dominican', 'Dutch', 'Ecuadorian', 'Egyptian', 'Emirati',
  'Eritrean', 'Estonian', 'Ethiopian', 'Fijian', 'Finnish', 'French', 'Gabonese',
  'Gambian', 'Georgian', 'German', 'Ghanaian', 'Greek', 'Guatemalan', 'Guinean',
  'Guyanese', 'Haitian', 'Honduran', 'Hungarian', 'Icelandic', 'Indian', 'Indonesian', 'Iranian',
  'Iraqi', 'Irish', 'Israeli', 'Italian', 'Ivorian', 'Jamaican', 'Japanese', 'Jordanian',
  'Kazakhstani', 'Kenyan', 'Kuwaiti', 'Kyrgyz', 'Laotian', 'Latvian', 'Lebanese', 'Lesothan',
  'Liberian', 'Libyan', 'Lithuanian', 'Luxembourgish', 'Malagasy', 'Malawian',
  'Malaysian', 'Maldivian', 'Malian', 'Maltese', 'Mauritanian', 'Mauritian', 'Mexican', 'Moldovan',
  'Mongolian', 'Montenegrin', 'Moroccan', 'Mozambican', 'Namibian', 'Nepalese',
  'New Zealander', 'Nicaraguan', 'Nigerian', 'Nigerien', 'North Korean',
  'Norwegian', 'Omani', 'Pakistani', 'Panamanian', 'Paraguayan', 'Peruvian',
  'Philippine', 'Polish', 'Portuguese', 'Qatari', 'Romanian', 'Russian', 'Rwandan', 'Salvadoran',
  'Samoan', 'Saudi', 'Senegalese', 'Serbian', 'Sierra Leonean', 'Singaporean', 'Slovak', 'Slovenian',
  'Somali', 'South African', 'South Korean', 'South Sudanese', 'Spanish', 'Sri Lankan', 'Sudanese',
  'Surinamese', 'Swedish', 'Swiss', 'Syrian', 'Taiwanese', 'Tajik', 'Tanzanian', 'Thai', 'Togolese',
  'Trinidadian', 'Tunisian', 'Turkish', 'Turkmen', 'Ugandan', 'Ukrainian', 'Uruguayan', 'Uzbek',
  'Venezuelan', 'Vietnamese', 'Yemeni', 'Zambian', 'Zimbabwean',
]
</script>

<template>
  <section class="bg-(--color-surface-container-lowest) p-8 rounded-xl border border-(--color-savannah-mist) shadow-sm">
    <h2 class="font-serif text-2xl mb-6 flex items-center gap-3">
      <span class="material-symbols-outlined text-(--color-primary)">person_outline</span>
      Primary Guest Details
    </h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <BaseInput
        v-model="booking.guestInfo.firstName"
        label="First Name"
        placeholder="e.g. Tendai"
        required
        autocomplete="given-name"
        :error="errors.firstName"
      />
      <BaseInput
        v-model="booking.guestInfo.lastName"
        label="Last Name"
        placeholder="e.g. Mokoena"
        required
        autocomplete="family-name"
        :error="errors.lastName"
      />
      <BaseInput
        v-model="booking.guestInfo.email"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        required
        autocomplete="email"
        :error="errors.email"
      />
      <BaseInput
        v-model="booking.guestInfo.phone"
        label="Phone Number"
        type="tel"
        placeholder="+260 00 000 0000"
        required
        autocomplete="tel"
        :error="errors.phone"
      />

      <!-- Nationality -->
      <div class="flex flex-col gap-2">
        <label class="font-sans text-xs font-semibold tracking-[0.05em] uppercase text-(--color-on-surface-variant)">
          Nationality
        </label>
        <Popover v-model:open="nationalityOpen">
          <PopoverTrigger as-child>
            <button
              type="button"
              class="w-full bg-(--color-savannah-mist) rounded-lg px-3 py-3 flex items-center justify-between gap-2 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all"
              :class="booking.guestInfo.nationality ? 'text-(--color-on-surface)' : 'text-(--color-outline)'"
            >
              {{ booking.guestInfo.nationality || 'Select nationality' }}
              <span class="material-symbols-outlined text-base text-(--color-outline)">unfold_more</span>
            </button>
          </PopoverTrigger>
          <PopoverContent class="w-72 p-0 overflow-hidden" align="start">
            <!-- Search input -->
            <div class="flex items-center gap-2 px-3 py-2 border-b border-(--color-outline-variant)">
              <span class="material-symbols-outlined text-base text-(--color-outline)">search</span>
              <input
                v-model="nationalityQuery"
                type="text"
                placeholder="Search nationality…"
                class="flex-1 bg-transparent font-sans text-sm text-(--color-on-surface) placeholder:text-(--color-outline) focus:outline-none"
                autofocus
              />
            </div>
            <!-- Options list -->
            <ul class="max-h-56 overflow-y-auto py-1" style="scrollbar-gutter: stable; padding-right: 4px;">
              <li
                v-for="country in filteredCountries"
                :key="country"
                class="flex items-center gap-2 px-3 py-2 font-sans text-sm cursor-pointer hover:bg-(--color-surface-container) transition-colors"
                :class="booking.guestInfo.nationality === country ? 'text-(--color-primary) font-semibold' : 'text-(--color-on-surface)'"
                @click="selectNationality(country)"
              >
                <span
                  class="material-symbols-outlined text-base"
                  :class="booking.guestInfo.nationality === country ? 'opacity-100' : 'opacity-0'"
                >check</span>
                {{ country }}
              </li>
              <li v-if="filteredCountries.length === 0" class="px-3 py-4 text-center font-sans text-sm text-(--color-outline)">
                No results
              </li>
            </ul>
          </PopoverContent>
        </Popover>
      </div>

      <BaseInput
        v-model="booking.guestInfo.passportId"
        label="ID / Passport Number"
        placeholder="Optional"
      />
    </div>
  </section>
</template>

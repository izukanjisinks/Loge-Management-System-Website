<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BaseInput  from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const auth   = useAuthStore()

const form    = ref({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' })
const showPass    = ref(false)
const showConfirm = ref(false)
const error       = ref('')
const loading     = ref(false)
const fieldErrors = ref({})

const MIN_PASSWORD = 8

function validate() {
  const e = {}
  if (!form.value.firstName)  e.firstName = 'Required'
  if (!form.value.lastName)   e.lastName  = 'Required'
  if (!form.value.email)               e.email    = 'Email is required'
  else if (!/\S+@\S+\.\S+/.test(form.value.email)) e.email = 'Enter a valid email'
  if (!form.value.phone)               e.phone    = 'Phone number is required'
  if (!form.value.password)            e.password = 'Password is required'
  else if (form.value.password.length < MIN_PASSWORD) e.password = `Minimum ${MIN_PASSWORD} characters`
  if (!form.value.confirm)             e.confirm  = 'Please confirm your password'
  else if (form.value.confirm !== form.value.password) e.confirm = 'Passwords do not match'
  fieldErrors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  if (!validate()) return
  error.value   = ''
  loading.value = true
  try {
    await auth.register({
      full_name: `${form.value.firstName} ${form.value.lastName}`.trim(),
      email:     form.value.email,
      phone:     form.value.phone,
      password:  form.value.password,
    })
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Registration failed. Please try again.'
  } finally {
    loading.value = false
  }
}

// Password strength indicator
function passwordStrength(pw) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}
const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong']
const strengthColor = ['', 'bg-[--color-error]', 'bg-[oklch(0.65_0.10_70)]', 'bg-[oklch(0.65_0.10_100)]', 'bg-[--color-accent]', 'bg-[--color-accent]']
</script>

<template>
  <div class="w-full">
    <div
      class="rounded-2xl bg-[--color-surface-card]/70 backdrop-blur-xl p-8 md:p-10"
      style="border: 1px solid oklch(0.80 0.03 60 / 0.35); box-shadow: 0px 24px 48px oklch(0.18 0.02 45 / 0.10);"
    >
    <!-- Heading -->
    <div class="mb-8">
      <p class="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-[--color-primary] mb-2">
        New here?
      </p>
      <h1 class="font-serif text-3xl text-[--color-on-surface]">Create your account</h1>
      <p class="font-sans text-sm text-[--color-on-muted] mt-2">Begin your first journey with Mwakanda.</p>
    </div>

    <form class="space-y-5" novalidate @submit.prevent="submit">

      <div class="grid grid-cols-2 gap-4">
        <BaseInput v-model="form.firstName" label="First Name" required :error="fieldErrors.firstName" autocomplete="given-name" />
        <BaseInput v-model="form.lastName"  label="Last Name"  required :error="fieldErrors.lastName"  autocomplete="family-name" />
      </div>

      <BaseInput
        v-model="form.email"
        label="Email"
        type="email"
        placeholder="your@email.com"
        required
        :error="fieldErrors.email"
        autocomplete="email"
      />

      <BaseInput
        v-model="form.phone"
        label="Phone"
        type="tel"
        placeholder="+260971234567"
        required
        :error="fieldErrors.phone"
        autocomplete="tel"
      />

      <!-- Password with strength meter -->
      <div class="flex flex-col gap-1">
        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-[--color-on-muted]">
          Password <span class="text-[--color-error]">*</span>
        </label>
        <div class="relative">
          <input
            v-model="form.password"
            :type="showPass ? 'text' : 'password'"
            placeholder="Min 8 characters"
            autocomplete="new-password"
            class="w-full bg-transparent border-0 border-b border-[--color-outline]
                   py-2.5 pr-10 font-sans text-sm text-[--color-on-surface]
                   placeholder:text-[--color-on-muted]
                   focus:outline-none focus:border-[--color-primary] transition-colors duration-200"
          />
          <button
            type="button"
            class="absolute right-0 top-1/2 -translate-y-1/2 text-[--color-on-muted] hover:text-[--color-on-surface] transition-colors"
            @click="showPass = !showPass"
          >
            <span class="material-symbols-outlined text-xl">{{ showPass ? 'visibility_off' : 'visibility' }}</span>
          </button>
        </div>

        <!-- Strength bar -->
        <div v-if="form.password" class="flex items-center gap-2 mt-1.5">
          <div class="flex gap-1 flex-1">
            <div
              v-for="n in 5"
              :key="n"
              class="h-1 flex-1 rounded-full transition-all duration-300"
              :class="n <= passwordStrength(form.password)
                ? strengthColor[passwordStrength(form.password)]
                : 'bg-[--color-outline]'"
            />
          </div>
          <span class="font-sans text-xs text-[--color-on-muted] w-16 text-right">
            {{ strengthLabel[passwordStrength(form.password)] }}
          </span>
        </div>

        <span v-if="fieldErrors.password" class="font-sans text-xs text-[--color-error] mt-0.5">
          {{ fieldErrors.password }}
        </span>
      </div>

      <!-- Confirm password -->
      <div class="flex flex-col gap-1">
        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-[--color-on-muted]">
          Confirm Password <span class="text-[--color-error]">*</span>
        </label>
        <div class="relative">
          <input
            v-model="form.confirm"
            :type="showConfirm ? 'text' : 'password'"
            placeholder="Repeat password"
            autocomplete="new-password"
            class="w-full bg-transparent border-0 border-b border-[--color-outline]
                   py-2.5 pr-10 font-sans text-sm text-[--color-on-surface]
                   placeholder:text-[--color-on-muted]
                   focus:outline-none focus:border-[--color-primary] transition-colors duration-200"
          />
          <button
            type="button"
            class="absolute right-0 top-1/2 -translate-y-1/2 text-[--color-on-muted] hover:text-[--color-on-surface] transition-colors"
            @click="showConfirm = !showConfirm"
          >
            <span class="material-symbols-outlined text-xl">{{ showConfirm ? 'visibility_off' : 'visibility' }}</span>
          </button>
        </div>
        <span v-if="fieldErrors.confirm" class="font-sans text-xs text-[--color-error] mt-0.5">
          {{ fieldErrors.confirm }}
        </span>
      </div>

      <!-- Server error -->
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
      >
        <div
          v-if="error"
          class="flex items-start gap-2 p-3 rounded-lg bg-[oklch(0.95_0.02_25)] text-[--color-error]"
        >
          <span class="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
          <p class="font-sans text-sm">{{ error }}</p>
        </div>
      </Transition>

      <BaseButton
        type="submit"
        variant="primary"
        class="w-full justify-center py-3.5 mt-2"
        :class="loading && 'opacity-70 pointer-events-none'"
      >
        <span v-if="loading" class="material-symbols-outlined text-base" style="animation: spin 1s linear infinite">progress_activity</span>
        <span v-else>Create Account</span>
      </BaseButton>

      <p class="font-sans text-xs text-[--color-on-muted] text-center leading-relaxed">
        By creating an account you agree to our
        <a href="#" class="text-[--color-primary] hover:underline">Terms of Service</a>
        and
        <a href="#" class="text-[--color-primary] hover:underline">Privacy Policy</a>.
      </p>
    </form>

    <p class="font-sans text-sm text-[--color-on-muted] text-center mt-8">
      Already have an account?
      <RouterLink to="/login" class="text-[--color-primary] font-semibold hover:underline ml-1">
        Sign in
      </RouterLink>
    </p>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }
</style>
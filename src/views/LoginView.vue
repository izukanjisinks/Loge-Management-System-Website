<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BaseInput  from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const email       = ref('')
const password    = ref('')
const showPass    = ref(false)
const error       = ref('')
const loading     = ref(false)

const fieldErrors = ref({ email: '', password: '' })

function validate() {
  const e = { email: '', password: '' }
  if (!email.value)              e.email    = 'Email is required'
  else if (!/\S+@\S+\.\S+/.test(email.value)) e.email = 'Enter a valid email'
  if (!password.value)           e.password = 'Password is required'
  fieldErrors.value = e
  return !e.email && !e.password
}

async function submit() {
  if (!validate()) return
  error.value   = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Incorrect email or password. Please try again.'
  } finally {
    loading.value = false
  }
}
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
        Welcome back
      </p>
      <h1 class="font-serif text-3xl text-[--color-on-surface]">Sign in to your account</h1>
    </div>

    <form class="space-y-6" novalidate @submit.prevent="submit">
      <BaseInput
        v-model="email"
        label="Email"
        type="email"
        placeholder="your@email.com"
        required
        :error="fieldErrors.email"
        autocomplete="email"
      />

      <!-- Password with show/hide toggle -->
      <div class="flex flex-col gap-1">
        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-[--color-on-muted]">
          Password <span class="text-[--color-error]">*</span>
        </label>
        <div class="relative">
          <input
            v-model="password"
            :type="showPass ? 'text' : 'password'"
            placeholder="••••••••"
            autocomplete="current-password"
            class="w-full bg-transparent border-0 border-b border-[--color-outline]
                   py-2.5 pr-10 font-sans text-sm text-[--color-on-surface]
                   placeholder:text-[--color-on-muted]
                   focus:outline-none focus:border-[--color-primary] transition-colors duration-200"
          />
          <button
            type="button"
            class="absolute right-0 top-1/2 -translate-y-1/2 text-[--color-on-muted]
                   hover:text-[--color-on-surface] transition-colors"
            :aria-label="showPass ? 'Hide password' : 'Show password'"
            @click="showPass = !showPass"
          >
            <span class="material-symbols-outlined text-xl">{{ showPass ? 'visibility_off' : 'visibility' }}</span>
          </button>
        </div>
        <span v-if="fieldErrors.password" class="font-sans text-xs text-[--color-error] mt-0.5">
          {{ fieldErrors.password }}
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
        <span v-else>Sign In</span>
      </BaseButton>
    </form>

    <p class="font-sans text-sm text-[--color-on-muted] text-center mt-8">
      No account yet?
      <RouterLink to="/register" class="text-[--color-primary] font-semibold hover:underline ml-1">
        Create one
      </RouterLink>
    </p>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }
</style>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BaseInput  from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import api from '@/lib/api'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const redirectNotice = computed(() => {
  if (route.query.reason === 'session') return 'Your session has expired. Please sign in to continue.'
  if (route.query.reason === 'auth')    return 'Please sign in to access that page.'
  return null
})

// ── Login state ───────────────────────────────────────────────────────
const email       = ref('')
const password    = ref('')
const showPass    = ref(false)
const error       = ref('')
const loading     = ref(false)
const fieldErrors = ref({ email: '', password: '' })

function validateLogin() {
  const e = { email: '', password: '' }
  if (!email.value)                            e.email    = 'Email is required'
  else if (!/\S+@\S+\.\S+/.test(email.value)) e.email    = 'Enter a valid email'
  if (!password.value)                         e.password = 'Password is required'
  fieldErrors.value = e
  return !e.email && !e.password
}

async function submit() {
  if (!validateLogin()) return
  error.value   = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push(route.query.redirect || '/')
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Incorrect email or password. Please try again.'
  } finally {
    loading.value = false
  }
}

// ── Reset-password state ──────────────────────────────────────────────
const mode         = ref('login') // 'login' | 'reset'
const resetEmail   = ref('')
const resetSuccess = ref(false)
const resetError   = ref('')
const resetLoading = ref(false)
const resetEmailError = ref('')

function openReset() {
  resetEmail.value      = email.value
  resetSuccess.value    = false
  resetError.value      = ''
  resetEmailError.value = ''
  mode.value = 'reset'
}

function backToLogin() {
  mode.value = 'login'
}

async function submitReset() {
  resetEmailError.value = ''
  resetError.value      = ''
  if (!resetEmail.value) {
    resetEmailError.value = 'Email is required'
    return
  }
  if (!/\S+@\S+\.\S+/.test(resetEmail.value)) {
    resetEmailError.value = 'Enter a valid email'
    return
  }

  resetLoading.value = true
  try {
    await api.post('/guest/auth/reset-password', { email: resetEmail.value })
    resetSuccess.value = true
  } catch {
    resetError.value = 'Something went wrong. Please try again.'
  } finally {
    resetLoading.value = false
  }
}
</script>

<template>
  <div class="w-full">

    <!-- ── Login form ─────────────────────────────────────────────── -->
    <template v-if="mode === 'login'">
      <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0">
        <div
          v-if="redirectNotice"
          class="flex items-start gap-2.5 p-3.5 rounded-lg bg-(--color-secondary-container) text-(--color-on-secondary-container) mb-6"
        >
          <span class="material-symbols-outlined text-base shrink-0 mt-0.5">info</span>
          <p class="font-sans text-sm leading-snug">{{ redirectNotice }}</p>
        </div>
      </Transition>

      <div class="mb-8">
        <p class="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-(--color-primary) mb-2">
          Welcome back
        </p>
        <h1 class="font-serif text-3xl text-(--color-on-surface)">Sign in to your account</h1>
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

        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
              Password <span class="text-(--color-error)">*</span>
            </label>
            <button
              type="button"
              class="font-sans text-xs text-(--color-primary) hover:underline"
              @click="openReset"
            >
              Forgot password?
            </button>
          </div>
          <div class="relative">
            <input
              v-model="password"
              :type="showPass ? 'text' : 'password'"
              placeholder="Enter your password"
              autocomplete="current-password"
              class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 pr-10
                     font-sans text-sm text-(--color-on-surface)
                     placeholder:text-(--color-on-surface-variant)
                     focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20 transition-all duration-200"
            />
            <button
              type="button"
              class="absolute right-3 top-[50%] -translate-y-1/2 text-(--color-on-surface-variant) hover:text-(--color-on-surface) transition-colors"
              :aria-label="showPass ? 'Hide password' : 'Show password'"
              @click="showPass = !showPass"
            >
              <span class="material-symbols-outlined text-xl">{{ showPass ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
          <span v-if="fieldErrors.password" class="font-sans text-xs text-(--color-error) mt-0.5">
            {{ fieldErrors.password }}
          </span>
        </div>

        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
          <div v-if="error" class="flex items-start gap-2 p-3 rounded-lg bg-(--color-error-container) text-(--color-on-error-container)">
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
          <span v-if="loading" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
          <span v-else>Sign In</span>
        </BaseButton>
      </form>

      <p class="font-sans text-sm text-(--color-on-surface-variant) text-center mt-8">
        No account yet?
        <RouterLink to="/register" class="text-(--color-primary) font-semibold hover:underline ml-1">
          Create one
        </RouterLink>
      </p>
    </template>

    <!-- ── Forgot password form ───────────────────────────────────── -->
    <template v-else>
      <button
        type="button"
        class="flex items-center gap-1.5 font-sans text-sm text-(--color-on-surface-variant) hover:text-(--color-on-surface) transition-colors mb-8"
        @click="backToLogin"
      >
        <span class="material-symbols-outlined text-base">arrow_back</span>
        Back to sign in
      </button>

      <div class="mb-8">
        <p class="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-(--color-primary) mb-2">
          Account Recovery
        </p>
        <h1 class="font-serif text-3xl text-(--color-on-surface)">Reset your password</h1>
        <p class="font-sans text-sm text-(--color-on-surface-variant) mt-2 leading-relaxed">
          Enter your email and we'll send you a new password instantly.
        </p>
      </div>

      <!-- Success state -->
      <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
        <div v-if="resetSuccess" class="flex flex-col items-center gap-3 py-10 text-center">
          <span class="material-symbols-outlined text-5xl text-(--color-primary)">mark_email_read</span>
          <p class="font-serif text-xl text-(--color-on-surface)">Check your inbox</p>
          <p class="font-sans text-sm text-(--color-on-surface-variant) max-w-xs leading-relaxed">
            A new password has been sent to <strong>{{ resetEmail }}</strong>. Use it to sign in, then change it in your profile.
          </p>
          <button
            class="mt-4 font-sans text-sm font-semibold text-(--color-primary) hover:underline"
            @click="backToLogin"
          >
            Go to sign in
          </button>
        </div>
      </Transition>

      <form v-if="!resetSuccess" class="space-y-5" novalidate @submit.prevent="submitReset">
        <BaseInput
          v-model="resetEmail"
          label="Email address"
          type="email"
          placeholder="your@email.com"
          required
          :error="resetEmailError"
          autocomplete="email"
        />

        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
          <div v-if="resetError" class="flex items-start gap-2 p-3 rounded-lg bg-(--color-error-container) text-(--color-on-error-container)">
            <span class="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
            <p class="font-sans text-sm">{{ resetError }}</p>
          </div>
        </Transition>

        <BaseButton
          type="submit"
          variant="primary"
          class="w-full justify-center py-3.5"
          :class="resetLoading && 'opacity-70 pointer-events-none'"
        >
          <span v-if="resetLoading" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
          <span v-else>Send New Password</span>
        </BaseButton>
      </form>
    </template>

  </div>
</template>

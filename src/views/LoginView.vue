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
    <!-- Heading -->
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

      <!-- Password with show/hide toggle -->
      <div class="flex flex-col gap-1">
        <label class="font-sans text-xs font-semibold tracking-widest uppercase text-(--color-on-surface-variant)">
          Password <span class="text-(--color-error)">*</span>
        </label>
        <div class="relative">
          <input
            v-model="password"
            :type="showPass ? 'text' : 'password'"
            placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
            autocomplete="current-password"
            class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 pr-10
                   font-sans text-sm text-(--color-on-surface)
                   placeholder:text-(--color-on-surface-variant)
                   focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20 transition-all duration-200"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-on-surface-variant)
                   hover:text-(--color-on-surface) transition-colors"
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

      <!-- Server error -->
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
      >
        <div
          v-if="error"
          class="flex items-start gap-2 p-3 rounded-lg bg-(--color-error-container) text-(--color-on-error-container)"
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
  </div>
</template>

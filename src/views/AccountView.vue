<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// ── Profile section ────────────────────────────────────────────────────────
const editingProfile = ref(false)
const profileLoading = ref(false)
const profileSuccess = ref(false)
const profileError   = ref('')

const profileForm = ref({
  full_name: auth.user?.full_name ?? '',
  phone:     auth.user?.phone     ?? '',
})

const profileErrors = ref({})

function openProfileEdit() {
  profileForm.value = { full_name: auth.user?.full_name ?? '', phone: auth.user?.phone ?? '' }
  profileErrors.value = {}
  profileError.value  = ''
  profileSuccess.value = false
  editingProfile.value = true
}

function cancelProfileEdit() { editingProfile.value = false }

function validateProfile() {
  const e = {}
  if (!profileForm.value.full_name.trim()) e.full_name = 'Name is required'
  profileErrors.value = e
  return Object.keys(e).length === 0
}

async function saveProfile() {
  if (!validateProfile()) return
  profileLoading.value = true
  profileError.value   = ''
  try {
    await auth.updateProfile({
      full_name: profileForm.value.full_name.trim(),
      phone:     profileForm.value.phone.trim(),
    })
    profileSuccess.value = true
    editingProfile.value = false
  } catch (e) {
    profileError.value = e.response?.data?.error?.message || 'Failed to update profile. Please try again.'
  } finally {
    profileLoading.value = false
  }
}

// ── Change password section ────────────────────────────────────────────────
const pwForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwErrors      = ref({})
const pwLoading     = ref(false)
const pwSuccess     = ref(false)
const pwError       = ref('')
const showOldPw     = ref(false)
const showNewPw     = ref(false)
const showConfirmPw = ref(false)

const MIN_PW = 8

function validatePw() {
  const e = {}
  if (!pwForm.value.oldPassword)  e.oldPassword = 'Current password is required'
  if (!pwForm.value.newPassword)  e.newPassword = 'New password is required'
  else if (pwForm.value.newPassword.length < MIN_PW) e.newPassword = `Minimum ${MIN_PW} characters`
  if (!pwForm.value.confirmPassword) e.confirmPassword = 'Please confirm your new password'
  else if (pwForm.value.confirmPassword !== pwForm.value.newPassword) e.confirmPassword = 'Passwords do not match'
  pwErrors.value = e
  return Object.keys(e).length === 0
}

async function changePassword() {
  if (!validatePw()) return
  pwLoading.value = true
  pwError.value   = ''
  pwSuccess.value = false
  try {
    await auth.changePassword(pwForm.value.oldPassword, pwForm.value.newPassword)
    pwSuccess.value = true
    pwForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    pwErrors.value = {}
  } catch (e) {
    pwError.value = e.response?.data?.error?.message || 'Incorrect current password or an error occurred.'
  } finally {
    pwLoading.value = false
  }
}

function passwordStrength(pw) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8)            score++
  if (pw.length >= 12)           score++
  if (/[A-Z]/.test(pw))         score++
  if (/[0-9]/.test(pw))         score++
  if (/[^A-Za-z0-9]/.test(pw))  score++
  return score
}
const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong']
const strengthColor = [
  '', 'bg-(--color-error)', 'bg-(--color-secondary)', 'bg-(--color-tertiary)',
  'bg-(--color-primary)', 'bg-(--color-primary)',
]

const initials = computed(() => {
  const n = auth.user?.full_name ?? ''
  return n.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
})
</script>

<template>
  <div class="w-full max-w-[1280px] mx-auto px-5 md:px-16 py-10 pb-24">

    <!-- Header -->
    <div class="mb-10">
      <h1 class="font-serif text-3xl text-(--color-on-surface)">My Account</h1>
      <p class="font-sans text-sm text-(--color-on-surface-variant) mt-1">Manage your profile and security settings.</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

      <!-- ── Left: Profile card ───────────────────────────────────────────── -->
      <div class="lg:col-span-2 space-y-6">

        <!-- Profile info -->
        <div class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden">
          <div class="px-6 py-5 border-b border-(--color-outline-variant) flex items-center justify-between">
            <h2 class="font-serif text-lg text-(--color-on-surface)">Personal Information</h2>
            <button v-if="!editingProfile" type="button"
              class="flex items-center gap-1.5 font-sans text-sm font-semibold text-(--color-primary) hover:underline transition-colors"
              @click="openProfileEdit">
              <span class="material-symbols-outlined text-base">edit</span>
              Edit
            </button>
          </div>

          <!-- View mode -->
          <div v-if="!editingProfile" class="p-6">
            <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
              <div v-if="profileSuccess" class="flex items-center gap-2 mb-5 p-3 rounded-lg bg-(--color-primary-container)">
                <span class="material-symbols-outlined text-base text-(--color-primary)" style="font-variation-settings:'FILL' 1">check_circle</span>
                <p class="font-sans text-sm text-(--color-primary) font-semibold">Profile updated successfully.</p>
              </div>
            </Transition>
            <div class="flex items-center gap-5 mb-6">
              <div class="w-16 h-16 rounded-full bg-(--color-primary) flex items-center justify-center shrink-0">
                <span class="font-serif text-2xl text-white font-bold">{{ initials }}</span>
              </div>
              <div>
                <p class="font-serif text-xl text-(--color-on-surface)">{{ auth.user?.full_name }}</p>
                <p class="font-sans text-sm text-(--color-on-surface-variant) mt-0.5">{{ auth.user?.email }}</p>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="bg-(--color-savannah-mist) rounded-xl p-4">
                <p class="font-sans text-xs text-(--color-on-surface-variant) uppercase tracking-wider font-semibold mb-1">Full Name</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ auth.user?.full_name || '—' }}</p>
              </div>
              <div class="bg-(--color-savannah-mist) rounded-xl p-4">
                <p class="font-sans text-xs text-(--color-on-surface-variant) uppercase tracking-wider font-semibold mb-1">Email</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ auth.user?.email || '—' }}</p>
              </div>
              <div class="bg-(--color-savannah-mist) rounded-xl p-4">
                <p class="font-sans text-xs text-(--color-on-surface-variant) uppercase tracking-wider font-semibold mb-1">Phone</p>
                <p class="font-sans text-sm text-(--color-on-surface)">{{ auth.user?.phone || '—' }}</p>
              </div>
            </div>
          </div>

          <!-- Edit mode -->
          <form v-else class="p-6 space-y-5" @submit.prevent="saveProfile">
            <div class="space-y-1">
              <label class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">
                Full Name <span class="text-(--color-error)">*</span>
              </label>
              <input v-model="profileForm.full_name" type="text" placeholder="Your full name"
                :class="profileErrors.full_name ? 'ring-2 ring-(--color-error)' : 'focus:ring-2 focus:ring-(--color-primary)'"
                class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) focus:outline-none transition-all" />
              <p v-if="profileErrors.full_name" class="font-sans text-xs text-(--color-error)">{{ profileErrors.full_name }}</p>
            </div>

            <div class="space-y-1">
              <label class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">
                Email <span class="font-normal normal-case tracking-normal text-(--color-on-surface-variant)">(read-only)</span>
              </label>
              <input :value="auth.user?.email" type="email" disabled
                class="w-full bg-(--color-surface-container) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface-variant) cursor-not-allowed" />
            </div>

            <div class="space-y-1">
              <label class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">Phone</label>
              <input v-model="profileForm.phone" type="tel" placeholder="+260 97 000 0000"
                class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 font-sans text-sm text-(--color-on-surface) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition-all" />
            </div>

            <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
              <div v-if="profileError" class="flex items-start gap-2 p-3 rounded-lg bg-(--color-error-container)">
                <span class="material-symbols-outlined text-base text-(--color-error) shrink-0">error</span>
                <p class="font-sans text-sm text-(--color-error)">{{ profileError }}</p>
              </div>
            </Transition>

            <div class="flex gap-3 pt-1">
              <button type="button"
                class="flex-1 py-3 rounded-xl border border-(--color-outline-variant) font-sans text-sm font-semibold text-(--color-on-surface-variant) hover:bg-(--color-surface-container) transition-colors"
                @click="cancelProfileEdit">
                Cancel
              </button>
              <button type="submit" :disabled="profileLoading"
                class="flex-1 py-3 rounded-xl bg-(--color-primary) text-white font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                <span v-if="profileLoading" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
                <span v-else>Save Changes</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Change password -->
        <div class="bg-(--color-surface-container-lowest) rounded-2xl border border-(--color-outline-variant) overflow-hidden">
          <div class="px-6 py-5 border-b border-(--color-outline-variant)">
            <h2 class="font-serif text-lg text-(--color-on-surface)">Security</h2>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mt-0.5">Update your password to keep your account secure.</p>
          </div>

          <form class="p-6 space-y-5" @submit.prevent="changePassword">
            <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
              <div v-if="pwSuccess" class="flex items-center gap-2 p-3 rounded-lg bg-(--color-primary-container)">
                <span class="material-symbols-outlined text-base text-(--color-primary)" style="font-variation-settings:'FILL' 1">check_circle</span>
                <p class="font-sans text-sm text-(--color-primary) font-semibold">Password changed successfully.</p>
              </div>
            </Transition>

            <!-- Current password -->
            <div class="space-y-1">
              <label class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">
                Current Password <span class="text-(--color-error)">*</span>
              </label>
              <div class="relative">
                <input v-model="pwForm.oldPassword" :type="showOldPw ? 'text' : 'password'"
                  placeholder="Enter current password" autocomplete="current-password"
                  :class="pwErrors.oldPassword ? 'ring-2 ring-(--color-error)' : 'focus:ring-2 focus:ring-(--color-primary)'"
                  class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 pr-10 font-sans text-sm text-(--color-on-surface) focus:outline-none transition-all" />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-on-surface-variant)" @click="showOldPw = !showOldPw">
                  <span class="material-symbols-outlined text-xl">{{ showOldPw ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              <p v-if="pwErrors.oldPassword" class="font-sans text-xs text-(--color-error)">{{ pwErrors.oldPassword }}</p>
            </div>

            <!-- New password -->
            <div class="space-y-1">
              <label class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">
                New Password <span class="text-(--color-error)">*</span>
              </label>
              <div class="relative">
                <input v-model="pwForm.newPassword" :type="showNewPw ? 'text' : 'password'"
                  placeholder="Min 8 characters" autocomplete="new-password"
                  :class="pwErrors.newPassword ? 'ring-2 ring-(--color-error)' : 'focus:ring-2 focus:ring-(--color-primary)'"
                  class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 pr-10 font-sans text-sm text-(--color-on-surface) focus:outline-none transition-all" />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-on-surface-variant)" @click="showNewPw = !showNewPw">
                  <span class="material-symbols-outlined text-xl">{{ showNewPw ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              <!-- Strength bar -->
              <div v-if="pwForm.newPassword" class="flex items-center gap-2 mt-1">
                <div class="flex gap-1 flex-1">
                  <div v-for="n in 5" :key="n" class="h-1 flex-1 rounded-full transition-all duration-300"
                    :class="n <= passwordStrength(pwForm.newPassword) ? strengthColor[passwordStrength(pwForm.newPassword)] : 'bg-(--color-outline)'" />
                </div>
                <span class="font-sans text-xs text-(--color-on-surface-variant) w-20 text-right">
                  {{ strengthLabel[passwordStrength(pwForm.newPassword)] }}
                </span>
              </div>
              <p v-if="pwErrors.newPassword" class="font-sans text-xs text-(--color-error)">{{ pwErrors.newPassword }}</p>
            </div>

            <!-- Confirm new password -->
            <div class="space-y-1">
              <label class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant)">
                Confirm New Password <span class="text-(--color-error)">*</span>
              </label>
              <div class="relative">
                <input v-model="pwForm.confirmPassword" :type="showConfirmPw ? 'text' : 'password'"
                  placeholder="Repeat new password" autocomplete="new-password"
                  :class="pwErrors.confirmPassword ? 'ring-2 ring-(--color-error)' : 'focus:ring-2 focus:ring-(--color-primary)'"
                  class="w-full bg-(--color-savannah-mist) border-none rounded-lg px-3 py-3 pr-10 font-sans text-sm text-(--color-on-surface) focus:outline-none transition-all" />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-on-surface-variant)" @click="showConfirmPw = !showConfirmPw">
                  <span class="material-symbols-outlined text-xl">{{ showConfirmPw ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              <p v-if="pwErrors.confirmPassword" class="font-sans text-xs text-(--color-error)">{{ pwErrors.confirmPassword }}</p>
            </div>

            <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
              <div v-if="pwError" class="flex items-start gap-2 p-3 rounded-lg bg-(--color-error-container)">
                <span class="material-symbols-outlined text-base text-(--color-error) shrink-0">error</span>
                <p class="font-sans text-sm text-(--color-error)">{{ pwError }}</p>
              </div>
            </Transition>

            <button type="submit" :disabled="pwLoading"
              class="w-full py-3.5 rounded-xl bg-(--color-primary) text-white font-sans text-sm font-semibold hover:bg-(--color-clay-earth) transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              <span v-if="pwLoading" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
              <span v-else>Update Password</span>
            </button>
          </form>
        </div>
      </div>

      <!-- ── Right: Quick info sidebar ────────────────────────────────────── -->
      <div class="space-y-4">
        <div class="bg-(--color-savannah-mist) rounded-2xl p-6 border border-(--color-outline-variant)">
          <div class="w-14 h-14 rounded-full bg-(--color-primary) flex items-center justify-center mb-4">
            <span class="font-serif text-xl text-white font-bold">{{ initials }}</span>
          </div>
          <p class="font-serif text-lg text-(--color-on-surface)">{{ auth.user?.full_name }}</p>
          <p class="font-sans text-xs text-(--color-on-surface-variant) mt-1">{{ auth.user?.email }}</p>
          <RouterLink to="/bookings"
            class="mt-4 flex items-center gap-2 font-sans text-sm font-semibold text-(--color-primary) hover:underline">
            <span class="material-symbols-outlined text-base">calendar_month</span>
            My Bookings
          </RouterLink>
        </div>

        <div class="bg-(--color-surface-container-lowest) rounded-2xl p-6 border border-(--color-outline-variant)">
          <p class="font-sans text-xs font-semibold uppercase tracking-wider text-(--color-on-surface-variant) mb-3">Tips</p>
          <ul class="space-y-3">
            <li class="flex items-start gap-2 font-sans text-xs text-(--color-on-surface-variant) leading-relaxed">
              <span class="material-symbols-outlined text-sm text-(--color-primary) shrink-0 mt-0.5">lock</span>
              Use a unique password you don't use on other sites.
            </li>
            <li class="flex items-start gap-2 font-sans text-xs text-(--color-on-surface-variant) leading-relaxed">
              <span class="material-symbols-outlined text-sm text-(--color-primary) shrink-0 mt-0.5">phone</span>
              Keep your phone number up to date for booking notifications.
            </li>
          </ul>
        </div>
      </div>

    </div>
  </div>
</template>

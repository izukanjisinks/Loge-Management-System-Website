<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLodgesStore } from '@/stores/lodges'
import { useRooms, roomImage } from '@/composables/useRooms'
import api from '@/lib/api'

const route = useRoute()
const router = useRouter()

const lodgeId     = route.params.id
const lodgesStore = useLodgesStore()

const lodgeLoading    = computed(() => lodgesStore.loading)
const lodgeError      = computed(() => lodgesStore.error)
const lodge           = computed(() => lodgesStore.lodges.find(l => l.id === lodgeId))
const branches        = computed(() => lodgesStore.branchesFor(lodgeId))
const selectedBranchObj = computed(() =>
  selectedBranch.value
    ? branches.value.find(b => String(b.id) === selectedBranch.value) ?? null
    : null
)

const { rooms, page: roomsPage, totalPages: roomsTotalPages, loading: roomsLoading, error: roomsError, fetchRooms } = useRooms()

// ── State — initialised from URL so refresh / link-sharing restores context ────
const VALID_TABS = ['accommodation', 'events', 'meals']
const selectedBranch = ref(route.query.branch ?? '')
const activeTab      = ref(VALID_TABS.includes(route.query.tab) ? route.query.tab : 'accommodation')

// Venues
const venues        = ref([])
const venuesLoading = ref(false)
const venuesError   = ref('')

// ── Data ──────────────────────────────────────────────────────────────────────
// NOTE: room filtering (search / price / type) is intentionally not wired yet —
// the sidebar controls are static and will be hooked up later.
function buildRoomParams(extra = {}) {
  const p = { org_id: lodgeId, ...extra }
  if (selectedBranch.value) p.branch_id = selectedBranch.value
  return p
}

function loadRooms(extra = {}) { fetchRooms(buildRoomParams(extra)) }

async function goToPage(p) { await fetchRooms(buildRoomParams({ page: p })) }

async function loadVenues() {
  venuesLoading.value = true
  venuesError.value   = ''
  try {
    const params = { org_id: lodgeId }
    if (selectedBranch.value) params.branch_id = selectedBranch.value
    const { data } = await api.get('/guest/venues', { params })
    venues.value = data.data ?? data
  } catch {
    venuesError.value = 'Unable to load venues. Please try again.'
  } finally {
    venuesLoading.value = false
  }
}

// ── Menu ──────────────────────────────────────────────────────────────────────
const menuItems      = ref([])
const menuLoading    = ref(false)
const menuError      = ref('')
const menuPage       = ref(1)
const menuTotalPages = ref(1)
const MENU_PAGE_SIZE = 6

function menuBranchId() {
  if (selectedBranch.value) return selectedBranch.value
  if (branches.value.length === 1) return String(branches.value[0].id)
  return null
}

// Menus are branch-scoped. On a multi-branch lodge with "All Locations" selected,
// there's no single menu to show — prompt the user to pick a branch instead of
// loading (and instead of showing the "not configured" empty state).
const menuNeedsBranch = computed(() =>
  branches.value.length > 1 && !selectedBranch.value
)

async function loadMenu(p = 1) {
  menuLoading.value = true
  menuError.value   = ''
  menuPage.value    = p
  try {
    const params = { org_id: lodgeId, page: p, page_size: MENU_PAGE_SIZE }
    const branchId = menuBranchId()
    if (branchId) params.branch_id = branchId

    const { data } = await api.get('/guest/menu', { params })
    const wrapper  = data.items
    menuItems.value      = wrapper?.data ?? []
    const total          = wrapper?.total     ?? menuItems.value.length
    const pageSize       = wrapper?.page_size ?? MENU_PAGE_SIZE
    menuTotalPages.value = Math.max(1, Math.ceil(total / pageSize))
  } catch (err) {
    if (err.response?.status === 400 || err.response?.status === 404) {
      menuItems.value = []
      menuTotalPages.value = 1
    } else {
      menuError.value = 'Unable to load menu. Please try again.'
    }
  } finally {
    menuLoading.value = false
  }
}

function menuCategoryIcon(category) {
  const m = {
    main: 'dinner_dining',       main_course: 'dinner_dining',  starter: 'restaurant',
    appetizer: 'restaurant',     dessert: 'cake',               beverage: 'local_cafe',
    drinks: 'local_cafe',        breakfast: 'free_breakfast',   brunch: 'brunch_dining',
    lunch: 'lunch_dining',       dinner: 'dinner_dining',       snack: 'bakery_dining',
    buffet: 'food_bank',         soup: 'soup_kitchen',          salad: 'nutrition',
  }
  return m[category?.toLowerCase()] ?? 'restaurant_menu'
}

function menuCategoryLabel(c) {
  if (!c) return 'Menu Item'
  return c.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(selectedBranch, (val) => {
  router.replace({ query: { ...route.query, branch: val || undefined } })
  loadRooms()
  if (activeTab.value === 'events') loadVenues()
  if (activeTab.value === 'meals') {
    if (menuNeedsBranch.value) menuItems.value = []  // back to "All Locations" → show prompt
    else loadMenu()
  }
})

watch(activeTab, (tab) => {
  router.replace({ query: { ...route.query, tab: tab === 'accommodation' ? undefined : tab } })
  if (tab === 'events' && !venues.value.length && !venuesLoading.value) loadVenues()
  // Multi-branch + "All Locations" → show the branch prompt instead of loading.
  if (tab === 'meals' && !menuNeedsBranch.value) loadMenu()
})

// ── Init ──────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await lodgesStore.fetchLodges()
  lodgesStore.fetchLodgeDetail(lodgeId)
  loadRooms()
  if (activeTab.value === 'events') loadVenues()
  if (activeTab.value === 'meals' && !menuNeedsBranch.value) loadMenu()
})

// ── Venue helpers ─────────────────────────────────────────────────────────────
function venueLocationIcon(t) {
  return t === 'outdoor' ? 'park' : t === 'semi_outdoor' ? 'open_in_full' : 'warehouse'
}
function venueLocationLabel(t) {
  return t === 'outdoor' ? 'Outdoor' : t === 'semi_outdoor' ? 'Semi-Outdoor' : 'Indoor'
}

// ── Booking ───────────────────────────────────────────────────────────────────
function branchQuery() {
  const id = selectedBranch.value || (branches.value.length === 1 ? String(branches.value[0].id) : null)
  return id ? { branchId: id } : {}
}

</script>

<template>
  <!-- ── Loading skeleton ─────────────────────────────────────────────────── -->
  <div v-if="lodgeLoading" class="max-w-[1280px] mx-auto px-5 md:px-16 py-10 animate-pulse space-y-6">
    <div class="h-72 bg-(--color-surface-container-highest) rounded-2xl"></div>
    <div class="h-8 bg-(--color-surface-container-highest) rounded max-w-xs"></div>
    <div class="h-4 bg-(--color-surface-container-highest) rounded max-w-48"></div>
  </div>

  <!-- ── Error / not found ─────────────────────────────────────────────────── -->
  <div v-else-if="lodgeError || (!lodgeLoading && !lodge)"
    class="max-w-[1280px] mx-auto px-5 md:px-16 py-32 text-center">
    <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">search_off</span>
    <p class="font-serif text-2xl text-(--color-on-surface) mb-2">Lodge not found</p>
    <RouterLink to="/lodges" class="font-sans text-sm text-(--color-primary) hover:underline">← Back to lodges</RouterLink>
  </div>

  <!-- ── Lodge page ────────────────────────────────────────────────────────── -->
  <div v-else-if="lodge" class="pb-24">

    <!-- ── Tab content ────────────────────────────────────────────────────── -->
    <div class="max-w-[1280px] mx-auto px-5 md:px-16 py-8 min-h-[70vh]">
      <Transition
        enter-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
        mode="out-in">

        <!-- ════════════ ACCOMMODATION ════════════ -->
        <div v-if="activeTab === 'accommodation'" key="accommodation">

          <!-- Section header -->
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10">
            <div>
              <span class="font-sans text-xs font-bold tracking-[0.2em] uppercase text-(--color-primary) block mb-2">Exquisite Living</span>
              <h2 class="font-serif text-[32px] leading-none font-bold text-(--color-on-surface)">Rooms &amp; Accommodation</h2>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mt-3">
                <template v-if="roomsLoading">Loading rooms…</template>
                <template v-else>
                  {{ rooms.length }} room{{ rooms.length !== 1 ? 's' : '' }}
                  at {{ selectedBranchObj?.name ?? lodge.name }}
                </template>
              </p>
            </div>
            <RouterLink
              :to="{ name: 'accommodation-booking', params: { id: lodgeId }, query: { ...branchQuery() } }"
              class="flex items-center gap-2 px-6 py-3 bg-(--color-primary) text-white font-sans text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-(--color-charcoal) transition-colors whitespace-nowrap shrink-0 shadow-lg">
              Book Accommodation
              <span class="material-symbols-outlined text-base">arrow_forward</span>
            </RouterLink>
          </div>

          <!-- Two-column: grid + sidebar filter -->
          <div class="flex flex-col md:flex-row gap-10 items-start">

          <!-- ── Left: Room grid (75%) ──────────────────────────────────────── -->
          <div class="w-full md:w-3/4 space-y-8">

          <!-- Rooms error -->
          <div v-if="roomsError && !roomsLoading"
            class="py-12 text-center bg-(--color-error-container) rounded-2xl">
            <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-3">wifi_off</span>
            <p class="font-sans text-sm text-(--color-on-error-container)">{{ roomsError }}</p>
          </div>

          <!-- Rooms skeleton -->
          <div v-else-if="roomsLoading && !rooms.length"
            class="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div v-for="i in 6" :key="i"
              class="h-[500px] rounded-[2rem] bg-(--color-surface-container-high) overflow-hidden animate-pulse"></div>
          </div>

          <!-- Room cards -->
          <div v-else-if="rooms.length" class="relative">
            <Transition
              enter-active-class="transition duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100"
              leave-active-class="transition duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
              <div v-if="roomsLoading"
                class="absolute inset-0 z-10 bg-(--color-background)/80 flex items-center justify-center rounded-2xl">
                <span class="material-symbols-outlined text-4xl text-(--color-primary) animate-spin">progress_activity</span>
              </div>
            </Transition>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div v-for="room in rooms" :key="room.id"
                class="group relative h-[500px] rounded-[2rem] overflow-hidden shadow-xl cursor-pointer"
                @click="router.push({ name: 'room-detail', params: { id: room.id }, query: { org_id: lodgeId } })">
                <!-- Image -->
                <img :src="roomImage(room)" :alt="room.name"
                  class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />

                <!-- Type badge -->
                <div v-if="room.type"
                  class="absolute top-5 left-5 z-20 bg-(--color-charcoal) text-white px-4 py-1.5 rounded-full font-sans text-xs font-semibold uppercase tracking-widest shadow-lg capitalize">
                  {{ room.type }}
                </div>

                <!-- Frosted info panel -->
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
                    <span
                      class="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-(--color-primary) group-hover:text-(--color-charcoal) transition-colors">
                      Details <span class="material-symbols-outlined text-base">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty rooms -->
          <div v-else-if="!roomsLoading"
            class="py-16 text-center bg-(--color-surface-container-lowest) rounded-2xl">
            <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">bed</span>
            <p class="font-serif text-xl text-(--color-on-surface)">No rooms listed</p>
            <p class="font-sans text-sm text-(--color-on-surface-variant) mt-2">
              This property has no rooms configured yet.
            </p>
            <RouterLink
              :to="{ name: 'accommodation-booking', params: { id: lodgeId }, query: branchQuery() }"
              class="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-(--color-primary) text-white font-sans text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-(--color-charcoal) transition-colors">
              Book Accommodation
              <span class="material-symbols-outlined text-base">arrow_forward</span>
            </RouterLink>
          </div>

          <!-- Pagination -->
          <div v-if="roomsTotalPages > 1" class="flex items-center justify-center gap-2 pt-6">
            <button :disabled="roomsPage <= 1 || roomsLoading"
              class="w-12 h-12 rounded-2xl border border-(--color-outline-variant) flex items-center justify-center text-(--color-on-surface) hover:bg-(--color-primary) hover:text-white hover:border-(--color-primary) disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-(--color-on-surface) transition-all"
              @click="goToPage(roomsPage - 1)">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <button v-for="p in roomsTotalPages" :key="p"
              class="w-12 h-12 rounded-2xl flex items-center justify-center font-sans text-sm font-semibold transition-all"
              :class="p === roomsPage
                ? 'bg-(--color-primary) text-white shadow-lg'
                : 'border border-transparent text-(--color-on-surface) hover:border-(--color-outline-variant) hover:text-(--color-primary)'"
              @click="goToPage(p)">
              {{ p }}
            </button>
            <button :disabled="roomsPage >= roomsTotalPages || roomsLoading"
              class="w-12 h-12 rounded-2xl border border-(--color-outline-variant) flex items-center justify-center text-(--color-on-surface) hover:bg-(--color-primary) hover:text-white hover:border-(--color-primary) disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-(--color-on-surface) transition-all"
              @click="goToPage(roomsPage + 1)">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          </div><!-- /left column -->

          <!-- ── Right: Sidebar filter (25%) · static — wiring added later ──────── -->
          <aside class="w-full md:w-1/4 bg-(--color-surface-container-low) p-8 rounded-[2rem] space-y-8 md:sticky md:top-24">

            <!-- Search -->
            <div class="flex gap-2">
              <input
                type="text"
                placeholder="Search rooms..."
                class="w-full bg-(--color-surface-container-lowest) border border-(--color-outline-variant) rounded-xl px-4 py-3 font-sans text-sm text-(--color-on-surface) focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-(--color-primary) transition-all"
              />
              <button
                class="bg-(--color-primary) text-white px-5 rounded-xl font-sans text-xs font-bold uppercase tracking-wider hover:bg-(--color-charcoal) transition-all shrink-0"
              >
                Search
              </button>
            </div>

            <!-- Filter by price -->
            <div class="space-y-6">
              <div class="bg-(--color-surface-container-lowest) py-4 rounded-xl text-center shadow-sm">
                <h4 class="font-sans text-xs font-bold text-(--color-on-surface) uppercase tracking-widest">Filter by Price</h4>
              </div>
              <div class="px-1">
                <input
                  type="range" min="40" max="2350" value="2350"
                  class="w-full h-2 bg-(--color-surface-container-highest) rounded-full appearance-none cursor-pointer accent-(--color-primary)"
                />
                <div class="mt-4 text-center font-sans text-sm text-(--color-on-surface-variant)">
                  Price: <span class="text-(--color-on-surface) font-bold">K40 — K2,350</span>
                </div>
              </div>
              <button
                class="w-full bg-(--color-primary) text-white py-4 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest hover:bg-(--color-charcoal) transition-all shadow-lg"
              >
                Filter
              </button>
            </div>

            <!-- Other Products -->
            <div class="space-y-6">
              <div class="bg-(--color-surface-container-lowest) py-4 rounded-xl text-center shadow-sm">
                <h4 class="font-sans text-xs font-bold text-(--color-on-surface) uppercase tracking-widest">Other Products</h4>
              </div>
              <div class="space-y-2">
                <button
                  type="button"
                  class="w-full flex gap-4 items-center p-2 hover:bg-(--color-surface-container-lowest) rounded-xl transition-colors group text-left"
                  @click="activeTab = 'events'"
                >
                  <div class="w-16 h-16 bg-(--color-surface-container-high) rounded-lg flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-2xl text-(--color-primary)">meeting_room</span>
                  </div>
                  <div class="grow">
                    <h5 class="font-sans text-sm font-semibold text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">Venues</h5>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">Event & conference spaces</p>
                  </div>
                  <span class="material-symbols-outlined text-base text-(--color-outline) group-hover:text-(--color-primary) transition-colors">arrow_forward</span>
                </button>

                <button
                  type="button"
                  class="w-full flex gap-4 items-center p-2 hover:bg-(--color-surface-container-lowest) rounded-xl transition-colors group text-left"
                  @click="activeTab = 'meals'"
                >
                  <div class="w-16 h-16 bg-(--color-surface-container-high) rounded-lg flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-2xl text-(--color-primary)">restaurant</span>
                  </div>
                  <div class="grow">
                    <h5 class="font-sans text-sm font-semibold text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">Meals</h5>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">Catering & dining menu</p>
                  </div>
                  <span class="material-symbols-outlined text-base text-(--color-outline) group-hover:text-(--color-primary) transition-colors">arrow_forward</span>
                </button>
              </div>
            </div>
          </aside>

          </div><!-- /two-column -->
        </div>

        <!-- ════════════ EVENTS ════════════ -->
        <div v-else-if="activeTab === 'events'" key="events">

          <!-- Section header -->
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10">
            <div>
              <span class="font-sans text-xs font-bold tracking-[0.2em] uppercase text-(--color-primary) block mb-2">Gather & Celebrate</span>
              <h2 class="font-serif text-[32px] leading-none font-bold text-(--color-on-surface)">Event Spaces &amp; Venues</h2>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mt-3">
                <template v-if="venuesLoading">Loading venues…</template>
                <template v-else>
                  {{ venues.length }} venue{{ venues.length !== 1 ? 's' : '' }}
                  at {{ selectedBranchObj?.name ?? lodge.name }}
                </template>
              </p>
            </div>
            <RouterLink
              :to="{ name: 'event-booking', params: { id: lodgeId }, query: { ...branchQuery() } }"
              class="flex items-center gap-2 px-6 py-3 bg-(--color-primary) text-white font-sans text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-(--color-charcoal) transition-colors whitespace-nowrap shrink-0 shadow-lg">
              Book Event Space
              <span class="material-symbols-outlined text-base">arrow_forward</span>
            </RouterLink>
          </div>

          <!-- Two-column: grid + sidebar filter -->
          <div class="flex flex-col md:flex-row gap-10 items-start">

          <!-- ── Left: Venue grid (75%) ─────────────────────────────────────── -->
          <div class="w-full md:w-3/4 space-y-8">

            <!-- Venues skeleton -->
            <div v-if="venuesLoading && !venues.length"
              class="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div v-for="i in 6" :key="i"
                class="h-[500px] rounded-[2rem] bg-(--color-surface-container-high) overflow-hidden animate-pulse"></div>
            </div>

            <!-- Venue cards -->
            <div v-else-if="venues.length" class="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div v-for="venue in venues" :key="venue.id"
                class="group relative h-[500px] rounded-[2rem] overflow-hidden shadow-xl cursor-pointer"
                @click="router.push({ name: 'venue-detail', params: { id: venue.id }, query: { org_id: venue.org_id } })">
                <!-- Image -->
                <img v-if="venue.images?.[0]" :src="venue.images[0]" :alt="venue.name"
                  class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                <div v-else class="absolute inset-0 bg-(--color-surface-container-high) flex items-center justify-center">
                  <span class="material-symbols-outlined text-6xl text-(--color-outline)">event</span>
                </div>

                <!-- Type badge -->
                <div v-if="venue.type_label"
                  class="absolute top-5 left-5 z-20 bg-(--color-charcoal) text-white px-4 py-1.5 rounded-full font-sans text-xs font-semibold uppercase tracking-widest shadow-lg">
                  {{ venue.type_label }}
                </div>

                <!-- Frosted info panel -->
                <div class="absolute inset-x-0 bottom-0 z-10 bg-(--color-surface-container-lowest)/90 backdrop-blur-sm p-6 border-t border-white/20">
                  <div class="flex justify-between items-start gap-3 mb-2">
                    <h3 class="font-serif text-xl font-semibold text-(--color-on-surface) leading-tight">{{ venue.name }}</h3>
                    <span class="shrink-0 flex items-center gap-1 font-sans text-xs font-semibold text-(--color-on-surface-variant)">
                      <span class="material-symbols-outlined text-base text-(--color-primary)">group</span>
                      {{ venue.capacity }}
                    </span>
                  </div>
                  <p class="font-sans text-sm text-(--color-on-surface-variant) mb-5 line-clamp-2">
                    {{ venue.description || 'A versatile space for your event.' }}
                  </p>
                  <div class="flex justify-between items-center">
                    <span class="flex items-center gap-1.5 font-sans text-sm font-semibold text-(--color-on-surface-variant)">
                      <span class="material-symbols-outlined text-base text-(--color-primary)">{{ venueLocationIcon(venue.location_type) }}</span>
                      {{ venueLocationLabel(venue.location_type) }}
                    </span>
                    <span class="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-(--color-primary) group-hover:text-(--color-charcoal) transition-colors">
                      Details <span class="material-symbols-outlined text-base">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty venues -->
            <div v-else-if="!venuesLoading"
              class="py-16 text-center bg-(--color-surface-container-lowest) rounded-2xl">
              <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">event_seat</span>
              <p class="font-serif text-xl text-(--color-on-surface)">No venues listed</p>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mt-2">This property has no venues configured yet.</p>
              <RouterLink
                :to="{ name: 'event-booking', params: { id: lodgeId }, query: { ...branchQuery() } }"
                class="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-(--color-primary) text-white font-sans text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-(--color-charcoal) transition-colors">
                Book Event Space
                <span class="material-symbols-outlined text-base">arrow_forward</span>
              </RouterLink>
            </div>
          </div><!-- /left column -->

          <!-- ── Right: Sidebar filter (25%) · static — wiring added later ──────── -->
          <aside class="w-full md:w-1/4 bg-(--color-surface-container-low) p-8 rounded-[2rem] space-y-8 md:sticky md:top-24">
            <!-- Search -->
            <div class="flex gap-2">
              <input type="text" placeholder="Search venues..."
                class="w-full bg-(--color-surface-container-lowest) border border-(--color-outline-variant) rounded-xl px-4 py-3 font-sans text-sm text-(--color-on-surface) focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-(--color-primary) transition-all" />
              <button class="bg-(--color-primary) text-white px-5 rounded-xl font-sans text-xs font-bold uppercase tracking-wider hover:bg-(--color-charcoal) transition-all shrink-0">Search</button>
            </div>
            <!-- Filter by capacity -->
            <div class="space-y-6">
              <div class="bg-(--color-surface-container-lowest) py-4 rounded-xl text-center shadow-sm">
                <h4 class="font-sans text-xs font-bold text-(--color-on-surface) uppercase tracking-widest">Filter by Capacity</h4>
              </div>
              <div class="px-1">
                <input type="range" min="10" max="500" value="500"
                  class="w-full h-2 bg-(--color-surface-container-highest) rounded-full appearance-none cursor-pointer accent-(--color-primary)" />
                <div class="mt-4 text-center font-sans text-sm text-(--color-on-surface-variant)">
                  Up to <span class="text-(--color-on-surface) font-bold">500 guests</span>
                </div>
              </div>
              <button class="w-full bg-(--color-primary) text-white py-4 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest hover:bg-(--color-charcoal) transition-all shadow-lg">Filter</button>
            </div>
            <!-- Other Products -->
            <div class="space-y-6">
              <div class="bg-(--color-surface-container-lowest) py-4 rounded-xl text-center shadow-sm">
                <h4 class="font-sans text-xs font-bold text-(--color-on-surface) uppercase tracking-widest">Other Products</h4>
              </div>
              <div class="space-y-2">
                <button type="button" class="w-full flex gap-4 items-center p-2 hover:bg-(--color-surface-container-lowest) rounded-xl transition-colors group text-left" @click="activeTab = 'accommodation'">
                  <div class="w-16 h-16 bg-(--color-surface-container-high) rounded-lg flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-2xl text-(--color-primary)">bed</span>
                  </div>
                  <div class="grow">
                    <h5 class="font-sans text-sm font-semibold text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">Rooms</h5>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">Accommodation & suites</p>
                  </div>
                  <span class="material-symbols-outlined text-base text-(--color-outline) group-hover:text-(--color-primary) transition-colors">arrow_forward</span>
                </button>
                <button type="button" class="w-full flex gap-4 items-center p-2 hover:bg-(--color-surface-container-lowest) rounded-xl transition-colors group text-left" @click="activeTab = 'meals'">
                  <div class="w-16 h-16 bg-(--color-surface-container-high) rounded-lg flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-2xl text-(--color-primary)">restaurant</span>
                  </div>
                  <div class="grow">
                    <h5 class="font-sans text-sm font-semibold text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">Meals</h5>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">Catering & dining menu</p>
                  </div>
                  <span class="material-symbols-outlined text-base text-(--color-outline) group-hover:text-(--color-primary) transition-colors">arrow_forward</span>
                </button>
              </div>
            </div>
          </aside>

          </div><!-- /two-column -->
        </div>

        <!-- ════════════ MEALS ════════════ -->
        <div v-else-if="activeTab === 'meals'" key="meals">

          <!-- Section header -->
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10">
            <div>
              <span class="font-sans text-xs font-bold tracking-[0.2em] uppercase text-(--color-primary) block mb-2">Curated Flavours</span>
              <h2 class="font-serif text-[32px] leading-none font-bold text-(--color-on-surface)">Catering &amp; Meals</h2>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mt-3">
                <template v-if="menuLoading">Loading menu…</template>
                <template v-else-if="menuNeedsBranch">Select a location to view its menu</template>
                <template v-else>
                  {{ menuItems.length }} item{{ menuItems.length !== 1 ? 's' : '' }}
                  on the menu at {{ selectedBranchObj?.name ?? lodge.name }}
                </template>
              </p>
            </div>
            <RouterLink
              :to="{ name: 'meal-booking', params: { id: lodgeId }, query: { ...branchQuery() } }"
              class="flex items-center gap-2 px-6 py-3 bg-(--color-primary) text-white font-sans text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-(--color-charcoal) transition-colors whitespace-nowrap shrink-0 shadow-lg">
              Book Catering
              <span class="material-symbols-outlined text-base">arrow_forward</span>
            </RouterLink>
          </div>

          <!-- Two-column: grid + sidebar filter -->
          <div class="flex flex-col md:flex-row gap-10 items-start">

          <!-- ── Left: Menu grid (75%) ──────────────────────────────────────── -->
          <div class="w-full md:w-3/4 space-y-8">

            <!-- Menu error -->
            <div v-if="menuError && !menuLoading"
              class="py-12 text-center bg-(--color-error-container) rounded-2xl">
              <span class="material-symbols-outlined text-4xl text-(--color-error) block mb-3">wifi_off</span>
              <p class="font-sans text-sm text-(--color-on-error-container)">{{ menuError }}</p>
              <button @click="loadMenu()" class="mt-4 font-sans text-sm text-(--color-primary) hover:underline">Try again</button>
            </div>

            <!-- Menu skeleton -->
            <div v-else-if="menuLoading && !menuItems.length"
              class="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div v-for="i in 6" :key="i"
                class="h-[500px] rounded-[2rem] bg-(--color-surface-container-high) overflow-hidden animate-pulse"></div>
            </div>

            <!-- Menu items — flat overlay-card grid -->
            <template v-else-if="menuItems.length">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div v-for="item in menuItems" :key="item.id"
                class="group relative h-[500px] rounded-[2rem] overflow-hidden shadow-xl">
                <!-- Image -->
                <img v-if="item.image_url" :src="item.image_url" :alt="item.name"
                  class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div v-else class="absolute inset-0 bg-(--color-surface-container-high) flex items-center justify-center">
                  <span class="material-symbols-outlined text-6xl text-(--color-outline)"
                    style="font-variation-settings: 'FILL' 1">{{ menuCategoryIcon(item.category) }}</span>
                </div>

                <!-- Category badge -->
                <div v-if="item.category"
                  class="absolute top-5 left-5 z-20 bg-(--color-charcoal) text-white px-4 py-1.5 rounded-full font-sans text-xs font-semibold uppercase tracking-widest shadow-lg">
                  {{ menuCategoryLabel(item.category) }}
                </div>

                <!-- Availability chip -->
                <div :class="item.is_available ? 'bg-emerald-500/90' : 'bg-rose-500/90'"
                  class="absolute top-5 right-5 z-20 text-white font-sans text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                  {{ item.is_available ? 'Available' : 'Unavailable' }}
                </div>

                <!-- Frosted info panel -->
                <div class="absolute inset-x-0 bottom-0 z-10 bg-(--color-surface-container-lowest)/90 backdrop-blur-sm p-6 border-t border-white/20">
                  <div class="flex justify-between items-start gap-3 mb-2">
                    <h3 class="font-serif text-xl font-semibold text-(--color-on-surface) leading-tight">{{ item.name }}</h3>
                    <span v-if="item.price" class="shrink-0 font-sans text-xl font-bold text-(--color-on-surface)">
                      K{{ Number(item.price).toLocaleString() }}
                    </span>
                  </div>
                  <p v-if="item.description" class="font-sans text-sm text-(--color-on-surface-variant) line-clamp-2">
                    {{ item.description }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Menu pagination -->
            <div v-if="menuTotalPages > 1" class="flex items-center justify-center gap-2 pt-6">
              <button :disabled="menuPage <= 1 || menuLoading"
                class="w-12 h-12 rounded-2xl border border-(--color-outline-variant) flex items-center justify-center text-(--color-on-surface) hover:bg-(--color-primary) hover:text-white hover:border-(--color-primary) disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-(--color-on-surface) transition-all"
                @click="loadMenu(menuPage - 1)">
                <span class="material-symbols-outlined">chevron_left</span>
              </button>
              <button v-for="p in menuTotalPages" :key="p"
                class="w-12 h-12 rounded-2xl flex items-center justify-center font-sans text-sm font-semibold transition-all"
                :class="p === menuPage
                  ? 'bg-(--color-primary) text-white shadow-lg'
                  : 'border border-transparent text-(--color-on-surface) hover:border-(--color-outline-variant) hover:text-(--color-primary)'"
                @click="loadMenu(p)">
                {{ p }}
              </button>
              <button :disabled="menuPage >= menuTotalPages || menuLoading"
                class="w-12 h-12 rounded-2xl border border-(--color-outline-variant) flex items-center justify-center text-(--color-on-surface) hover:bg-(--color-primary) hover:text-white hover:border-(--color-primary) disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-(--color-on-surface) transition-all"
                @click="loadMenu(menuPage + 1)">
                <span class="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
            </template>

            <!-- Branch required — menus are per-location -->
            <div v-else-if="menuNeedsBranch"
              class="py-16 text-center bg-(--color-surface-container-lowest) rounded-2xl">
              <span class="material-symbols-outlined text-5xl text-(--color-primary) block mb-4">location_on</span>
              <p class="font-serif text-xl text-(--color-on-surface)">Select a location</p>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mt-2 max-w-md mx-auto">
                Menus vary by location. Choose a branch to view its catering menu.
              </p>
              <div class="flex flex-wrap justify-center gap-2 mt-6">
                <button v-for="b in branches" :key="b.id" @click="selectedBranch = String(b.id)"
                  class="flex items-center gap-2 px-4 py-2 rounded-xl font-sans text-sm font-semibold border-2 border-(--color-outline-variant) text-(--color-on-surface-variant) hover:border-(--color-primary) hover:text-(--color-primary) transition-all">
                  <span class="material-symbols-outlined text-base">villa</span>
                  {{ b.name }}
                </button>
              </div>
            </div>

            <!-- Empty menu -->
            <div v-else-if="!menuLoading"
              class="py-16 text-center bg-(--color-surface-container-lowest) rounded-2xl">
              <span class="material-symbols-outlined text-5xl text-(--color-outline) block mb-4">restaurant_menu</span>
              <p class="font-serif text-xl text-(--color-on-surface)">No menu items listed</p>
              <p class="font-sans text-sm text-(--color-on-surface-variant) mt-2">The menu for this property hasn't been configured yet.</p>
              <RouterLink
                :to="{ name: 'meal-booking', params: { id: lodgeId }, query: branchQuery() }"
                class="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-(--color-primary) text-white font-sans text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-(--color-charcoal) transition-colors">
                Book Catering Anyway
                <span class="material-symbols-outlined text-base">arrow_forward</span>
              </RouterLink>
            </div>
          </div><!-- /left column -->

          <!-- ── Right: Sidebar filter (25%) · static — wiring added later ──────── -->
          <aside class="w-full md:w-1/4 bg-(--color-surface-container-low) p-8 rounded-[2rem] space-y-8 md:sticky md:top-24">
            <!-- Search -->
            <div class="flex gap-2">
              <input type="text" placeholder="Search menu..."
                class="w-full bg-(--color-surface-container-lowest) border border-(--color-outline-variant) rounded-xl px-4 py-3 font-sans text-sm text-(--color-on-surface) focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-(--color-primary) transition-all" />
              <button class="bg-(--color-primary) text-white px-5 rounded-xl font-sans text-xs font-bold uppercase tracking-wider hover:bg-(--color-charcoal) transition-all shrink-0">Search</button>
            </div>
            <!-- Filter by category -->
            <div class="space-y-6">
              <div class="bg-(--color-surface-container-lowest) py-4 rounded-xl text-center shadow-sm">
                <h4 class="font-sans text-xs font-bold text-(--color-on-surface) uppercase tracking-widest">Filter by Price</h4>
              </div>
              <div class="px-1">
                <input type="range" min="10" max="500" value="500"
                  class="w-full h-2 bg-(--color-surface-container-highest) rounded-full appearance-none cursor-pointer accent-(--color-primary)" />
                <div class="mt-4 text-center font-sans text-sm text-(--color-on-surface-variant)">
                  Up to <span class="text-(--color-on-surface) font-bold">K500</span>
                </div>
              </div>
              <button class="w-full bg-(--color-primary) text-white py-4 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest hover:bg-(--color-charcoal) transition-all shadow-lg">Filter</button>
            </div>
            <!-- Other Products -->
            <div class="space-y-6">
              <div class="bg-(--color-surface-container-lowest) py-4 rounded-xl text-center shadow-sm">
                <h4 class="font-sans text-xs font-bold text-(--color-on-surface) uppercase tracking-widest">Other Products</h4>
              </div>
              <div class="space-y-2">
                <button type="button" class="w-full flex gap-4 items-center p-2 hover:bg-(--color-surface-container-lowest) rounded-xl transition-colors group text-left" @click="activeTab = 'accommodation'">
                  <div class="w-16 h-16 bg-(--color-surface-container-high) rounded-lg flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-2xl text-(--color-primary)">bed</span>
                  </div>
                  <div class="grow">
                    <h5 class="font-sans text-sm font-semibold text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">Rooms</h5>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">Accommodation & suites</p>
                  </div>
                  <span class="material-symbols-outlined text-base text-(--color-outline) group-hover:text-(--color-primary) transition-colors">arrow_forward</span>
                </button>
                <button type="button" class="w-full flex gap-4 items-center p-2 hover:bg-(--color-surface-container-lowest) rounded-xl transition-colors group text-left" @click="activeTab = 'events'">
                  <div class="w-16 h-16 bg-(--color-surface-container-high) rounded-lg flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-2xl text-(--color-primary)">meeting_room</span>
                  </div>
                  <div class="grow">
                    <h5 class="font-sans text-sm font-semibold text-(--color-on-surface) group-hover:text-(--color-primary) transition-colors">Venues</h5>
                    <p class="font-sans text-xs text-(--color-on-surface-variant)">Event & conference spaces</p>
                  </div>
                  <span class="material-symbols-outlined text-base text-(--color-outline) group-hover:text-(--color-primary) transition-colors">arrow_forward</span>
                </button>
              </div>
            </div>
          </aside>

          </div><!-- /two-column -->
        </div>
      </Transition>
    </div>
  </div>
</template>

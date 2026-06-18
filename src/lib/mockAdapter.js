/**
 * Mock axios adapter — active when VITE_USE_MOCK=true.
 * Intercepts every API request and returns dummy data so the whole UI works
 * without a live server. Returns the same shapes the real API produces.
 */

import {
  MOCK_USER,
  MOCK_LODGES,
  MOCK_ROOMS,
  MOCK_ROOMS_BY_ID,
  ALL_MOCK_ROOMS,
  MOCK_BOOKINGS,
} from '@/data/dummyData'

import {
  DUMMY_MENU_ITEMS,
  searchCompanies,
} from '@/data/dummyCorporateData'

// Build a quick lodges-by-id map
const LODGE_MAP = Object.fromEntries(MOCK_LODGES.map(l => [l.id, l]))

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ok(data, delay = 120) {
  return new Promise(resolve =>
    setTimeout(() => resolve({
      data,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
    }), delay)
  )
}

function notFound(message = 'Not found') {
  return Promise.reject({ response: { status: 404, data: { message } } })
}

function idFrom(url, segment) {
  const parts = url.split('/')
  const idx   = parts.indexOf(segment)
  return idx !== -1 ? parts[idx + 1] : null
}

// ─── Route table ─────────────────────────────────────────────────────────────
export function mockAdapter(config) {
  const method = (config.method || 'get').toLowerCase()
  const url    = config.url || ''
  const params = config.params || {}
  let   body   = {}
  try { body = JSON.parse(config.data || '{}') } catch { /* ignore */ }

  // ── Auth ─────────────────────────────────────────────────────────────────
  if (method === 'post' && url.includes('/auth/login')) {
    // Accept any credentials in mock mode
    return ok({ token: 'mock-token-design-mode', user: { ...MOCK_USER, email: body.email || MOCK_USER.email } })
  }

  if (method === 'post' && url.includes('/auth/register')) {
    const nameParts = (body.full_name || body.name || 'New User').split(' ')
    return ok({
      token: 'mock-token-design-mode',
      user: { ...MOCK_USER, id: 'user-new', full_name: body.full_name || body.name || 'New User', email: body.email || '' },
    })
  }

  if (method === 'get' && url.endsWith('/me')) {
    return ok(MOCK_USER)
  }

  // ── Lodges ───────────────────────────────────────────────────────────────
  if (method === 'get' && /\/lodges\/[^/]+$/.test(url)) {
    const id    = idFrom(url, 'lodges')
    const lodge = LODGE_MAP[id]
    return lodge ? ok(lodge) : notFound('Lodge not found')
  }

  if (method === 'get' && url.includes('/lodges')) {
    return ok(MOCK_LODGES)
  }

  // ── Rooms ─────────────────────────────────────────────────────────────────
  if (method === 'get' && /\/rooms\/[^/]+$/.test(url)) {
    const id   = idFrom(url, 'rooms')
    const room = MOCK_ROOMS_BY_ID[id]
    return room ? ok(room) : notFound('Room not found')
  }

  if (method === 'get' && url.includes('/rooms')) {
    let rooms = ALL_MOCK_ROOMS
    if (params.org_id)    rooms = rooms.filter(r => r.org_id    === params.org_id)
    if (params.branch_id) rooms = rooms.filter(r => r.branch_id === params.branch_id)
    if (params.type)      rooms = rooms.filter(r => r.type      === params.type)
    // Availability check — mark all rooms available when dates are provided
    if (params.check_in && params.check_out) {
      rooms = rooms.map(r => ({ ...r, available: true, is_available: true }))
    }
    return ok(rooms)
  }

  // ── Bookings ──────────────────────────────────────────────────────────────
  if (method === 'patch' && url.includes('/cancel')) {
    const id = idFrom(url, 'bookings')
    return ok({ id, status: 'cancelled' })
  }

  if (method === 'get' && /\/bookings\/[^/]+$/.test(url)) {
    const id      = idFrom(url, 'bookings')
    const booking = MOCK_BOOKINGS.find(b => b.id === id)
    return booking ? ok(booking) : notFound('Booking not found')
  }

  if (method === 'get' && url.includes('/bookings')) {
    return ok(MOCK_BOOKINGS)
  }

  if (method === 'post' && url.includes('/bookings/individual')) {
    return ok({
      id: `ind-bk-${Date.now()}`,
      booking_ref: `MCW-IND-${Math.floor(Math.random() * 90000) + 10000}`,
      status: 'pending',
      booking_type: 'individual',
      created_at: new Date().toISOString(),
    }, 600)
  }

  if (method === 'post' && url.includes('/bookings/corporate-event')) {
    return ok({
      id: `corp-bk-${Date.now()}`,
      booking_ref: `MCW-CORP-${Math.floor(Math.random() * 90000) + 10000}`,
      status: 'pending',
      booking_type: 'corporate',
      created_at: new Date().toISOString(),
    }, 600)
  }

  if (method === 'post' && url.includes('/bookings')) {
    return ok({
      id: `bk-${Date.now()}`,
      status: 'pending',
      created_at: new Date().toISOString(),
    }, 400)
  }

  // ── Menu ──────────────────────────────────────────────────────────────────
  if (method === 'get' && url.includes('/menu')) {
    return ok(DUMMY_MENU_ITEMS)
  }

  // ── Companies (corporate booking search) ─────────────────────────────────
  if (method === 'get' && url.includes('/companies')) {
    const q       = params.q || params.search || ''
    const results = searchCompanies(q)
    return ok(results)
  }

  // ── Default: unhandled endpoint in mock mode ──────────────────────────────
  console.warn('[mockAdapter] Unhandled:', method.toUpperCase(), url)
  return ok({ message: 'Mock: unhandled endpoint', url, method })
}

// Comprehensive dummy data for offline/design mode (VITE_USE_MOCK=true).
// Covers all API endpoints the UI calls.

// ─── Auth ────────────────────────────────────────────────────────────────────
export const MOCK_USER = {
  id: 'user-001',
  email: 'demo@mwakwanda.com',
  full_name: 'Demo User',
  phone: '+260 97 000 0000',
  status: 'active',
}

// ─── Lodges ──────────────────────────────────────────────────────────────────
// Each lodge has both `address` (raw field used by LodgesView) and
// `street_address` (the field the lodgesStore mapper reads from).
export const MOCK_LODGES = [
  {
    id: 'lodge-001',
    name: 'Protea Hotel Lusaka',
    logo_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    address: 'Manda Hill, Great East Road, Lusaka',
    street_address: 'Manda Hill, Great East Road, Lusaka',
    email: 'reservations@proteaLusaka.com',
    phone: '+260 211 254 444',
    branches: [
      { id: 'b-001-1', name: 'Main Building', restaurant: true, conference_room: true, parking: true },
      { id: 'b-001-2', name: 'Garden Wing',   restaurant: true, conference_room: false, parking: true },
    ],
  },
  {
    id: 'lodge-002',
    name: 'Avani Victoria Falls Resort',
    logo_url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
    address: 'Mosi-oa-Tunya Road, Livingstone',
    street_address: 'Mosi-oa-Tunya Road, Livingstone',
    email: 'info@avanilivingstone.com',
    phone: '+260 213 321 901',
    branches: [
      { id: 'b-002-1', name: 'Falls View',   restaurant: true, conference_room: true, parking: true },
    ],
  },
  {
    id: 'lodge-003',
    name: 'Chaminuka Lodge',
    logo_url: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
    address: '20 km North of Lusaka, Lusaka',
    street_address: '20 km North of Lusaka, Lusaka',
    email: 'bookings@chaminuka.com',
    phone: '+260 211 271 100',
    branches: [
      { id: 'b-003-1', name: 'Main Lodge',    restaurant: true, conference_room: true, parking: true },
    ],
  },
  {
    id: 'lodge-004',
    name: 'Radisson Blu Lusaka',
    logo_url: 'https://images.unsplash.com/photo-1549294413-26f195200c16?w=800&q=80',
    address: 'John Mbita Road, Lusaka',
    street_address: 'John Mbita Road, Lusaka',
    email: 'reservations.lusaka@radissonblu.com',
    phone: '+260 211 366 666',
    branches: [
      { id: 'b-004-1', name: 'Tower Wing',    restaurant: true, conference_room: true, parking: true },
      { id: 'b-004-2', name: 'Garden Suite',  restaurant: true, conference_room: true, parking: true },
    ],
  },
  {
    id: 'lodge-005',
    name: 'Royal Livingstone Hotel',
    logo_url: 'https://images.unsplash.com/photo-1444201983204-c43cbd584d93?w=800&q=80',
    address: 'Mosi-oa-Tunya National Park, Livingstone',
    street_address: 'Mosi-oa-Tunya National Park, Livingstone',
    email: 'royallivingstone@anantara.com',
    phone: '+260 213 321 122',
    branches: [
      { id: 'b-005-1', name: 'River Lodge',   restaurant: true, conference_room: true, parking: true },
    ],
  },
  {
    id: 'lodge-006',
    name: 'Lilayi Lodge',
    logo_url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
    address: 'Lilayi Road, Lusaka South, Lusaka',
    street_address: 'Lilayi Road, Lusaka South, Lusaka',
    email: 'reservations@lilayi.com',
    phone: '+260 211 278 000',
    branches: [
      { id: 'b-006-1', name: 'Bush Lodge', restaurant: true, conference_room: true, parking: true },
    ],
  },
]

// ─── Rooms ────────────────────────────────────────────────────────────────────
const ROOM_IMAGES = {
  standard: [
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80',
  ],
  deluxe: [
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  ],
  suite: [
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80',
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800&q=80',
  ],
}

function makeRooms(lodgeId, branchId, prefix) {
  return [
    {
      id:               `${prefix}-std-1`,
      name:             'Standard Room',
      type:             'standard',
      price_per_night:  '520',
      capacity:         2,
      org_id:           lodgeId,
      branch_id:        branchId,
      description:      'Comfortable standard room with queen bed, en-suite bathroom, air conditioning, and complimentary Wi-Fi. Ideal for solo travellers and couples.',
      amenities:        ['Wi-Fi', 'Air Conditioning', 'TV', 'Safe', 'Room Service'],
      images:           ROOM_IMAGES.standard,
    },
    {
      id:               `${prefix}-std-2`,
      name:             'Standard Twin',
      type:             'standard',
      price_per_night:  '540',
      capacity:         2,
      org_id:           lodgeId,
      branch_id:        branchId,
      description:      'Twin-bedded standard room perfect for colleagues sharing. Features en-suite bathroom, work desk, and high-speed Wi-Fi.',
      amenities:        ['Wi-Fi', 'Air Conditioning', 'TV', 'Room Service'],
      images:           ROOM_IMAGES.standard,
    },
    {
      id:               `${prefix}-dlx-1`,
      name:             'Deluxe Room',
      type:             'deluxe',
      price_per_night:  '850',
      capacity:         2,
      org_id:           lodgeId,
      branch_id:        branchId,
      description:      'Spacious deluxe room with king bed, separate lounge area, premium toiletries, and garden or pool views.',
      amenities:        ['Wi-Fi', 'Air Conditioning', 'TV', 'Mini Bar', 'Safe', 'Balcony', 'Room Service'],
      images:           ROOM_IMAGES.deluxe,
    },
    {
      id:               `${prefix}-dlx-2`,
      name:             'Deluxe King Pool View',
      type:             'deluxe',
      price_per_night:  '950',
      capacity:         2,
      org_id:           lodgeId,
      branch_id:        branchId,
      description:      'Premium deluxe room overlooking the pool. King bed, upgraded bathroom with soaking tub, and private balcony.',
      amenities:        ['Wi-Fi', 'Air Conditioning', 'TV', 'Mini Bar', 'Safe', 'Balcony', 'Jacuzzi', 'Room Service'],
      images:           ROOM_IMAGES.deluxe,
    },
    {
      id:               `${prefix}-ste-1`,
      name:             'Executive Suite',
      type:             'suite',
      price_per_night:  '1800',
      capacity:         3,
      org_id:           lodgeId,
      branch_id:        branchId,
      description:      'Luxurious suite with separate bedroom and living room, kitchenette, premium bath amenities, and panoramic views. Complimentary minibar and nightly turndown service.',
      amenities:        ['Wi-Fi', 'Air Conditioning', 'TV', 'Mini Bar', 'Safe', 'Balcony', 'Jacuzzi', 'Kitchen', 'Lounge Area', 'Room Service'],
      images:           ROOM_IMAGES.suite,
    },
  ]
}

export const MOCK_ROOMS = {
  'lodge-001': [
    ...makeRooms('lodge-001', 'b-001-1', 'r001a'),
    ...makeRooms('lodge-001', 'b-001-2', 'r001b'),
  ],
  'lodge-002': makeRooms('lodge-002', 'b-002-1', 'r002'),
  'lodge-003': makeRooms('lodge-003', 'b-003-1', 'r003'),
  'lodge-004': [
    ...makeRooms('lodge-004', 'b-004-1', 'r004a'),
    ...makeRooms('lodge-004', 'b-004-2', 'r004b'),
  ],
  'lodge-005': makeRooms('lodge-005', 'b-005-1', 'r005'),
  'lodge-006': makeRooms('lodge-006', 'b-006-1', 'r006'),
}

// Flat lookup map for room detail endpoint
export const MOCK_ROOMS_BY_ID = Object.values(MOCK_ROOMS)
  .flat()
  .reduce((acc, r) => { acc[r.id] = r; return acc }, {})

// All rooms flat list (used when no org_id filter)
export const ALL_MOCK_ROOMS = Object.values(MOCK_ROOMS).flat()

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const MOCK_BOOKINGS = [
  {
    id: 'bk-001',
    room_id: 'r001a-dlx-1',
    room_name: 'Deluxe Room',
    client_name: 'Demo User',
    meal_plan_name: 'Bed & Breakfast',
    check_in: '2026-07-10',
    check_out: '2026-07-13',
    guests: 2,
    nights: 3,
    room_cost: 2550,
    meal_cost: 360,
    total_amount: 2910,
    status: 'confirmed',
    special_requests: 'High floor preferred',
    created_at: '2026-06-01T09:00:00Z',
  },
  {
    id: 'bk-002',
    room_id: 'r002-ste-1',
    room_name: 'Executive Suite',
    client_name: 'Demo User',
    meal_plan_name: null,
    check_in: '2026-08-05',
    check_out: '2026-08-08',
    guests: 1,
    nights: 3,
    room_cost: 5400,
    meal_cost: 0,
    total_amount: 5400,
    status: 'pending',
    special_requests: null,
    created_at: '2026-06-10T14:30:00Z',
  },
  {
    id: 'bk-003',
    room_id: 'r003-std-1',
    room_name: 'Standard Room',
    client_name: 'Demo User',
    meal_plan_name: 'Full Board',
    check_in: '2026-03-15',
    check_out: '2026-03-18',
    guests: 2,
    nights: 3,
    room_cost: 1560,
    meal_cost: 540,
    total_amount: 2100,
    status: 'checked_out',
    special_requests: null,
    created_at: '2026-02-20T11:00:00Z',
  },
]

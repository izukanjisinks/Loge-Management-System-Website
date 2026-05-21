export interface Lodge {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  logo_url?: string
}

export interface Room {
  id: string
  name: string
  type: string
  capacity: number
  price_per_night: number
  amenities?: string[]
  is_available: boolean
  description?: string
  images?: string[]
  lodge_name?: string
  lodge?: { name?: string; id?: string }
}

export interface MealPlan {
  id: string
  name: string
  price_per_person_per_night: number
  includes: string[]
  description?: string
  is_active: boolean
}

export interface ApiBooking {
  id: string
  user_id: string
  room_id: string
  room_name: string
  lodge_name?: string
  client_id: string
  client_type: string
  client_name: string
  meal_plan_id?: string
  meal_plan_name?: string
  check_in: string
  check_out: string
  guests: number
  nights: number
  room_cost: number
  meal_cost: number
  total_amount: number
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
  special_requests?: string
  created_at: string
  updated_at: string
}

export interface NormalisedBooking {
  id: string
  roomId: string
  roomName: string
  lodgeName?: string
  clientName: string
  mealPlanName?: string
  checkIn: string
  checkOut: string
  guests: number
  nights: number
  roomCost: number
  mealCost: number
  totalAmount: number
  status: string
  specialRequests?: string
  createdAt: string
  roomImage?: string | null
}

export interface GuestUser {
  id: string
  full_name: string
  email: string
  role: string
  status: string
  firstName: string
  lastName: string
  name: string
  [key: string]: unknown
}

export interface BookingCreatePayload {
  roomId: string
  checkIn: string
  checkOut: string
  guestCount: number
  mealPlanId?: string | null
  specialRequests?: string
}

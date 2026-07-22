export interface User {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  user_type?: string
}

export interface UserApiResponse {
  id: string | number
  username: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  phone_number?: string
  user_type?: string
}

export interface LoginApiResponse {
  success: boolean
  status_code: number
  message: string
  data: {
    refresh_token: string
    access_token: string
    user?: UserApiResponse
  }
}

export type OpsRolePrefix = 'admin' | 'delivery'

export interface DeliveryPartner {
  id: number
  email: string
  first_name: string
  last_name: string
  phone_number?: string
}

export interface OrderItem {
  id: number
  product: {
    id: number
    name: string
    image?: string
    price?: string
  }
  quantity: number
  size?: string
  unit_price: string
  total_price: string
  customization_notes?: string
  message_on_cake?: string
  pound?: string
  photo_on_cake?: boolean
  photo_link?: string
}

export interface OpsOrder {
  id: number
  order_number: string
  status: string
  payment_status: string
  payment_method?: string
  payment_transaction_id?: string
  subtotal?: string
  tax_amount?: string
  delivery_charge?: string
  discount_amount?: string
  total_amount: string
  customer?: {
    id: number | null
    email: string
    first_name: string
    last_name: string
  }
  bakery?: {
    id: number
    name: string
  }
  delivery_partner?: DeliveryPartner | null
  delivery_address_info?: {
    id: number | null
    full_name: string
    phone_number: string
    address_details: string
    address_label?: string | null
    is_default?: boolean
    latitude?: string | null
    longitude?: string | null
  } | null
  delivery_date?: string
  delivery_time?: string
  birthday_message?: string
  photo_on_cake?: boolean
  photo_url?: string
  special_instructions?: string
  created_at: string
  items?: OrderItem[]
  item_count?: number
}

export interface DashboardSummary {
  total_orders?: number
  total_assigned?: number
  currently_assigned?: number
  total_delivered?: number
  orders_by_status: Array<{ status: string; count: number }>
  orders_by_payment_status?: Array<{ payment_status: string; count: number }>
  unpaid_count?: number
  unpaid_cod_count?: number
  today: {
    count?: number
    revenue?: number
    delivered?: number
    ready?: number
    out_for_delivery?: number
  }
  earnings?: {
    pending: number
    paid: number
  }
}

export interface AdminOrderEditPayload {
  delivery_date?: string | null
  delivery_time?: string | null
  delivery_charge?: string | number
  discount_amount?: string | number
  delivery_partner_id?: number | null
  birthday_message?: string
  photo_on_cake?: boolean
  photo_url?: string
  special_instructions?: string
  items?: Array<{
    id?: number
    _action: 'create' | 'update' | 'delete'
    product_id?: number
    quantity?: number
    size?: string
    customization_notes?: string
    message_on_cake?: string
    pound?: string
    photo_on_cake?: boolean
    photo_link?: string
  }>
}

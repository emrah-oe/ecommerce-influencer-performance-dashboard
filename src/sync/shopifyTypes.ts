export interface ShopifyDiscountCode {
  code: string
  amount: string
  type: 'percentage' | 'fixed_amount' | 'shipping'
}

export interface ShopifyRefundLineItem {
  subtotal: string
  total_tax: string
}

export interface ShopifyRefund {
  id: number
  refund_line_items: ShopifyRefundLineItem[]
}

export interface ShopifyOrder {
  id: number
  created_at: string
  total_price: string
  discount_codes: ShopifyDiscountCode[]
  tags: string
  refunds: ShopifyRefund[]
}

export interface ShopifyOrdersResponse {
  orders: ShopifyOrder[]
}

import { deriveAttributionStatus } from '../logic/attribution'
import { parseShopifyRefunds } from './parseShopifyRefunds'
import { matchDiscountCode } from './parseShopifyDiscounts'
import type { ShopifyOrder } from './shopifyTypes'
import type { InfluencerRecord } from '../db/influencers'
import type { AttributionStatus, ReturnStatus, ReturnSource } from '../../scripts/lib/types'

// Explicit whitelist: only technically relevant order fields are stored.
// PII fields (customer, email, phone, addresses, browser_ip, etc.) are never persisted.

function sanitizeLineItems(items: unknown): unknown[] {
  if (!Array.isArray(items)) return []
  return items.map((item) => {
    if (typeof item !== 'object' || item === null) return {}
    const i = item as Record<string, unknown>
    return {
      id: i['id'],
      product_id: i['product_id'],
      variant_id: i['variant_id'],
      title: i['title'],
      variant_title: i['variant_title'],
      sku: i['sku'],
      quantity: i['quantity'],
      price: i['price'],
      total_discount: i['total_discount'],
      fulfillment_status: i['fulfillment_status'],
      requires_shipping: i['requires_shipping'],
    }
  })
}

function sanitizeRefundLineItems(refundLineItems: unknown): unknown[] {
  if (!Array.isArray(refundLineItems)) return []
  return refundLineItems.map((item) => {
    if (typeof item !== 'object' || item === null) return {}
    const i = item as Record<string, unknown>
    return {
      id: i['id'],
      line_item_id: i['line_item_id'],
      quantity: i['quantity'],
      subtotal: i['subtotal'],
      total_tax: i['total_tax'],
    }
  })
}

function sanitizeTransactions(transactions: unknown): unknown[] {
  if (!Array.isArray(transactions)) return []
  return transactions.map((tx) => {
    if (typeof tx !== 'object' || tx === null) return {}
    const t = tx as Record<string, unknown>
    return {
      id: t['id'],
      kind: t['kind'],
      status: t['status'],
      amount: t['amount'],
      currency: t['currency'],
      gateway: t['gateway'],
      processed_at: t['processed_at'],
      created_at: t['created_at'],
    }
  })
}

function sanitizeRefunds(refunds: unknown): unknown[] {
  if (!Array.isArray(refunds)) return []
  return refunds.map((refund) => {
    if (typeof refund !== 'object' || refund === null) return {}
    const r = refund as Record<string, unknown>
    return {
      id: r['id'],
      created_at: r['created_at'],
      refund_line_items: sanitizeRefundLineItems(r['refund_line_items']),
      transactions: sanitizeTransactions(r['transactions']),
    }
  })
}

export function sanitizeShopifyPayload(order: unknown): Record<string, unknown> {
  if (typeof order !== 'object' || order === null) return {}
  const o = order as Record<string, unknown>
  return {
    id: o['id'],
    order_number: o['order_number'],
    number: o['number'],
    created_at: o['created_at'],
    updated_at: o['updated_at'],
    closed_at: o['closed_at'],
    processed_at: o['processed_at'],
    financial_status: o['financial_status'],
    fulfillment_status: o['fulfillment_status'],
    currency: o['currency'],
    total_price: o['total_price'],
    subtotal_price: o['subtotal_price'],
    total_tax: o['total_tax'],
    total_discounts: o['total_discounts'],
    total_weight: o['total_weight'],
    tags: o['tags'],
    discount_codes: o['discount_codes'],
    source_name: o['source_name'],
    test: o['test'],
    line_items: sanitizeLineItems(o['line_items']),
    refunds: sanitizeRefunds(o['refunds']),
  }
}

export interface ShopifyOrderInput {
  orderId: string
  orderDate: Date
  grossRevenue: number
  hasDiscountCode: boolean
  usedDiscountCode: string | null
  attributionStatus: AttributionStatus
  attributedInfluencerId: string | null
  returnStatus: ReturnStatus
  refundAmount: number
  returnSource: ReturnSource
  rawTags: string[]
  rawMetafields: Record<string, never>
  rawOrderPayload: unknown
  isEdgeCase: boolean
}

export function mapShopifyOrder(
  order: ShopifyOrder,
  influencersByCode: Map<string, InfluencerRecord>,
): ShopifyOrderInput {
  const { hasDiscountCode, usedDiscountCode, matchedInfluencer } = matchDiscountCode(
    order,
    influencersByCode,
  )
  const attributionStatus = deriveAttributionStatus(
    hasDiscountCode,
    usedDiscountCode,
    matchedInfluencer,
  )
  const { returnStatus, refundAmount, returnSource } = parseShopifyRefunds(order)

  return {
    orderId: `shopify_${order.id}`,
    orderDate: new Date(order.created_at),
    grossRevenue: parseFloat(order.total_price),
    hasDiscountCode,
    usedDiscountCode,
    attributionStatus,
    attributedInfluencerId: matchedInfluencer?.id ?? null,
    returnStatus,
    refundAmount,
    returnSource,
    rawTags: order.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean),
    rawMetafields: {},
    rawOrderPayload: sanitizeShopifyPayload(order),
    isEdgeCase: false,
  }
}

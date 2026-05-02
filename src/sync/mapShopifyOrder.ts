import { deriveAttributionStatus } from '../logic/attribution'
import { parseShopifyRefunds } from './parseShopifyRefunds'
import { matchDiscountCode } from './parseShopifyDiscounts'
import type { ShopifyOrder } from './shopifyTypes'
import type { InfluencerRecord } from '../db/influencers'
import type { AttributionStatus, ReturnStatus, ReturnSource } from '../../scripts/lib/types'

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
    rawOrderPayload: order,
    isEdgeCase: false,
  }
}

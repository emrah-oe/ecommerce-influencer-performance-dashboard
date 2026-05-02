import type { ShopifyOrder } from './shopifyTypes'
import type { InfluencerRecord } from '../db/influencers'

export interface DiscountMatchResult {
  hasDiscountCode: boolean
  usedDiscountCode: string | null
  matchedInfluencer: InfluencerRecord | null
}

export function matchDiscountCode(
  order: ShopifyOrder,
  influencersByCode: Map<string, InfluencerRecord>,
): DiscountMatchResult {
  if (order.discount_codes.length === 0) {
    return { hasDiscountCode: false, usedDiscountCode: null, matchedInfluencer: null }
  }

  const first = order.discount_codes[0]
  if (!first) return { hasDiscountCode: false, usedDiscountCode: null, matchedInfluencer: null }
  const code = first.code.toUpperCase()
  const matchedInfluencer = influencersByCode.get(code) ?? null

  return { hasDiscountCode: true, usedDiscountCode: code, matchedInfluencer }
}

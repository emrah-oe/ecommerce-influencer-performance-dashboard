import { describe, it, expect } from 'vitest'
import { mapShopifyOrder } from '../mapShopifyOrder'
import type { ShopifyOrder } from '../shopifyTypes'
import type { InfluencerRecord } from '../../db/influencers'

const CLEAN_INFLUENCER: InfluencerRecord = {
  id: 'inf_001',
  handle: 'jana_k',
  volumeClass: 'top',
  isMixed: false,
  discountCode: 'JANA10',
}

const MIXED_INFLUENCER: InfluencerRecord = {
  id: 'inf_002',
  handle: 'max_m',
  volumeClass: 'mid',
  isMixed: true,
  discountCode: 'MAX20',
}

function makeOrder(overrides: Partial<ShopifyOrder>): ShopifyOrder {
  return {
    id: 12345,
    created_at: '2024-03-15T14:30:00Z',
    total_price: '89.99',
    discount_codes: [],
    tags: '',
    refunds: [],
    ...overrides,
  }
}

const codeMap = new Map<string, InfluencerRecord>([
  ['JANA10', CLEAN_INFLUENCER],
  ['MAX20', MIXED_INFLUENCER],
])

describe('mapShopifyOrder', () => {
  it('orderId hat shopify_-Präfix', () => {
    const result = mapShopifyOrder(makeOrder({}), codeMap)
    expect(result.orderId).toBe('shopify_12345')
  })

  it('orderDate wird als UTC Date geparst', () => {
    const result = mapShopifyOrder(makeOrder({}), codeMap)
    expect(result.orderDate).toBeInstanceOf(Date)
    expect(result.orderDate.toISOString()).toBe('2024-03-15T14:30:00.000Z')
  })

  it('grossRevenue als Zahl geparst', () => {
    const result = mapShopifyOrder(makeOrder({ total_price: '149.90' }), codeMap)
    expect(result.grossRevenue).toBeCloseTo(149.9)
  })

  it('unknown ohne Discount-Code', () => {
    const result = mapShopifyOrder(makeOrder({}), codeMap)
    expect(result.attributionStatus).toBe('unknown')
    expect(result.attributedInfluencerId).toBeNull()
    expect(result.hasDiscountCode).toBe(false)
  })

  it('clean_influencer bei bekanntem Code (isMixed false)', () => {
    const result = mapShopifyOrder(
      makeOrder({ discount_codes: [{ code: 'JANA10', amount: '10', type: 'percentage' }] }),
      codeMap,
    )
    expect(result.attributionStatus).toBe('clean_influencer')
    expect(result.attributedInfluencerId).toBe('inf_001')
  })

  it('mixed_code bei isMixed true', () => {
    const result = mapShopifyOrder(
      makeOrder({ discount_codes: [{ code: 'MAX20', amount: '20', type: 'percentage' }] }),
      codeMap,
    )
    expect(result.attributionStatus).toBe('mixed_code')
    expect(result.attributedInfluencerId).toBe('inf_002')
  })

  it('unknown bei unbekanntem Code', () => {
    const result = mapShopifyOrder(
      makeOrder({ discount_codes: [{ code: 'UNKNOWN99', amount: '5', type: 'fixed_amount' }] }),
      codeMap,
    )
    expect(result.attributionStatus).toBe('unknown')
    expect(result.attributedInfluencerId).toBeNull()
  })

  it('no_return und refundAmount 0 ohne Refunds', () => {
    const result = mapShopifyOrder(makeOrder({}), codeMap)
    expect(result.returnStatus).toBe('no_return')
    expect(result.refundAmount).toBe(0)
  })

  it('rawTags als Array ohne Leerzeichen', () => {
    const result = mapShopifyOrder(makeOrder({ tags: 'vip, summer, sale' }), codeMap)
    expect(result.rawTags).toEqual(['vip', 'summer', 'sale'])
  })

  it('rawTags leer wenn tags leer', () => {
    const result = mapShopifyOrder(makeOrder({ tags: '' }), codeMap)
    expect(result.rawTags).toEqual([])
  })
})

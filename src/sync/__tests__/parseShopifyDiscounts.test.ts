import { describe, it, expect } from 'vitest'
import { matchDiscountCode } from '../parseShopifyDiscounts'
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
    id: 1,
    created_at: '2024-01-15T10:00:00Z',
    total_price: '100.00',
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

describe('matchDiscountCode', () => {
  it('hasDiscountCode false wenn keine Codes vorhanden', () => {
    const result = matchDiscountCode(makeOrder({}), codeMap)
    expect(result.hasDiscountCode).toBe(false)
    expect(result.usedDiscountCode).toBeNull()
    expect(result.matchedInfluencer).toBeNull()
  })

  it('findet Influencer bei bekanntem Code', () => {
    const result = matchDiscountCode(
      makeOrder({ discount_codes: [{ code: 'JANA10', amount: '10', type: 'percentage' }] }),
      codeMap,
    )
    expect(result.hasDiscountCode).toBe(true)
    expect(result.usedDiscountCode).toBe('JANA10')
    expect(result.matchedInfluencer).toEqual(CLEAN_INFLUENCER)
  })

  it('kein Match bei unbekanntem Code', () => {
    const result = matchDiscountCode(
      makeOrder({ discount_codes: [{ code: 'SUMMER20', amount: '20', type: 'percentage' }] }),
      codeMap,
    )
    expect(result.hasDiscountCode).toBe(true)
    expect(result.usedDiscountCode).toBe('SUMMER20')
    expect(result.matchedInfluencer).toBeNull()
  })

  it('normalisiert Code zu Großbuchstaben vor Lookup', () => {
    const result = matchDiscountCode(
      makeOrder({ discount_codes: [{ code: 'jana10', amount: '10', type: 'percentage' }] }),
      codeMap,
    )
    expect(result.usedDiscountCode).toBe('JANA10')
    expect(result.matchedInfluencer).toEqual(CLEAN_INFLUENCER)
  })

  it('isMixed true wird über matchedInfluencer weitergegeben', () => {
    const result = matchDiscountCode(
      makeOrder({ discount_codes: [{ code: 'MAX20', amount: '20', type: 'percentage' }] }),
      codeMap,
    )
    expect(result.matchedInfluencer?.isMixed).toBe(true)
  })
})

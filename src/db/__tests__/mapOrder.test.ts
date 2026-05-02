import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'
import type { Order } from '@prisma/client'
import { mapOrderToInput, mapAttributedOrderToInfluencerInput } from '../mapOrder.js'

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    orderId: 'ord_test_1',
    orderDate: new Date('2024-01-15'),
    grossRevenue: new Prisma.Decimal('150.00'),
    hasDiscountCode: true,
    usedDiscountCode: 'INF01',
    attributionStatus: 'clean_influencer',
    attributedInfluencerId: 'inf_01',
    returnStatus: 'no_return',
    refundAmount: new Prisma.Decimal('0.00'),
    returnSource: 'none',
    rawTags: [],
    rawMetafields: {},
    rawOrderPayload: {},
    isEdgeCase: false,
    ...overrides,
  }
}

describe('mapOrderToInput', () => {
  it('wandelt Decimal-Felder in number um', () => {
    const order = makeOrder({
      grossRevenue: new Prisma.Decimal('199.99'),
      refundAmount: new Prisma.Decimal('29.99'),
    })
    const result = mapOrderToInput(order)
    expect(result.grossRevenue).toBe(199.99)
    expect(result.refundAmount).toBe(29.99)
  })

  it('übergibt attributionStatus korrekt', () => {
    const result = mapOrderToInput(makeOrder({ attributionStatus: 'mixed_code' }))
    expect(result.attributionStatus).toBe('mixed_code')
  })

  it('übergibt returnStatus korrekt', () => {
    const result = mapOrderToInput(makeOrder({ returnStatus: 'partial_return' }))
    expect(result.returnStatus).toBe('partial_return')
  })

  it('Nullwerte bei Decimal ergeben 0', () => {
    const result = mapOrderToInput(
      makeOrder({
        grossRevenue: new Prisma.Decimal('0.00'),
        refundAmount: new Prisma.Decimal('0.00'),
      }),
    )
    expect(result.grossRevenue).toBe(0)
    expect(result.refundAmount).toBe(0)
  })

  it('alle drei AttributionStatus-Werte sind mappbar', () => {
    for (const status of ['clean_influencer', 'mixed_code', 'unknown'] as const) {
      const result = mapOrderToInput(makeOrder({ attributionStatus: status }))
      expect(result.attributionStatus).toBe(status)
    }
  })

  it('alle drei ReturnStatus-Werte sind mappbar', () => {
    for (const status of ['no_return', 'partial_return', 'full_return'] as const) {
      const result = mapOrderToInput(makeOrder({ returnStatus: status }))
      expect(result.returnStatus).toBe(status)
    }
  })

  it('enthält nur die vier OrderInput-Felder', () => {
    const result = mapOrderToInput(makeOrder())
    expect(Object.keys(result).sort()).toEqual(
      ['attributionStatus', 'grossRevenue', 'refundAmount', 'returnStatus'].sort(),
    )
  })
})

describe('mapAttributedOrderToInfluencerInput', () => {
  it('enthält attributedInfluencerId aus der Order', () => {
    const order = makeOrder({ attributedInfluencerId: 'inf_42' }) as Order & {
      attributedInfluencerId: string
    }
    const result = mapAttributedOrderToInfluencerInput(order)
    expect(result.attributedInfluencerId).toBe('inf_42')
  })

  it('enthält alle OrderInput-Felder plus attributedInfluencerId', () => {
    const order = makeOrder({
      grossRevenue: new Prisma.Decimal('80.00'),
      refundAmount: new Prisma.Decimal('10.00'),
      attributionStatus: 'clean_influencer',
      returnStatus: 'partial_return',
      attributedInfluencerId: 'inf_01',
    }) as Order & { attributedInfluencerId: string }
    const result = mapAttributedOrderToInfluencerInput(order)
    expect(result.grossRevenue).toBe(80)
    expect(result.refundAmount).toBe(10)
    expect(result.attributionStatus).toBe('clean_influencer')
    expect(result.returnStatus).toBe('partial_return')
    expect(result.attributedInfluencerId).toBe('inf_01')
  })
})

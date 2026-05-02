import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'
import type { Order } from '@prisma/client'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma.js'
import { fetchAllOrders, fetchAttributedOrders } from '../orders.js'

function makeDbOrder(overrides: Partial<Order> = {}): Order {
  return {
    orderId: 'ord_1',
    orderDate: new Date('2024-03-01'),
    grossRevenue: new Prisma.Decimal('100.00'),
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

const findMany = vi.mocked(prisma.order.findMany)

beforeEach(() => {
  findMany.mockReset()
})

describe('fetchAllOrders', () => {
  it('gibt leeres Array zurück wenn keine Orders vorhanden', async () => {
    findMany.mockResolvedValue([])
    const result = await fetchAllOrders()
    expect(result).toEqual([])
  })

  it('ruft prisma.order.findMany auf', async () => {
    findMany.mockResolvedValue([])
    await fetchAllOrders()
    expect(findMany).toHaveBeenCalledOnce()
  })

  it('mappt eine Order auf OrderInput', async () => {
    findMany.mockResolvedValue([
      makeDbOrder({
        grossRevenue: new Prisma.Decimal('250.00'),
        refundAmount: new Prisma.Decimal('50.00'),
        attributionStatus: 'mixed_code',
        returnStatus: 'partial_return',
      }),
    ])
    const result = await fetchAllOrders()
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      grossRevenue: 250,
      refundAmount: 50,
      attributionStatus: 'mixed_code',
      returnStatus: 'partial_return',
    })
  })

  it('mappt mehrere Orders unabhängig voneinander', async () => {
    findMany.mockResolvedValue([
      makeDbOrder({ orderId: 'ord_1', grossRevenue: new Prisma.Decimal('80.00'), refundAmount: new Prisma.Decimal('0.00'), attributionStatus: 'clean_influencer', returnStatus: 'no_return' }),
      makeDbOrder({ orderId: 'ord_2', grossRevenue: new Prisma.Decimal('120.00'), refundAmount: new Prisma.Decimal('120.00'), attributionStatus: 'unknown', returnStatus: 'full_return' }),
    ])
    const result = await fetchAllOrders()
    expect(result).toHaveLength(2)
    expect(result[0]?.grossRevenue).toBe(80)
    expect(result[1]?.grossRevenue).toBe(120)
    expect(result[1]?.attributionStatus).toBe('unknown')
    expect(result[1]?.returnStatus).toBe('full_return')
  })

  it('enthält nur die vier OrderInput-Felder pro Eintrag', async () => {
    findMany.mockResolvedValue([makeDbOrder()])
    const result = await fetchAllOrders()
    expect(Object.keys(result[0] ?? {})).toEqual(
      expect.arrayContaining(['grossRevenue', 'refundAmount', 'attributionStatus', 'returnStatus']),
    )
    expect(Object.keys(result[0] ?? {})).toHaveLength(4)
  })
})

describe('fetchAttributedOrders', () => {
  it('gibt leeres Array zurück wenn keine Orders vorhanden', async () => {
    findMany.mockResolvedValue([])
    const result = await fetchAttributedOrders()
    expect(result).toEqual([])
  })

  it('ruft findMany mit where-Klausel für attributedInfluencerId und Shopify-Ausschlussfilter auf', async () => {
    findMany.mockResolvedValue([])
    await fetchAttributedOrders()
    expect(findMany).toHaveBeenCalledWith({
      where: {
        attributedInfluencerId: { not: null },
        NOT: { orderId: { startsWith: 'shopify_' } },
      },
    })
  })

  it('mappt attributed Order auf InfluencerOrderInput mit attributedInfluencerId', async () => {
    findMany.mockResolvedValue([
      makeDbOrder({
        grossRevenue: new Prisma.Decimal('90.00'),
        refundAmount: new Prisma.Decimal('10.00'),
        attributionStatus: 'clean_influencer',
        returnStatus: 'partial_return',
        attributedInfluencerId: 'inf_42',
      }),
    ])
    const result = await fetchAttributedOrders()
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      grossRevenue: 90,
      refundAmount: 10,
      attributionStatus: 'clean_influencer',
      returnStatus: 'partial_return',
      attributedInfluencerId: 'inf_42',
    })
  })

  it('mappt mehrere attributed Orders korrekt', async () => {
    findMany.mockResolvedValue([
      makeDbOrder({ orderId: 'ord_1', attributedInfluencerId: 'inf_01', grossRevenue: new Prisma.Decimal('60.00'), refundAmount: new Prisma.Decimal('0.00') }),
      makeDbOrder({ orderId: 'ord_2', attributedInfluencerId: 'inf_02', grossRevenue: new Prisma.Decimal('110.00'), refundAmount: new Prisma.Decimal('0.00') }),
    ])
    const result = await fetchAttributedOrders()
    expect(result).toHaveLength(2)
    expect(result[0]?.attributedInfluencerId).toBe('inf_01')
    expect(result[1]?.attributedInfluencerId).toBe('inf_02')
  })

  it('filtert Orders ohne attributedInfluencerId heraus', async () => {
    findMany.mockResolvedValue([
      makeDbOrder({ orderId: 'ord_1', attributedInfluencerId: 'inf_01' }),
      makeDbOrder({ orderId: 'ord_2', attributedInfluencerId: null }),
    ])
    const result = await fetchAttributedOrders()
    expect(result).toHaveLength(1)
    expect(result[0]?.attributedInfluencerId).toBe('inf_01')
  })
})

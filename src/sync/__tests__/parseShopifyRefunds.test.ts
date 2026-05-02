import { describe, it, expect } from 'vitest'
import { parseShopifyRefunds } from '../parseShopifyRefunds'
import type { ShopifyOrder } from '../shopifyTypes'

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

describe('parseShopifyRefunds', () => {
  it('no_return wenn keine Refunds vorhanden', () => {
    const result = parseShopifyRefunds(makeOrder({ refunds: [] }))
    expect(result.returnStatus).toBe('no_return')
    expect(result.refundAmount).toBe(0)
  })

  it('partial_return bei teilweisem Refund', () => {
    const result = parseShopifyRefunds(
      makeOrder({
        total_price: '100.00',
        refunds: [{ id: 1, refund_line_items: [{ subtotal: '40.00', total_tax: '0' }] }],
      }),
    )
    expect(result.returnStatus).toBe('partial_return')
    expect(result.refundAmount).toBeCloseTo(40)
  })

  it('full_return wenn refundAmount >= total_price', () => {
    const result = parseShopifyRefunds(
      makeOrder({
        total_price: '100.00',
        refunds: [{ id: 1, refund_line_items: [{ subtotal: '100.00', total_tax: '0' }] }],
      }),
    )
    expect(result.returnStatus).toBe('full_return')
  })

  it('summiert refund_line_items über mehrere Refund-Objekte', () => {
    const result = parseShopifyRefunds(
      makeOrder({
        total_price: '200.00',
        refunds: [
          {
            id: 1,
            refund_line_items: [
              { subtotal: '60.00', total_tax: '0' },
              { subtotal: '20.00', total_tax: '0' },
            ],
          },
          { id: 2, refund_line_items: [{ subtotal: '30.00', total_tax: '0' }] },
        ],
      }),
    )
    expect(result.refundAmount).toBeCloseTo(110)
    expect(result.returnStatus).toBe('partial_return')
  })

  it('returnSource tag wenn return-Stichwort in tags', () => {
    const result = parseShopifyRefunds(makeOrder({ tags: 'returned, vip' }))
    expect(result.returnSource).toBe('tag')
  })

  it('returnSource none ohne return-Stichwort', () => {
    const result = parseShopifyRefunds(makeOrder({ tags: 'vip, sale' }))
    expect(result.returnSource).toBe('none')
  })
})

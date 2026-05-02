import { describe, it, expect } from 'vitest'
import { calculateOrderMetrics, calculateRevenueByAttributionStatus } from '../orderMetrics.js'
import type { OrderInput } from '../orderMetrics.js'

const clean = (grossRevenue: number, refundAmount: number): OrderInput => ({
  grossRevenue,
  refundAmount,
  returnStatus: refundAmount === 0 ? 'no_return' : refundAmount === grossRevenue ? 'full_return' : 'partial_return',
  attributionStatus: 'clean_influencer',
})

const mixed = (grossRevenue: number, refundAmount: number): OrderInput => ({
  ...clean(grossRevenue, refundAmount),
  attributionStatus: 'mixed_code',
})

const unknown = (grossRevenue: number): OrderInput => ({
  grossRevenue,
  refundAmount: 0,
  returnStatus: 'no_return',
  attributionStatus: 'unknown',
})

describe('calculateOrderMetrics – leere Liste', () => {
  it('gibt Nullwerte zurück', () => {
    const m = calculateOrderMetrics([])
    expect(m.orderCount).toBe(0)
    expect(m.grossRevenue).toBe(0)
    expect(m.refundSum).toBe(0)
    expect(m.netRevenue).toBe(0)
    expect(m.returnRateByCount).toBe(0)
    expect(m.returnRateByValue).toBe(0)
    expect(m.attribution.total).toBe(0)
  })
})

describe('calculateOrderMetrics – Umsatz und Retouren', () => {
  it('brutto, refund und netto korrekt aggregiert', () => {
    const orders: OrderInput[] = [
      clean(100, 0),
      clean(200, 50),
      clean(150, 150),
    ]
    const m = calculateOrderMetrics(orders)
    expect(m.grossRevenue).toBe(450)
    expect(m.refundSum).toBe(200)
    expect(m.netRevenue).toBe(250)
  })

  it('returnRateByCount: 2 von 3 Orders haben Retoure', () => {
    const orders: OrderInput[] = [
      clean(100, 0),
      clean(200, 50),
      clean(150, 150),
    ]
    const m = calculateOrderMetrics(orders)
    expect(m.returnRateByCount).toBeCloseTo(2 / 3)
  })

  it('returnRateByValue: refund / brutto', () => {
    const orders: OrderInput[] = [
      clean(200, 50),
      clean(200, 50),
    ]
    const m = calculateOrderMetrics(orders)
    expect(m.returnRateByValue).toBeCloseTo(100 / 400)
  })

  it('kein refund → returnRateByValue = 0', () => {
    const m = calculateOrderMetrics([clean(100, 0), clean(200, 0)])
    expect(m.returnRateByValue).toBe(0)
  })
})

describe('calculateOrderMetrics – Attribution', () => {
  it('zählt Statuses korrekt', () => {
    const orders: OrderInput[] = [
      clean(100, 0),
      clean(100, 0),
      mixed(100, 0),
      unknown(100),
    ]
    const m = calculateOrderMetrics(orders)
    expect(m.attribution.clean_influencer).toBe(2)
    expect(m.attribution.mixed_code).toBe(1)
    expect(m.attribution.unknown).toBe(1)
    expect(m.attribution.total).toBe(4)
  })

  it('Anteile summieren sich auf 1', () => {
    const orders: OrderInput[] = [
      clean(100, 0),
      mixed(100, 0),
      unknown(100),
      unknown(100),
    ]
    const m = calculateOrderMetrics(orders)
    const sum = m.attributionRatios.clean_influencer + m.attributionRatios.mixed_code + m.attributionRatios.unknown
    expect(sum).toBeCloseTo(1)
  })
})

describe('calculateRevenueByAttributionStatus', () => {
  it('summiert Umsatz und Netto je Status', () => {
    const orders: OrderInput[] = [
      clean(100, 0),
      clean(200, 50),
      mixed(150, 30),
      unknown(80),
    ]
    const rev = calculateRevenueByAttributionStatus(orders)
    expect(rev.clean_influencer.grossRevenue).toBe(300)
    expect(rev.clean_influencer.netRevenue).toBe(250)
    expect(rev.mixed_code.grossRevenue).toBe(150)
    expect(rev.mixed_code.netRevenue).toBe(120)
    expect(rev.unknown.grossRevenue).toBe(80)
    expect(rev.unknown.netRevenue).toBe(80)
  })

  it('leere Liste → alle Werte 0', () => {
    const rev = calculateRevenueByAttributionStatus([])
    expect(rev.clean_influencer.grossRevenue).toBe(0)
    expect(rev.mixed_code.netRevenue).toBe(0)
    expect(rev.unknown.grossRevenue).toBe(0)
  })
})

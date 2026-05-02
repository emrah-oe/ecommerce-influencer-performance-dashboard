import { describe, it, expect } from 'vitest'
import { calculateSummaryMetrics } from '../summaryMetrics.js'
import { groupMetricsByInfluencer, type InfluencerOrderInput } from '../influencerMetrics.js'

const order = (
  influencerId: string,
  grossRevenue: number,
  refundAmount: number,
  attribution: InfluencerOrderInput['attributionStatus'] = 'clean_influencer',
): InfluencerOrderInput => ({
  attributedInfluencerId: influencerId,
  grossRevenue,
  refundAmount,
  returnStatus:
    refundAmount === 0
      ? 'no_return'
      : refundAmount === grossRevenue
        ? 'full_return'
        : 'partial_return',
  attributionStatus: attribution,
})

describe('calculateSummaryMetrics – leere Map', () => {
  it('gibt Nullwerte zurück', () => {
    const s = calculateSummaryMetrics(new Map())
    expect(s.influencerCount).toBe(0)
    expect(s.orderCount).toBe(0)
    expect(s.grossRevenue).toBe(0)
    expect(s.refundSum).toBe(0)
    expect(s.netRevenue).toBe(0)
    expect(s.returnRateByCount).toBe(0)
    expect(s.returnRateByValue).toBe(0)
    expect(s.attribution.total).toBe(0)
  })
})

describe('calculateSummaryMetrics – ein Influencer', () => {
  it('aggregiert Umsatz und Retouren korrekt', () => {
    const map = groupMetricsByInfluencer([
      order('inf-1', 100, 0),
      order('inf-1', 200, 50),
    ])
    const s = calculateSummaryMetrics(map)
    expect(s.influencerCount).toBe(1)
    expect(s.orderCount).toBe(2)
    expect(s.grossRevenue).toBe(300)
    expect(s.refundSum).toBe(50)
    expect(s.netRevenue).toBe(250)
  })
})

describe('calculateSummaryMetrics – mehrere Influencer', () => {
  it('summiert über alle Influencer hinweg', () => {
    const map = groupMetricsByInfluencer([
      order('inf-1', 100, 0),
      order('inf-1', 200, 50),
      order('inf-2', 300, 100),
      order('inf-3', 150, 150),
    ])
    const s = calculateSummaryMetrics(map)
    expect(s.influencerCount).toBe(3)
    expect(s.orderCount).toBe(4)
    expect(s.grossRevenue).toBe(750)
    expect(s.refundSum).toBe(300)
    expect(s.netRevenue).toBe(450)
  })

  it('returnRateByValue: refundSum / grossRevenue', () => {
    const map = groupMetricsByInfluencer([
      order('inf-1', 200, 100),
      order('inf-2', 200, 100),
    ])
    const s = calculateSummaryMetrics(map)
    expect(s.returnRateByValue).toBeCloseTo(200 / 400)
  })

  it('attribution wird über alle Influencer aggregiert', () => {
    const map = groupMetricsByInfluencer([
      order('inf-1', 100, 0, 'clean_influencer'),
      order('inf-1', 100, 0, 'clean_influencer'),
      order('inf-2', 100, 0, 'mixed_code'),
      order('inf-3', 100, 0, 'unknown'),
    ])
    const s = calculateSummaryMetrics(map)
    expect(s.attribution.clean_influencer).toBe(2)
    expect(s.attribution.mixed_code).toBe(1)
    expect(s.attribution.unknown).toBe(1)
    expect(s.attribution.total).toBe(4)
  })

  it('attributionRatios summieren sich auf 1', () => {
    const map = groupMetricsByInfluencer([
      order('inf-1', 100, 0, 'clean_influencer'),
      order('inf-2', 100, 0, 'mixed_code'),
      order('inf-3', 100, 0, 'unknown'),
      order('inf-3', 100, 0, 'unknown'),
    ])
    const s = calculateSummaryMetrics(map)
    const sum =
      s.attributionRatios.clean_influencer +
      s.attributionRatios.mixed_code +
      s.attributionRatios.unknown
    expect(sum).toBeCloseTo(1)
  })

  it('influencerCount entspricht Map-Größe', () => {
    const map = groupMetricsByInfluencer([
      order('inf-1', 100, 0),
      order('inf-2', 100, 0),
      order('inf-3', 100, 0),
    ])
    expect(calculateSummaryMetrics(map).influencerCount).toBe(3)
  })
})

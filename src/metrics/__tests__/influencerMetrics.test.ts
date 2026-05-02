import { describe, it, expect } from 'vitest'
import {
  calculateInfluencerMetrics,
  groupMetricsByInfluencer,
  type InfluencerOrderInput,
} from '../influencerMetrics.js'

const order = (
  influencerId: string,
  grossRevenue: number,
  refundAmount: number,
): InfluencerOrderInput => ({
  attributedInfluencerId: influencerId,
  grossRevenue,
  refundAmount,
  returnStatus: refundAmount === 0 ? 'no_return' : refundAmount === grossRevenue ? 'full_return' : 'partial_return',
  attributionStatus: 'clean_influencer',
})

describe('calculateInfluencerMetrics', () => {
  it('enthält influencerId und korrekte Kennzahlen', () => {
    const orders = [order('inf-1', 100, 0), order('inf-1', 200, 50)]
    const m = calculateInfluencerMetrics('inf-1', orders)
    expect(m.influencerId).toBe('inf-1')
    expect(m.orderMetrics.orderCount).toBe(2)
    expect(m.orderMetrics.grossRevenue).toBe(300)
    expect(m.orderMetrics.netRevenue).toBe(250)
  })

  it('leere Order-Liste → Nullwerte', () => {
    const m = calculateInfluencerMetrics('inf-empty', [])
    expect(m.orderMetrics.orderCount).toBe(0)
    expect(m.orderMetrics.grossRevenue).toBe(0)
  })

  it('revenueByAttribution korrekt befüllt', () => {
    const orders = [order('inf-1', 100, 0), order('inf-1', 200, 40)]
    const m = calculateInfluencerMetrics('inf-1', orders)
    expect(m.revenueByAttribution.clean_influencer.grossRevenue).toBe(300)
    expect(m.revenueByAttribution.clean_influencer.netRevenue).toBe(260)
    expect(m.revenueByAttribution.mixed_code.grossRevenue).toBe(0)
    expect(m.revenueByAttribution.unknown.grossRevenue).toBe(0)
  })
})

describe('groupMetricsByInfluencer', () => {
  it('gruppiert Orders nach influencerId', () => {
    const orders: InfluencerOrderInput[] = [
      order('inf-1', 100, 0),
      order('inf-1', 200, 50),
      order('inf-2', 150, 0),
    ]
    const map = groupMetricsByInfluencer(orders)
    expect(map.size).toBe(2)
    expect(map.get('inf-1')?.orderMetrics.orderCount).toBe(2)
    expect(map.get('inf-2')?.orderMetrics.orderCount).toBe(1)
  })

  it('Kennzahlen je Influencer korrekt', () => {
    const orders: InfluencerOrderInput[] = [
      order('inf-1', 100, 0),
      order('inf-1', 200, 50),
      order('inf-2', 300, 100),
    ]
    const map = groupMetricsByInfluencer(orders)
    const inf1 = map.get('inf-1')
    const inf2 = map.get('inf-2')
    expect(inf1?.orderMetrics.grossRevenue).toBe(300)
    expect(inf1?.orderMetrics.netRevenue).toBe(250)
    expect(inf2?.orderMetrics.grossRevenue).toBe(300)
    expect(inf2?.orderMetrics.netRevenue).toBe(200)
  })

  it('leere Liste → leere Map', () => {
    expect(groupMetricsByInfluencer([]).size).toBe(0)
  })

  it('einzelner Influencer mit Vollretoure', () => {
    const orders: InfluencerOrderInput[] = [order('inf-3', 100, 100)]
    const map = groupMetricsByInfluencer(orders)
    expect(map.get('inf-3')?.orderMetrics.netRevenue).toBe(0)
    expect(map.get('inf-3')?.orderMetrics.returnRateByCount).toBe(1)
  })
})

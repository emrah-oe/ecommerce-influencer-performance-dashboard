import { describe, it, expect } from 'vitest'
import { generateOrders } from '../lib/orders.js'
import { generateInfluencers } from '../lib/influencers.js'
import { createPrng } from '../lib/prng.js'
import { DEFAULT_CONFIG } from '../config.js'

describe('generateOrders', () => {
  const prng = createPrng(42)
  const influencers = generateInfluencers(DEFAULT_CONFIG, prng)
  const orders = generateOrders(DEFAULT_CONFIG, influencers, prng)
  const ec6InfluencerId = influencers[influencers.length - 1]!.id

  it('erzeugt genau ordersPerMonth × simulatedMonths Orders', () => {
    expect(orders).toHaveLength(DEFAULT_CONFIG.ordersPerMonth * DEFAULT_CONFIG.simulatedMonths)
  })

  it('enthält genau 6 Edge-Case-Orders', () => {
    expect(orders.filter(o => o.isEdgeCase)).toHaveLength(6)
  })

  it('jeder Simulationsmonat enthält exakt ordersPerMonth Orders', () => {
    const byMonth: Record<string, number> = {}
    for (const o of orders) {
      const m = o.orderDate.slice(0, 7)
      byMonth[m] = (byMonth[m] ?? 0) + 1
    }
    for (const count of Object.values(byMonth)) {
      expect(count).toBe(DEFAULT_CONFIG.ordersPerMonth)
    }
    expect(Object.keys(byMonth)).toHaveLength(DEFAULT_CONFIG.simulatedMonths)
  })

  it('EC6-Influencer hat mindestens eine Edge-Case-Order', () => {
    const ec6Orders = orders.filter(o => o.attributedInfluencerId === ec6InfluencerId)
    const ec6EdgeCases = ec6Orders.filter(o => o.isEdgeCase)
    expect(ec6EdgeCases.length).toBeGreaterThanOrEqual(1)
  })

  it('EC6-Influencer hat zusätzlich reguläre Orders', () => {
    const ec6Orders = orders.filter(o => o.attributedInfluencerId === ec6InfluencerId)
    const ec6Regular = ec6Orders.filter(o => !o.isEdgeCase)
    expect(ec6Regular.length).toBeGreaterThan(0)
  })

  it('kein Influencer besteht ausschließlich aus Edge-Case-Orders', () => {
    for (const inf of influencers) {
      const infOrders = orders.filter(o => o.attributedInfluencerId === inf.id)
      if (infOrders.length === 0) continue
      const hasRegular = infOrders.some(o => !o.isEdgeCase)
      expect(hasRegular).toBe(true)
    }
  })

  it('no_return → refundAmount=0', () => {
    const noReturn = orders.filter(o => o.returnStatus === 'no_return' && !o.isEdgeCase)
    expect(noReturn.every(o => o.refundAmount === 0)).toBe(true)
  })

  it('full_return → refundAmount=grossRevenue', () => {
    const fullReturn = orders.filter(o => o.returnStatus === 'full_return' && !o.isEdgeCase)
    expect(fullReturn.every(o => Math.abs(o.refundAmount - o.grossRevenue) < 0.001)).toBe(true)
  })

  it('partial_return → 0 < refundAmount < grossRevenue', () => {
    const partial = orders.filter(o => o.returnStatus === 'partial_return' && !o.isEdgeCase)
    expect(partial.every(o => o.refundAmount > 0 && o.refundAmount < o.grossRevenue)).toBe(true)
  })

  it('no_return → returnSource=none', () => {
    const noReturn = orders.filter(o => o.returnStatus === 'no_return' && !o.isEdgeCase)
    expect(noReturn.every(o => o.returnSource === 'none')).toBe(true)
  })

  it('Retoure → returnSource ∈ {tag, metafield}', () => {
    const withReturn = orders.filter(o => o.returnStatus !== 'no_return' && !o.isEdgeCase)
    expect(withReturn.every(o => o.returnSource === 'tag' || o.returnSource === 'metafield')).toBe(true)
  })

  it('unknown → attributedInfluencerId=null', () => {
    const unknownOrders = orders.filter(o => o.attributionStatus === 'unknown' && !o.isEdgeCase)
    expect(unknownOrders.every(o => o.attributedInfluencerId === null)).toBe(true)
  })

  it('predominantly_clean Influencer haben pMixed < 0.12', () => {
    const pureInfluencers = influencers.filter(i => i.profileClass === 'predominantly_clean')
    expect(pureInfluencers.every(i => i.attributionProfile.pMixed < 0.12)).toBe(true)
  })

  it('extreme_risk Influencer haben pMixed > 0.75', () => {
    const extremeInfluencers = influencers.filter(i => i.profileClass === 'extreme_risk')
    expect(extremeInfluencers.every(i => i.attributionProfile.pMixed > 0.75)).toBe(true)
  })

  it('Attributionsstatus-Quoten liegen im plausiblen Bereich', () => {
    const regular = orders.filter(o => !o.isEdgeCase)
    const total = regular.length
    const clean = regular.filter(o => o.attributionStatus === 'clean_influencer').length / total
    const mixed = regular.filter(o => o.attributionStatus === 'mixed_code').length / total
    const unknown = regular.filter(o => o.attributionStatus === 'unknown').length / total
    expect(clean).toBeGreaterThan(0.32)
    expect(clean).toBeLessThan(0.60)
    expect(mixed).toBeGreaterThan(0.18)
    expect(mixed).toBeLessThan(0.44)
    expect(unknown).toBeGreaterThan(0.12)
    expect(unknown).toBeLessThan(0.34)
  })

  it('grossRevenue > 0 für regelbasierte Orders', () => {
    expect(orders.filter(o => !o.isEdgeCase).every(o => o.grossRevenue > 0)).toBe(true)
  })
})

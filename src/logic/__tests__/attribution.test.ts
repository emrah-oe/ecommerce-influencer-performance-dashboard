import { describe, it, expect } from 'vitest'
import {
  deriveAttributionStatus,
  countByAttributionStatus,
  calculateAttributionRatios,
  isReliableAttribution,
} from '../attribution.js'

describe('deriveAttributionStatus', () => {
  it('kein Rabattcode → unknown', () => {
    expect(deriveAttributionStatus(false, null, null)).toBe('unknown')
  })

  it('Rabattcode gesetzt, aber kein Influencer gefunden → unknown', () => {
    expect(deriveAttributionStatus(true, 'CODE123', null)).toBe('unknown')
  })

  it('hasDiscountCode false, aber Code-String vorhanden → unknown', () => {
    expect(deriveAttributionStatus(false, 'CODE123', { isMixed: false })).toBe('unknown')
  })

  it('usedDiscountCode null, Influencer vorhanden → unknown', () => {
    expect(deriveAttributionStatus(true, null, { isMixed: false })).toBe('unknown')
  })

  it('sauberer Influencer → clean_influencer', () => {
    expect(deriveAttributionStatus(true, 'INF01', { isMixed: false })).toBe('clean_influencer')
  })

  it('gemischter Influencer → mixed_code', () => {
    expect(deriveAttributionStatus(true, 'SHARED', { isMixed: true })).toBe('mixed_code')
  })
})

describe('countByAttributionStatus', () => {
  it('leere Liste → alle Zähler 0, total 0', () => {
    const result = countByAttributionStatus([])
    expect(result.clean_influencer).toBe(0)
    expect(result.mixed_code).toBe(0)
    expect(result.unknown).toBe(0)
    expect(result.total).toBe(0)
  })

  it('zählt jeden Status korrekt', () => {
    const result = countByAttributionStatus([
      'clean_influencer',
      'clean_influencer',
      'mixed_code',
      'unknown',
    ])
    expect(result.clean_influencer).toBe(2)
    expect(result.mixed_code).toBe(1)
    expect(result.unknown).toBe(1)
    expect(result.total).toBe(4)
  })

  it('nur unknown-Einträge', () => {
    const result = countByAttributionStatus(['unknown', 'unknown', 'unknown'])
    expect(result.unknown).toBe(3)
    expect(result.clean_influencer).toBe(0)
    expect(result.mixed_code).toBe(0)
    expect(result.total).toBe(3)
  })
})

describe('calculateAttributionRatios', () => {
  it('leere Verteilung → alle Anteile 0', () => {
    const ratios = calculateAttributionRatios({
      clean_influencer: 0,
      mixed_code: 0,
      unknown: 0,
      total: 0,
    })
    expect(ratios.clean_influencer).toBe(0)
    expect(ratios.mixed_code).toBe(0)
    expect(ratios.unknown).toBe(0)
  })

  it('Anteile summieren sich auf 1', () => {
    const ratios = calculateAttributionRatios({
      clean_influencer: 2,
      mixed_code: 1,
      unknown: 1,
      total: 4,
    })
    expect(ratios.clean_influencer).toBe(0.5)
    expect(ratios.mixed_code).toBe(0.25)
    expect(ratios.unknown).toBe(0.25)
    expect(ratios.clean_influencer + ratios.mixed_code + ratios.unknown).toBeCloseTo(1)
  })

  it('100 % clean_influencer', () => {
    const ratios = calculateAttributionRatios({
      clean_influencer: 10,
      mixed_code: 0,
      unknown: 0,
      total: 10,
    })
    expect(ratios.clean_influencer).toBe(1)
    expect(ratios.mixed_code).toBe(0)
    expect(ratios.unknown).toBe(0)
  })
})

describe('isReliableAttribution', () => {
  it('clean_influencer → true', () => {
    expect(isReliableAttribution('clean_influencer')).toBe(true)
  })

  it('mixed_code → false', () => {
    expect(isReliableAttribution('mixed_code')).toBe(false)
  })

  it('unknown → false', () => {
    expect(isReliableAttribution('unknown')).toBe(false)
  })
})

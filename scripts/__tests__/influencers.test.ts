import { describe, it, expect } from 'vitest'
import { generateInfluencers } from '../lib/influencers.js'
import { createPrng } from '../lib/prng.js'
import { DEFAULT_CONFIG } from '../config.js'

describe('generateInfluencers', () => {
  const prng = createPrng(42)
  const influencers = generateInfluencers(DEFAULT_CONFIG, prng)

  it('erzeugt genau 30 Influencer', () => {
    expect(influencers).toHaveLength(30)
  })

  it('Handle-Format: erster und letzter Influencer', () => {
    expect(influencers[0]!.handle).toBe('alex_move')
    expect(influencers[29]!.handle).toBe('tom_tailored')
  })

  it('Tier-Anzahlen: 3 top, 7 mid, 20 long_tail', () => {
    expect(influencers.filter(i => i.volumeClass === 'top')).toHaveLength(3)
    expect(influencers.filter(i => i.volumeClass === 'mid')).toHaveLength(7)
    expect(influencers.filter(i => i.volumeClass === 'long_tail')).toHaveLength(20)
  })

  it('profileClass-Verteilung: 12/10/6/2', () => {
    expect(influencers.filter(i => i.profileClass === 'predominantly_clean')).toHaveLength(12)
    expect(influencers.filter(i => i.profileClass === 'moderately_mixed')).toHaveLength(10)
    expect(influencers.filter(i => i.profileClass === 'heavily_mixed')).toHaveLength(6)
    expect(influencers.filter(i => i.profileClass === 'extreme_risk')).toHaveLength(2)
  })

  it('isMixed ist korrekt aus profileClass abgeleitet', () => {
    for (const inf of influencers) {
      expect(inf.isMixed).toBe(inf.profileClass !== 'predominantly_clean')
    }
  })

  it('AttributionProfile normalisiert: pClean + pMixed + pUnknown ≈ 1', () => {
    for (const inf of influencers) {
      const sum = inf.attributionProfile.pClean
        + inf.attributionProfile.pMixed
        + inf.attributionProfile.pUnknown
      expect(sum).toBeCloseTo(1.0, 10)
    }
  })

  it('DiscountCode.influencerId stimmt mit Influencer.id überein', () => {
    for (const inf of influencers) {
      expect(inf.discountCode.influencerId).toBe(inf.id)
      expect(inf.discountCode.isMixed).toBe(inf.isMixed)
    }
  })

  it('Return-Profile summieren auf 1.0', () => {
    for (const inf of influencers) {
      const sum = inf.returnProfile.noReturnRatio
        + inf.returnProfile.partialReturnRatio
        + inf.returnProfile.fullReturnRatio
      expect(sum).toBeCloseTo(1.0, 10)
    }
  })

  it('deterministisch bei gleichem Seed', () => {
    const prng2 = createPrng(42)
    const influencers2 = generateInfluencers(DEFAULT_CONFIG, prng2)
    expect(influencers[0]!.returnProfile).toEqual(influencers2[0]!.returnProfile)
    expect(influencers[0]!.attributionProfile).toEqual(influencers2[0]!.attributionProfile)
  })
})

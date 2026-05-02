import { describe, it, expect } from 'vitest'
import { createPrng, sampleLognormal } from '../lib/prng.js'

describe('createPrng', () => {
  it('gibt Werte im Intervall [0, 1) zurück', () => {
    const prng = createPrng(42)
    const val = prng()
    expect(val).toBeGreaterThanOrEqual(0)
    expect(val).toBeLessThan(1)
  })

  it('liefert bei gleichem Seed identische Sequenz', () => {
    const a = createPrng(42)
    const b = createPrng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('liefert bei unterschiedlichem Seed unterschiedliche erste Werte', () => {
    expect(createPrng(42)()).not.toBe(createPrng(99)())
  })
})

describe('sampleLognormal', () => {
  it('liefert positiven Wert', () => {
    const prng = createPrng(42)
    expect(sampleLognormal(prng, 75, 0.7)).toBeGreaterThan(0)
  })

  it('Stichprobenmittel liegt in plausiblem Bereich um avgOrderValue (n=10000)', () => {
    const prng = createPrng(42)
    const samples = Array.from({ length: 10000 }, () => sampleLognormal(prng, 75, 0.7))
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length
    expect(mean).toBeGreaterThan(60)
    expect(mean).toBeLessThan(100)
  })

  it('Median liegt unter Mittelwert (Rechtsschiefe)', () => {
    const prng = createPrng(42)
    const sorted = Array.from({ length: 1000 }, () => sampleLognormal(prng, 75, 0.7))
      .sort((a, b) => a - b)
    const median = sorted[500]!
    const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length
    expect(median).toBeLessThan(mean)
  })
})

export function createPrng(seed: number): () => number {
  let s = seed >>> 0
  return (): number => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

export function sampleLognormal(
  prng: () => number,
  avgOrderValue: number,
  logSigma: number,
): number {
  const muLn = Math.log(avgOrderValue) - (logSigma * logSigma) / 2
  // Box-Muller: zwei uniforme Zufallszahlen → eine normalverteilte Zahl
  const u1 = Math.max(prng(), 1e-10) // Schutz vor log(0)
  const u2 = prng()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return Math.exp(muLn + logSigma * z)
}

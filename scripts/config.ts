export interface GeneratorConfig {
  seed: number
  simulatedMonths: number
  ordersPerMonth: number
  influencerCount: number
  topTierCount: number
  midTierCount: number
  noReturnRatio: number
  partialReturnRatio: number
  avgOrderValue: number
  orderValueDistribution: 'lognormal' | 'pareto'
  orderValueLogSigma: number
  temporalModel: 'flat' | 'weekly' | 'campaign'
  returnSourceTagRatio: number
  startYear: number
  startMonth: number
}

export const DEFAULT_CONFIG: GeneratorConfig = {
  seed: 42,
  simulatedMonths: 3,
  ordersPerMonth: 8000,
  influencerCount: 30,
  topTierCount: 3,
  midTierCount: 7,
  noReturnRatio: 0.75,
  partialReturnRatio: 0.15,
  avgOrderValue: 75,
  orderValueDistribution: 'lognormal',
  orderValueLogSigma: 0.7,
  temporalModel: 'weekly',
  returnSourceTagRatio: 0.6,
  startYear: 2026,
  startMonth: 1,
}

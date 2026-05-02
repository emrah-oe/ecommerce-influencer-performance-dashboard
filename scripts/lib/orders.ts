import type { GeneratorConfig } from '../config.js'
import type { Influencer, Order, ReturnStatus, ReturnSource } from './types.js'
import { sampleLognormal } from './prng.js'
import type { createPrng } from './prng.js'

type Prng = ReturnType<typeof createPrng>

// Wochentagsgewichte Mo(0)…So(6)
const WEEKLY_WEIGHTS = [1.2, 1.3, 1.2, 1.1, 1.3, 0.9, 0.7]

function pickWeighted(prng: Prng, weights: number[]): number {
  const total = weights.reduce((s, w) => s + w, 0)
  let r = prng() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!
    if (r <= 0) return i
  }
  return weights.length - 1
}

function randomDate(prng: Prng, year: number, month: number): string {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const dayWeights = Array.from({ length: daysInMonth }, (_, d) => {
    const dow = new Date(Date.UTC(year, month - 1, d + 1)).getUTCDay()
    return WEEKLY_WEIGHTS[dow === 0 ? 6 : dow - 1]!
  })
  const day = pickWeighted(prng, dayWeights) + 1
  const hour = Math.floor(prng() * 24)
  const min = Math.floor(prng() * 60)
  const sec = Math.floor(prng() * 60)
  return new Date(Date.UTC(year, month - 1, day, hour, min, sec)).toISOString()
}

function pickReturnStatus(prng: Prng, profile: Influencer['returnProfile']): ReturnStatus {
  const r = prng()
  if (r < profile.noReturnRatio) return 'no_return'
  if (r < profile.noReturnRatio + profile.partialReturnRatio) return 'partial_return'
  return 'full_return'
}

function calcRefundAmount(prng: Prng, returnStatus: ReturnStatus, grossRevenue: number): number {
  if (returnStatus === 'no_return') return 0
  if (returnStatus === 'full_return') return grossRevenue
  return grossRevenue * (0.10 + prng() * 0.70) // 10–80 %
}

function calcReturnSource(prng: Prng, returnStatus: ReturnStatus, tagRatio: number): ReturnSource {
  if (returnStatus === 'no_return') return 'none'
  return prng() < tagRatio ? 'tag' : 'metafield'
}

// Pareto-Basisgewichte je Influencer: top 40 %, mid 35 %, long_tail 25 %
function buildVolumeWeights(config: GeneratorConfig, influencers: Influencer[]): number[] {
  const ltCount = config.influencerCount - config.topTierCount - config.midTierCount
  return influencers.map(inf => {
    if (inf.volumeClass === 'top') return 0.40 / config.topTierCount
    if (inf.volumeClass === 'mid') return 0.35 / config.midTierCount
    return 0.25 / ltCount
  })
}

let orderCounter = 0

function nextOrderId(): string {
  return `ord_${String(++orderCounter).padStart(6, '0')}`
}

function buildRegularOrder(
  prng: Prng,
  config: GeneratorConfig,
  influencer: Influencer,
  year: number,
  month: number,
): Order {
  const grossRevenue = Math.round(
    sampleLognormal(prng, config.avgOrderValue, config.orderValueLogSigma) * 100
  ) / 100

  const returnStatus = pickReturnStatus(prng, influencer.returnProfile)
  const refundAmount = Math.round(calcRefundAmount(prng, returnStatus, grossRevenue) * 100) / 100
  const returnSource = calcReturnSource(prng, returnStatus, config.returnSourceTagRatio)

  const { pClean, pMixed } = influencer.attributionProfile
  const attrRoll = prng()
  let attributedInfluencerId: string | null = null
  let usedDiscountCode: string | null = null
  let hasDiscountCode = false
  let attributionStatus: Order['attributionStatus'] = 'unknown'

  if (attrRoll < pClean) {
    attributionStatus = 'clean_influencer'
    hasDiscountCode = true
    usedDiscountCode = influencer.discountCode.code
    attributedInfluencerId = influencer.id
  } else if (attrRoll < pClean + pMixed) {
    attributionStatus = 'mixed_code'
    hasDiscountCode = true
    usedDiscountCode = influencer.discountCode.code
    attributedInfluencerId = influencer.id
  }

  const rawTags = returnSource === 'tag' ? ['return', `return_${returnStatus}`] : []
  const rawMetafields: Record<string, string> = returnSource === 'metafield'
    ? { return_status: returnStatus }
    : {}

  return {
    orderId: nextOrderId(),
    orderDate: randomDate(prng, year, month),
    grossRevenue,
    hasDiscountCode,
    usedDiscountCode,
    attributionStatus,
    attributedInfluencerId,
    returnStatus,
    refundAmount,
    returnSource,
    rawTags,
    rawMetafields,
    rawOrderPayload: {},
    isEdgeCase: false,
  }
}

// Erzeugt 6 Edge-Case-Templates ohne orderDate (wird beim Einsetzen in den Monatsslot vergeben).
type OrderTemplate = Omit<Order, 'orderDate'>

function buildEdgeCaseTemplates(
  prng: Prng,
  config: GeneratorConfig,
  influencers: Influencer[],
): OrderTemplate[] {
  const top = influencers.find(i => i.volumeClass === 'top')!
  const mixed = influencers.find(i => i.isMixed)!
  // EC6-Influencer = letzter Influencer (Index influencerCount-1), Long-Tail, selten genutzter Code
  const rareLt = influencers[config.influencerCount - 1]!

  // EC1: clean, full_return, P99+-Bestellwert
  const gr1 = Math.round(sampleLognormal(prng, config.avgOrderValue * 8, 0.2) * 100) / 100
  const ec1: OrderTemplate = {
    orderId: nextOrderId(),
    grossRevenue: gr1,
    hasDiscountCode: true,
    usedDiscountCode: top.discountCode.code,
    attributionStatus: 'clean_influencer',
    attributedInfluencerId: top.id,
    returnStatus: 'full_return',
    refundAmount: gr1,
    returnSource: 'tag',
    rawTags: ['return', 'return_full_return'],
    rawMetafields: {},
    rawOrderPayload: {},
    isEdgeCase: true,
  }

  // EC2: kein Code, unknown, no_return
  const gr2 = Math.round(sampleLognormal(prng, config.avgOrderValue, config.orderValueLogSigma) * 100) / 100
  const ec2: OrderTemplate = {
    orderId: nextOrderId(),
    grossRevenue: gr2,
    hasDiscountCode: false,
    usedDiscountCode: null,
    attributionStatus: 'unknown',
    attributedInfluencerId: null,
    returnStatus: 'no_return',
    refundAmount: 0,
    returnSource: 'none',
    rawTags: [],
    rawMetafields: {},
    rawOrderPayload: {},
    isEdgeCase: true,
  }

  // EC3: mixed_code
  const gr3 = Math.round(sampleLognormal(prng, config.avgOrderValue, config.orderValueLogSigma) * 100) / 100
  const ec3: OrderTemplate = {
    orderId: nextOrderId(),
    grossRevenue: gr3,
    hasDiscountCode: true,
    usedDiscountCode: mixed.discountCode.code,
    attributionStatus: 'mixed_code',
    attributedInfluencerId: mixed.id,
    returnStatus: 'no_return',
    refundAmount: 0,
    returnSource: 'none',
    rawTags: [],
    rawMetafields: {},
    rawOrderPayload: {},
    isEdgeCase: true,
  }

  // EC4: widersprüchlich – rawTags enthält Retourentag, returnStatus=no_return
  const gr4 = Math.round(sampleLognormal(prng, config.avgOrderValue, config.orderValueLogSigma) * 100) / 100
  const ec4: OrderTemplate = {
    orderId: nextOrderId(),
    grossRevenue: gr4,
    hasDiscountCode: true,
    usedDiscountCode: top.discountCode.code,
    attributionStatus: 'clean_influencer',
    attributedInfluencerId: top.id,
    returnStatus: 'no_return',
    refundAmount: 0,
    returnSource: 'none',
    rawTags: ['return', 'return_partial_return'], // widersprüchlich zu returnStatus
    rawMetafields: {},
    rawOrderPayload: {},
    isEdgeCase: true,
  }

  // EC5: Top-Tier, hoher Wert, full_return (wirtschaftlich schwach)
  const gr5 = Math.round(sampleLognormal(prng, config.avgOrderValue * 4, 0.3) * 100) / 100
  const ec5: OrderTemplate = {
    orderId: nextOrderId(),
    grossRevenue: gr5,
    hasDiscountCode: true,
    usedDiscountCode: top.discountCode.code,
    attributionStatus: 'clean_influencer',
    attributedInfluencerId: top.id,
    returnStatus: 'full_return',
    refundAmount: gr5,
    returnSource: 'metafield',
    rawTags: [],
    rawMetafields: { return_status: 'full_return' },
    rawOrderPayload: {},
    isEdgeCase: true,
  }

  // EC6: Long-Tail-Influencer rareLt, einzige Order dieses Influencers
  const gr6 = Math.round(sampleLognormal(prng, config.avgOrderValue, config.orderValueLogSigma) * 100) / 100
  const ec6: OrderTemplate = {
    orderId: nextOrderId(),
    grossRevenue: gr6,
    hasDiscountCode: true,
    usedDiscountCode: rareLt.discountCode.code,
    attributionStatus: 'clean_influencer',
    attributedInfluencerId: rareLt.id,
    returnStatus: 'no_return',
    refundAmount: 0,
    returnSource: 'none',
    rawTags: [],
    rawMetafields: {},
    rawOrderPayload: {},
    isEdgeCase: true,
  }

  return [ec1, ec2, ec3, ec4, ec5, ec6]
}

export function generateOrders(
  config: GeneratorConfig,
  influencers: Influencer[],
  prng: Prng,
): Order[] {
  orderCounter = 0

  const regularWeights = buildVolumeWeights(config, influencers)

  // Edge-Case-Templates vorab bauen (ohne orderDate)
  const ecTemplates = buildEdgeCaseTemplates(prng, config, influencers)

  // Verteilung der 6 Edge Cases auf Monate:
  // Monat m bekommt ecPerMonth[m] Edge Cases.
  // Für simulatedMonths=3: [2, 2, 2]. Allgemein: Rest landet im letzten Monat.
  const base = Math.floor(6 / config.simulatedMonths)
  const remainder = 6 % config.simulatedMonths
  const ecPerMonth = Array.from({ length: config.simulatedMonths }, (_, m) =>
    m === config.simulatedMonths - 1 ? base + remainder : base
  )

  const orders: Order[] = []
  let ecIdx = 0

  for (let m = 0; m < config.simulatedMonths; m++) {
    const absMonth = config.startMonth + m
    const year = config.startYear + Math.floor((absMonth - 1) / 12)
    const month = ((absMonth - 1) % 12) + 1

    const ecThisMonth = ecPerMonth[m]!
    const regularThisMonth = config.ordersPerMonth - ecThisMonth

    // Reguläre Orders dieses Monats
    for (let i = 0; i < regularThisMonth; i++) {
      const infIdx = pickWeighted(prng, regularWeights)
      orders.push(buildRegularOrder(prng, config, influencers[infIdx]!, year, month))
    }

    // Edge Cases dieses Monats – orderDate wird jetzt gesetzt
    for (let i = 0; i < ecThisMonth; i++) {
      const template = ecTemplates[ecIdx++]!
      orders.push({ ...template, orderDate: randomDate(prng, year, month) })
    }
  }

  return orders
}

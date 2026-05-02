import { calculateNetRevenue } from '../logic/returns'
import {
  calculateAttributionRatios,
  type AttributionDistribution,
  type AttributionDistributionRatio,
} from '../logic/attribution'
import type { InfluencerMetrics } from './influencerMetrics'

export interface SummaryMetrics {
  influencerCount: number
  orderCount: number
  grossRevenue: number
  refundSum: number
  netRevenue: number
  returnRateByCount: number
  returnRateByValue: number
  attribution: AttributionDistribution
  attributionRatios: AttributionDistributionRatio
}

export function calculateSummaryMetrics(
  metricsMap: Map<string, InfluencerMetrics>,
): SummaryMetrics {
  if (metricsMap.size === 0) {
    const emptyAttribution: AttributionDistribution = {
      clean_influencer: 0,
      mixed_code: 0,
      unknown: 0,
      total: 0,
    }
    return {
      influencerCount: 0,
      orderCount: 0,
      grossRevenue: 0,
      refundSum: 0,
      netRevenue: 0,
      returnRateByCount: 0,
      returnRateByValue: 0,
      attribution: emptyAttribution,
      attributionRatios: calculateAttributionRatios(emptyAttribution),
    }
  }

  let orderCount = 0
  let grossRevenue = 0
  let refundSum = 0
  let returnCount = 0
  const attribution: AttributionDistribution = {
    clean_influencer: 0,
    mixed_code: 0,
    unknown: 0,
    total: 0,
  }

  for (const { orderMetrics } of metricsMap.values()) {
    orderCount += orderMetrics.orderCount
    grossRevenue += orderMetrics.grossRevenue
    refundSum += orderMetrics.refundSum
    returnCount += Math.round(orderMetrics.returnRateByCount * orderMetrics.orderCount)
    attribution.clean_influencer += orderMetrics.attribution.clean_influencer
    attribution.mixed_code += orderMetrics.attribution.mixed_code
    attribution.unknown += orderMetrics.attribution.unknown
    attribution.total += orderMetrics.attribution.total
  }

  return {
    influencerCount: metricsMap.size,
    orderCount,
    grossRevenue,
    refundSum,
    netRevenue: calculateNetRevenue(grossRevenue, refundSum).netRevenue,
    returnRateByCount: orderCount > 0 ? returnCount / orderCount : 0,
    returnRateByValue: grossRevenue > 0 ? refundSum / grossRevenue : 0,
    attribution,
    attributionRatios: calculateAttributionRatios(attribution),
  }
}

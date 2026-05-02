import type { AttributionStatus, ReturnStatus } from '../../scripts/lib/types'
import { hasReturn, calculateNetRevenue } from '../logic/returns'
import {
  countByAttributionStatus,
  calculateAttributionRatios,
  type AttributionDistribution,
  type AttributionDistributionRatio,
} from '../logic/attribution'

export interface OrderInput {
  grossRevenue: number
  refundAmount: number
  returnStatus: ReturnStatus
  attributionStatus: AttributionStatus
}

export interface OrderMetrics {
  orderCount: number
  grossRevenue: number
  refundSum: number
  netRevenue: number
  returnRateByCount: number
  returnRateByValue: number
  attribution: AttributionDistribution
  attributionRatios: AttributionDistributionRatio
}

export function calculateOrderMetrics(orders: OrderInput[]): OrderMetrics {
  if (orders.length === 0) {
    const emptyAttribution: AttributionDistribution = {
      clean_influencer: 0,
      mixed_code: 0,
      unknown: 0,
      total: 0,
    }
    return {
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

  let grossRevenue = 0
  let refundSum = 0
  let returnCount = 0
  const statuses: AttributionStatus[] = []

  for (const order of orders) {
    grossRevenue += order.grossRevenue
    refundSum += order.refundAmount
    if (hasReturn(order.returnStatus)) returnCount++
    statuses.push(order.attributionStatus)
  }

  const netRevenue = calculateNetRevenue(grossRevenue, refundSum).netRevenue
  const attribution = countByAttributionStatus(statuses)

  return {
    orderCount: orders.length,
    grossRevenue,
    refundSum,
    netRevenue,
    returnRateByCount: returnCount / orders.length,
    returnRateByValue: grossRevenue > 0 ? refundSum / grossRevenue : 0,
    attribution,
    attributionRatios: calculateAttributionRatios(attribution),
  }
}

export function calculateRevenueByAttributionStatus(
  orders: OrderInput[],
): Record<AttributionStatus, { grossRevenue: number; netRevenue: number }> {
  const result: Record<AttributionStatus, { grossRevenue: number; netRevenue: number }> = {
    clean_influencer: { grossRevenue: 0, netRevenue: 0 },
    mixed_code: { grossRevenue: 0, netRevenue: 0 },
    unknown: { grossRevenue: 0, netRevenue: 0 },
  }

  for (const order of orders) {
    const bucket = result[order.attributionStatus]
    bucket.grossRevenue += order.grossRevenue
    bucket.netRevenue += calculateNetRevenue(order.grossRevenue, order.refundAmount).netRevenue
  }

  return result
}

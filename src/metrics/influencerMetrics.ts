import type { AttributionStatus } from '../../scripts/lib/types'
import {
  calculateOrderMetrics,
  calculateRevenueByAttributionStatus,
  type OrderInput,
  type OrderMetrics,
} from './orderMetrics'

export interface InfluencerOrderInput extends OrderInput {
  attributedInfluencerId: string
}

export interface InfluencerMetrics {
  influencerId: string
  orderMetrics: OrderMetrics
  revenueByAttribution: Record<AttributionStatus, { grossRevenue: number; netRevenue: number }>
}

export function calculateInfluencerMetrics(
  influencerId: string,
  orders: OrderInput[],
): InfluencerMetrics {
  return {
    influencerId,
    orderMetrics: calculateOrderMetrics(orders),
    revenueByAttribution: calculateRevenueByAttributionStatus(orders),
  }
}

export function groupMetricsByInfluencer(
  orders: InfluencerOrderInput[],
): Map<string, InfluencerMetrics> {
  const grouped = new Map<string, InfluencerOrderInput[]>()

  for (const order of orders) {
    const existing = grouped.get(order.attributedInfluencerId)
    if (existing) {
      existing.push(order)
    } else {
      grouped.set(order.attributedInfluencerId, [order])
    }
  }

  const result = new Map<string, InfluencerMetrics>()
  for (const [influencerId, influencerOrders] of grouped) {
    result.set(influencerId, calculateInfluencerMetrics(influencerId, influencerOrders))
  }
  return result
}

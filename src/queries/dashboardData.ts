import { fetchAttributedOrders, fetchAllOrders } from '../db/orders'
import { fetchAllInfluencers } from '../db/influencers'
import { groupMetricsByInfluencer } from '../metrics/influencerMetrics'
import { calculateSummaryMetrics } from '../metrics/summaryMetrics'
import { fetchRevenueTimeSeries } from './revenueTimeSeries'
import type { InfluencerMetrics } from '../metrics/influencerMetrics'
import type { SummaryMetrics } from '../metrics/summaryMetrics'
import type { InfluencerRecord } from '../db/influencers'
import type { RevenueTimeSeriesEntry } from './revenueTimeSeries'

export interface TopInfluencerEntry {
  handle: string
  netRevenue: number
}

export interface ReturnRateEntry {
  handle: string
  returnRateByValue: number
}

export interface DashboardData {
  influencers: InfluencerRecord[]
  influencerMetrics: Map<string, InfluencerMetrics>
  summary: SummaryMetrics
  totalOrderCount: number
  revenueTimeSeries: RevenueTimeSeriesEntry[]
  topInfluencersChart: TopInfluencerEntry[]
  returnRateChart: ReturnRateEntry[]
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [attributedOrders, allOrders, influencers, revenueTimeSeries] = await Promise.all([
    fetchAttributedOrders(),
    fetchAllOrders(),
    fetchAllInfluencers(),
    fetchRevenueTimeSeries(),
  ])

  const influencerMetrics = groupMetricsByInfluencer(attributedOrders)
  const summary = calculateSummaryMetrics(influencerMetrics)

  const sortedInfluencers = [...influencers].sort((a, b) => {
    const aNet = influencerMetrics.get(a.id)?.orderMetrics.netRevenue ?? 0
    const bNet = influencerMetrics.get(b.id)?.orderMetrics.netRevenue ?? 0
    return bNet - aNet
  })

  const topInfluencersChart = sortedInfluencers.slice(0, 10).map((inf) => ({
    handle: inf.handle,
    netRevenue: influencerMetrics.get(inf.id)?.orderMetrics.netRevenue ?? 0,
  }))

  const returnRateChart = [...influencers]
    .map((inf) => ({
      handle: inf.handle,
      returnRateByValue: influencerMetrics.get(inf.id)?.orderMetrics.returnRateByValue ?? 0,
    }))
    .sort((a, b) => b.returnRateByValue - a.returnRateByValue)

  return {
    influencers: sortedInfluencers,
    influencerMetrics,
    summary,
    totalOrderCount: allOrders.length,
    revenueTimeSeries,
    topInfluencersChart,
    returnRateChart,
  }
}

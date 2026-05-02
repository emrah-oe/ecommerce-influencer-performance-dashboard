import { prisma } from '../lib/prisma'
import { fetchAllInfluencers } from '../db/influencers'
import type { ReturnStatus, AttributionStatus } from '../../scripts/lib/types'
import { groupMetricsByInfluencer } from '../metrics/influencerMetrics'
import { calculateSummaryMetrics } from '../metrics/summaryMetrics'
import type { Prisma } from '@prisma/client'
import type { DashboardData, TopInfluencerEntry, ReturnRateEntry } from './dashboardData'
import type { InfluencerRecord } from '../db/influencers'
import type { RevenueTimeSeriesEntry } from './revenueTimeSeries'
import type { InfluencerMetrics } from '../metrics/influencerMetrics'

export interface DashboardFilterParams {
  from?: string
  to?: string
  attribution?: string
  returnStatus?: string
  influencer?: string
  sort?: string
  dir?: string
  page?: string
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  pageCount: number
}

export interface InfluencerScatterEntry {
  handle: string
  volumeClass: string
  orderCount: number
  netRevenue: number
  returnRateByValue: number
}

export interface DataDateRange {
  min: string
  max: string
}

export interface FilteredDashboardData extends DashboardData {
  allInfluencers: InfluencerRecord[]
  scatterData: InfluencerScatterEntry[]
  paginationMeta: PaginationMeta
  dataDateRange: DataDateRange | null
}

// Influencer-Level Attribution-Profile (entsprechen den AttributionBadge-Kategorien)
const ATTRIBUTION_PROFILE_VALUES = ['eindeutig', 'leicht_gemischt', 'gemischt', 'stark_gemischt'] as const
type AttributionProfile = (typeof ATTRIBUTION_PROFILE_VALUES)[number]

// Influencer-Level Retourenprofil (entspricht den economicScore-Schwellenwerten)
const RETURN_RATE_PROFILE_VALUES = ['niedrig', 'mittel', 'hoch', 'sehr_hoch'] as const
type ReturnRateProfile = (typeof RETURN_RATE_PROFILE_VALUES)[number]

function parseEnumList<T extends string>(value: string | undefined, allowed: readonly T[]): T[] {
  if (!value) return []
  return value.split(',').filter((v): v is T => (allowed as readonly string[]).includes(v))
}

// Parst YYYY-MM-DD (inklusiv von) oder altes YYYY-MM (erster des Monats) robust
function parseDateFrom(value: string | undefined): Date | null {
  if (!value) return null
  if (/^\d{4}-\d{2}$/.test(value)) return new Date(`${value}-01T00:00:00Z`)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00Z`)
  return null
}

// Parst YYYY-MM-DD (inklusiv bis → exklusiver Folgetag) oder altes YYYY-MM (Monatsanfang Folgemonat)
function parseDateTo(value: string | undefined): Date | null {
  if (!value) return null
  if (/^\d{4}-\d{2}$/.test(value)) {
    const parts = value.split('-').map(Number) as [number, number]
    const [y, m] = parts
    if (m === 12) return new Date(`${y + 1}-01-01T00:00:00Z`)
    return new Date(`${y}-${String(m + 1).padStart(2, '0')}-01T00:00:00Z`)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 1)
    return d
  }
  return null
}

function economicScore(m: InfluencerMetrics | undefined): number {
  if (!m) return 0
  const { returnRateByValue, netRevenue } = m.orderMetrics
  const netClean = m.revenueByAttribution.clean_influencer.netRevenue
  const cleanShare = netRevenue > 0 ? netClean / netRevenue : 0
  if (netRevenue <= 0 || cleanShare < 0.10 || returnRateByValue >= 0.25) return 0 // Schwach
  if (cleanShare < 0.25 || returnRateByValue >= 0.20) return 1                     // Prüfen
  if (returnRateByValue >= 0.15) return 2                                           // Solide
  return 3                                                                           // Stark
}

const WENIG_DATEN_RANK = 99

function attributionRank(m: InfluencerMetrics | undefined): number {
  if (!m) return WENIG_DATEN_RANK
  const { attribution, attributionRatios } = m.orderMetrics
  const attributedCount = attribution.clean_influencer + attribution.mixed_code
  if (attributedCount < 10) return WENIG_DATEN_RANK
  const mixedRatio = attributionRatios.mixed_code
  if (mixedRatio < 0.05) return 0 // Eindeutig
  if (mixedRatio < 0.25) return 1 // Leicht gemischt
  if (mixedRatio < 0.60) return 2 // Gemischt
  return 3                        // Stark gemischt
}

const RANK_TO_PROFILE: Record<number, AttributionProfile> = {
  0: 'eindeutig',
  1: 'leicht_gemischt',
  2: 'gemischt',
  3: 'stark_gemischt',
}

function returnRateRank(m: InfluencerMetrics | undefined): number {
  if (!m) return -1
  const rate = m.orderMetrics.returnRateByValue
  if (rate < 0.15) return 0 // niedrig
  if (rate < 0.20) return 1 // mittel
  if (rate < 0.25) return 2 // hoch
  return 3                   // sehr_hoch
}

const RETURN_RATE_RANK_TO_PROFILE: Record<number, ReturnRateProfile> = {
  0: 'niedrig',
  1: 'mittel',
  2: 'hoch',
  3: 'sehr_hoch',
}

function buildTimeSeries(
  orders: { orderDate: Date; grossRevenue: number; refundAmount: number }[],
): RevenueTimeSeriesEntry[] {
  const map = new Map<string, { gross: number; net: number; refund: number }>()
  for (const o of orders) {
    const day = o.orderDate.toISOString().slice(0, 10)
    const entry = map.get(day) ?? { gross: 0, net: 0, refund: 0 }
    entry.gross += o.grossRevenue
    entry.refund += o.refundAmount
    entry.net += o.grossRevenue - o.refundAmount
    map.set(day, entry)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({
      month: day,
      grossRevenue: v.gross,
      netRevenue: v.net,
      refundAmount: v.refund,
    }))
}

export async function loadFilteredDashboardData(
  params: DashboardFilterParams,
): Promise<FilteredDashboardData> {
  const attributionList = parseEnumList(params.attribution, ATTRIBUTION_PROFILE_VALUES)
  const returnProfileList = parseEnumList(params.returnStatus, RETURN_RATE_PROFILE_VALUES)
  const influencerList = params.influencer ? params.influencer.split(',').filter(Boolean) : []

  const orderDateFilter: { gte?: Date; lt?: Date } = {}
  const fromDate = parseDateFrom(params.from)
  const toDate = parseDateTo(params.to)
  if (fromDate) orderDateFilter.gte = fromDate
  if (toDate) orderDateFilter.lt = toDate
  const hasDateFilter = Object.keys(orderDateFilter).length > 0

  // baseWhere: nur Datum auf Order-Ebene — kein attributionStatus, kein returnStatus mehr
  const baseWhere: Prisma.OrderWhereInput = {
    NOT: { orderId: { startsWith: 'shopify_' } },
    ...(hasDateFilter && { orderDate: orderDateFilter }),
  }

  const influencerWhere: Prisma.OrderWhereInput = influencerList.length
    ? { attributedInfluencerId: { in: influencerList } }
    : {}

  // allOrdersWhere: Basis für totalOrderCount (inkl. unattributierter Orders)
  const allOrdersWhere: Prisma.OrderWhereInput = { ...baseWhere, ...influencerWhere }

  // attributedWhere: nur zugeordnete Orders
  const attributedWhere: Prisma.OrderWhereInput = {
    ...baseWhere,
    ...(influencerList.length
      ? { attributedInfluencerId: { in: influencerList } }
      : { attributedInfluencerId: { not: null } }),
  }

  const [rawAttributedOrders, totalOrderCount, allInfluencers, dateRangeRaw] = await Promise.all([
    prisma.order.findMany({
      where: attributedWhere,
      select: {
        attributedInfluencerId: true,
        grossRevenue: true,
        refundAmount: true,
        returnStatus: true,
        attributionStatus: true,
        orderDate: true,
      },
    }),
    prisma.order.count({ where: allOrdersWhere }),
    fetchAllInfluencers(), // filtert inf_shopify_* bereits intern aus
    prisma.order.aggregate({
      _min: { orderDate: true },
      _max: { orderDate: true },
      where: { NOT: { orderId: { startsWith: 'shopify_' } } },
    }),
  ])

  const dataDateRange: DataDateRange | null =
    dateRangeRaw._min.orderDate && dateRangeRaw._max.orderDate
      ? {
          min: dateRangeRaw._min.orderDate.toISOString().slice(0, 10),
          max: dateRangeRaw._max.orderDate.toISOString().slice(0, 10),
        }
      : null

  const attributedOrders = rawAttributedOrders
    .filter((o): o is typeof o & { attributedInfluencerId: string } => o.attributedInfluencerId !== null)
    .map((o) => ({
      attributedInfluencerId: o.attributedInfluencerId,
      grossRevenue: o.grossRevenue.toNumber(),
      refundAmount: o.refundAmount.toNumber(),
      returnStatus: o.returnStatus as ReturnStatus,
      attributionStatus: o.attributionStatus as AttributionStatus,
    }))

  // Schritt 1: Metriken für alle attributed Influencer (nach Datum/Retoure-Filter)
  const influencerMetrics = groupMetricsByInfluencer(attributedOrders)

  // Schritt 2: Aktive Influencer — haben mindestens eine Order im gefilterten Set
  const activeInfluencerIds = new Set(influencerMetrics.keys())
  const activeInfluencers = influencerList.length
    ? allInfluencers.filter((inf) => influencerList.includes(inf.id) && activeInfluencerIds.has(inf.id))
    : allInfluencers.filter((inf) => activeInfluencerIds.has(inf.id))

  // Schritt 3a: Attribution-Profil-Filter auf Influencer-Level anwenden
  const attributionFiltered = attributionList.length
    ? activeInfluencers.filter((inf) => {
        const rank = attributionRank(influencerMetrics.get(inf.id))
        if (rank === WENIG_DATEN_RANK) return false
        const profile = RANK_TO_PROFILE[rank]
        return profile !== undefined && attributionList.includes(profile)
      })
    : activeInfluencers

  // Schritt 3b: Retourenprofil-Filter auf Influencer-Level anwenden (AND mit Attribution)
  const visibleInfluencers = returnProfileList.length
    ? attributionFiltered.filter((inf) => {
        const rank = returnRateRank(influencerMetrics.get(inf.id))
        const profile = RETURN_RATE_RANK_TO_PROFILE[rank]
        return profile !== undefined && returnProfileList.includes(profile)
      })
    : attributionFiltered

  // Schritt 4: Konsistente Datenbasis — alle Komponenten verwenden dieselbe finale Influencer-Menge
  const finalVisibleInfluencerIds = new Set(visibleInfluencers.map((inf) => inf.id))
  const finalMetrics = new Map(
    [...influencerMetrics.entries()].filter(([id]) => finalVisibleInfluencerIds.has(id)),
  )
  const summary = calculateSummaryMetrics(finalMetrics)
  const finalAttributedOrders = rawAttributedOrders.filter(
    (o) => o.attributedInfluencerId !== null && finalVisibleInfluencerIds.has(o.attributedInfluencerId as string),
  )

  const sort = params.sort ?? 'netRevenue'
  const dir = params.dir === 'asc' ? 'asc' : 'desc'
  const PAGE_SIZE = 10

  const sortedInfluencers = [...visibleInfluencers].sort((a, b) => {
    const aM = finalMetrics.get(a.id)
    const bM = finalMetrics.get(b.id)
    let cmp: number
    switch (sort) {
      case 'handle':
        cmp = a.handle.localeCompare(b.handle); break
      case 'volumeClass':
        cmp = a.volumeClass.localeCompare(b.volumeClass); break
      case 'orderCount':
        cmp = (aM?.orderMetrics.orderCount ?? 0) - (bM?.orderMetrics.orderCount ?? 0); break
      case 'grossRevenue':
        cmp = (aM?.orderMetrics.grossRevenue ?? 0) - (bM?.orderMetrics.grossRevenue ?? 0); break
      case 'returnRateByValue':
        cmp = (aM?.orderMetrics.returnRateByValue ?? 0) - (bM?.orderMetrics.returnRateByValue ?? 0); break
      case 'netClean':
        cmp = (aM?.revenueByAttribution.clean_influencer.netRevenue ?? 0) - (bM?.revenueByAttribution.clean_influencer.netRevenue ?? 0); break
      case 'economicRating':
        cmp = economicScore(aM) - economicScore(bM); break
      case 'mixed': {
        const aRank = attributionRank(aM)
        const bRank = attributionRank(bM)
        if (aRank === WENIG_DATEN_RANK && bRank === WENIG_DATEN_RANK) return 0
        if (aRank === WENIG_DATEN_RANK) return 1   // Wenig Daten immer ans Ende
        if (bRank === WENIG_DATEN_RANK) return -1
        cmp = aRank - bRank; break
      }
      default: // netRevenue
        cmp = (aM?.orderMetrics.netRevenue ?? 0) - (bM?.orderMetrics.netRevenue ?? 0)
    }
    return dir === 'asc' ? cmp : -cmp
  })

  const totalInfluencers = sortedInfluencers.length
  const pageCount = Math.max(1, Math.ceil(totalInfluencers / PAGE_SIZE))
  const rawPage = parseInt(params.page ?? '1', 10)
  const currentPage = Math.min(Math.max(isNaN(rawPage) ? 1 : rawPage, 1), pageCount)
  const pagedInfluencers = sortedInfluencers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  // Top-10-Chart immer nach Nettoumsatz absteigend, unabhängig von der Tabellensortierung
  const topInfluencersChart: TopInfluencerEntry[] = [...visibleInfluencers]
    .sort((a, b) => {
      const aNet = finalMetrics.get(a.id)?.orderMetrics.netRevenue ?? 0
      const bNet = finalMetrics.get(b.id)?.orderMetrics.netRevenue ?? 0
      return bNet - aNet
    })
    .slice(0, 10)
    .map((inf) => ({
      handle: inf.handle,
      netRevenue: finalMetrics.get(inf.id)?.orderMetrics.netRevenue ?? 0,
    }))

  const returnRateChart: ReturnRateEntry[] = [...visibleInfluencers]
    .map((inf) => ({
      handle: inf.handle,
      returnRateByValue: finalMetrics.get(inf.id)?.orderMetrics.returnRateByValue ?? 0,
    }))
    .sort((a, b) => b.returnRateByValue - a.returnRateByValue)

  const revenueTimeSeries = buildTimeSeries(
    finalAttributedOrders.map((o) => ({
      orderDate: o.orderDate,
      grossRevenue: Number(o.grossRevenue),
      refundAmount: Number(o.refundAmount),
    })),
  )

  const scatterData: InfluencerScatterEntry[] = visibleInfluencers
    .filter((inf) => finalMetrics.has(inf.id))
    .map((inf) => {
      const m = finalMetrics.get(inf.id)!
      return {
        handle: inf.handle,
        volumeClass: inf.volumeClass,
        orderCount: m.orderMetrics.orderCount,
        netRevenue: m.orderMetrics.netRevenue,
        returnRateByValue: m.orderMetrics.returnRateByValue,
      }
    })

  return {
    influencers: pagedInfluencers,
    allInfluencers,
    paginationMeta: { page: currentPage, pageSize: PAGE_SIZE, total: totalInfluencers, pageCount },
    influencerMetrics: finalMetrics,
    summary,
    totalOrderCount,
    revenueTimeSeries,
    topInfluencersChart,
    returnRateChart,
    scatterData,
    dataDateRange,
  }
}

import Link from 'next/link'
import type { InfluencerRecord } from '../../db/influencers'
import type { InfluencerMetrics } from '../../metrics/influencerMetrics'
import type { DashboardFilterParams, PaginationMeta } from '../../queries/filteredDashboardData'
import { AttributionBadge } from './AttributionBadge'

interface Props {
  influencers: InfluencerRecord[]
  metricsMap: Map<string, InfluencerMetrics>
  filterParams: DashboardFilterParams
  paginationMeta: PaginationMeta
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}

function formatPct(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 1 }).format(value)
}

function EconomicBadge({
  returnRateByValue,
  netRevenue,
  cleanShare,
}: {
  returnRateByValue: number
  netRevenue: number
  cleanShare: number
}) {
  let label: string
  let className: string

  if (netRevenue <= 0 || cleanShare < 0.10 || returnRateByValue >= 0.25) {
    label = 'Schwach'
    className = 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
  } else if (cleanShare < 0.25 || returnRateByValue >= 0.20) {
    label = 'Prüfen'
    className = 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
  } else if (returnRateByValue >= 0.15) {
    label = 'Solide'
    className = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
  } else {
    label = 'Stark'
    className = 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
  }

  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function buildFilterBase(params: DashboardFilterParams): URLSearchParams {
  const p = new URLSearchParams()
  if (params.from) p.set('from', params.from)
  if (params.to) p.set('to', params.to)
  if (params.attribution) p.set('attribution', params.attribution)
  if (params.returnStatus) p.set('returnStatus', params.returnStatus)
  if (params.influencer) p.set('influencer', params.influencer)
  return p
}

function buildSortHref(params: DashboardFilterParams, column: string): string {
  const currentSort = params.sort ?? 'netRevenue'
  const currentDir = params.dir ?? 'desc'
  const nextDir = currentSort === column && currentDir === 'desc' ? 'asc' : 'desc'
  const p = buildFilterBase(params)
  p.set('sort', column)
  p.set('dir', nextDir)
  // page wird bewusst nicht gesetzt → Reset auf 1
  return `?${p.toString()}`
}

function buildPageHref(params: DashboardFilterParams, page: number): string {
  const p = buildFilterBase(params)
  if (params.sort) p.set('sort', params.sort)
  if (params.dir) p.set('dir', params.dir)
  p.set('page', String(page))
  return `?${p.toString()}`
}

function TablePagination({ params, meta }: { params: DashboardFilterParams; meta: PaginationMeta }) {
  if (meta.pageCount <= 1) return null
  const { page, pageSize, total, pageCount } = meta
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3 text-sm text-slate-500 dark:border-gray-700 dark:text-gray-400">
      <span>{from}–{to} von {total}</span>
      <div className="flex items-center gap-4">
        {page > 1 ? (
          <Link href={buildPageHref(params, page - 1)} className="hover:text-slate-800 dark:hover:text-gray-200">
            ← Zurück
          </Link>
        ) : (
          <span className="opacity-30">← Zurück</span>
        )}
        <span>Seite {page} von {pageCount}</span>
        {page < pageCount ? (
          <Link href={buildPageHref(params, page + 1)} className="hover:text-slate-800 dark:hover:text-gray-200">
            Weiter →
          </Link>
        ) : (
          <span className="opacity-30">Weiter →</span>
        )}
      </div>
    </div>
  )
}

function SortIndicator({ params, column }: { params: DashboardFilterParams; column: string }) {
  const active = (params.sort ?? 'netRevenue') === column
  if (!active) return null
  return (
    <span className="ml-1 text-indigo-500 dark:text-indigo-400">
      {(params.dir ?? 'desc') === 'asc' ? '↑' : '↓'}
    </span>
  )
}

function Th({
  params,
  column,
  label,
  align = 'left',
}: {
  params: DashboardFilterParams
  column: string
  label: string
  align?: 'left' | 'right'
}) {
  const textAlign = align === 'right' ? 'text-right' : 'text-left'
  const isActive = (params.sort ?? 'netRevenue') === column
  return (
    <th className={`px-4 py-3.5 ${textAlign}`}>
      <Link
        href={buildSortHref(params, column)}
        className={`inline-flex items-baseline gap-0.5 whitespace-nowrap hover:text-slate-800 dark:hover:text-gray-200 ${
          isActive ? 'text-gray-900 dark:text-gray-100' : ''
        }`}
      >
        {label}
        <SortIndicator params={params} column={column} />
      </Link>
    </th>
  )
}

export function InfluencerTable({ influencers, metricsMap, filterParams, paginationMeta }: Props) {
  return (
    <section aria-label="Influencer-Übersicht">
      <h2 className="mb-4 text-3xl font-semibold text-slate-900 dark:text-gray-100">Influencer Performance-Übersicht</h2>
      <div className="overflow-x-auto rounded-md border border-stone-200 bg-stone-100 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
        <table className="min-w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-200/60 text-sm text-slate-500 dark:border-gray-700 dark:bg-gray-700/40 dark:text-gray-400">
            <tr>
              <Th params={filterParams} column="handle"           label="Influencer"     align="left" />
              <Th params={filterParams} column="volumeClass"      label="Segment"        align="left" />
              <Th params={filterParams} column="orderCount"       label="Orders"         align="right" />
              <Th params={filterParams} column="grossRevenue"     label="Brutto"         align="right" />
              <Th params={filterParams} column="netRevenue"       label="Netto"          align="right" />
              <Th params={filterParams} column="netClean"         label="Netto eindeutig" align="right" />
              <Th params={filterParams} column="economicRating"   label="Score"          align="left" />
              <Th params={filterParams} column="mixed"             label="Attribution"    align="left" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-gray-700">
            {influencers.map((inf) => {
              const metrics = metricsMap.get(inf.id)
              if (!metrics) return null
              const { orderMetrics, revenueByAttribution } = metrics
              const netClean = revenueByAttribution.clean_influencer.netRevenue
              return (
                <tr key={inf.id} className="hover:bg-stone-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-4 font-medium text-slate-900 dark:text-gray-100">{inf.handle}</td>
                  <td className="px-4 py-4 text-slate-500 dark:text-gray-400">
                    {inf.volumeClass === 'top' ? 'Top' : inf.volumeClass === 'mid' ? 'Mid' : 'Long Tail'}
                  </td>
                  <td className="px-4 py-4 text-right text-slate-700 dark:text-gray-300">{orderMetrics.orderCount}</td>
                  <td className="px-4 py-4 text-right text-slate-700 dark:text-gray-300">{formatEur(orderMetrics.grossRevenue)}</td>
                  <td className="px-4 py-4 text-right text-slate-700 dark:text-gray-300">{formatEur(orderMetrics.netRevenue)}</td>
                  <td className="px-4 py-4 text-right text-slate-700 dark:text-gray-300">{formatEur(netClean)}</td>
                  <td className="px-4 py-4">
                    <EconomicBadge
                      returnRateByValue={orderMetrics.returnRateByValue}
                      netRevenue={orderMetrics.netRevenue}
                      cleanShare={orderMetrics.netRevenue > 0 ? netClean / orderMetrics.netRevenue : 0}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <AttributionBadge
                      mixedRatio={orderMetrics.attributionRatios.mixed_code}
                      attributedCount={orderMetrics.attribution.clean_influencer + orderMetrics.attribution.mixed_code}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <TablePagination params={filterParams} meta={paginationMeta} />
      </div>
      <ul className="mt-2 space-y-1 text-xs text-slate-400 dark:text-gray-500">
        <li><span className="font-medium">Score:</span> Berücksichtigt Nettoumsatz, Retourenwert-Quote und den Anteil eindeutig zuordenbaren Nettoumsatzes. Schwach bei Netto ≤ 0, eindeutigem Nettoanteil &lt; 10 % oder Retourenwert-Quote ≥ 25 %. Prüfen bei eindeutigem Nettoanteil &lt; 25 % oder Retourenwert-Quote ≥ 20 %. Solide ab 15 % Retourenwert-Quote, sonst Stark.</li>
        <li><span className="font-medium">Netto eindeutig:</span> Umfasst nur eindeutig zuordenbare clean_influencer-Orders. Große Abweichungen zu Netto weisen auf Attributionsunsicherheit durch mehrfach verwendete Rabattcodes hin.</li>
        <li><span className="font-medium">Attribution:</span> Bewertet den mixed_code-Anteil innerhalb der zuordenbaren Influencer-Orders. Schwellen: Eindeutig &lt; 5 %, Leicht gemischt 5–25 %, Gemischt 25–60 %, Stark gemischt ≥ 60 %.</li>
        <li><span className="font-medium">Segment:</span> Beschreibt die simulierte Größenklasse des Influencers nach erwartetem Bestellvolumen.</li>
      </ul>
    </section>
  )
}

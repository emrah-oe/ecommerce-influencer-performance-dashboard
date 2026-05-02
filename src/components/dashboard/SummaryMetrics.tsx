import type { SummaryMetrics as SummaryMetricsType } from '../../metrics/summaryMetrics'

interface Props {
  summary: SummaryMetricsType
  totalOrderCount: number
  unknownOrderCount: number
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}

function formatPct(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 1 }).format(value)
}

export function SummaryMetrics({ summary, totalOrderCount, unknownOrderCount }: Props) {
  return (
    <section aria-label="KPI-Übersicht">
      <h2 className="mb-4 text-3xl font-semibold text-slate-900 dark:text-gray-100">KPI-Übersicht</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Influencer" value={String(summary.influencerCount)} />
        <MetricCard label="Orders gesamt" value={String(totalOrderCount)} />
        <MetricCard label="Zuordenbare Orders" value={String(summary.orderCount)} />
        <MetricCard label="Nicht zuordenbar" value={String(unknownOrderCount)} />
        <MetricCard label="Bruttoumsatz" value={formatEur(summary.grossRevenue)} isCurrency />
        <MetricCard label="Nettoumsatz" value={formatEur(summary.netRevenue)} isCurrency />
        <MetricCard label="Retourenquote" value={formatPct(summary.returnRateByCount)} />
        <MetricCard label="Retourenwert-Quote" value={formatPct(summary.returnRateByValue)} />
      </div>
    </section>
  )
}

function MetricCard({ label, value, sub, isCurrency }: { label: string; value: string; sub?: string; isCurrency?: boolean }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-100 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
      <p className="text-base text-slate-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 font-bold text-slate-900 dark:text-gray-100 ${isCurrency ? 'whitespace-nowrap text-2xl' : 'text-3xl'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-sm text-slate-400 dark:text-gray-500">{sub}</p>}
    </div>
  )
}

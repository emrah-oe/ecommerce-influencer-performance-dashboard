'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { RevenueTimeSeriesEntry } from '../../../queries/revenueTimeSeries'
import { useTheme } from '../../ThemeProvider'

interface Props {
  data: RevenueTimeSeriesEntry[]
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function RevenueOverTime({ data }: Props) {
  const { isDark } = useTheme()

  const gridColor = isDark ? '#374151' : '#e2e8f0'
  const tickColor = isDark ? '#9ca3af' : '#64748b'
  const tooltipStyle = {
    backgroundColor: isDark ? '#1f2937' : '#fafaf9',
    border: `1px solid ${isDark ? '#374151' : '#d6d3d1'}`,
    borderRadius: '6px',
    color: isDark ? '#f3f4f6' : '#0f172a',
  }
  const legendStyle = { color: isDark ? '#d1d5db' : '#334155', fontSize: 13 }
  const c = isDark
    ? { indigo: '#818cf8', green: '#4ade80', red: '#f87171' }
    : { indigo: '#4f46e5', green: '#16a34a', red: '#dc2626' }

  return (
    <div className="rounded-md border border-stone-200 bg-stone-100 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
      <h3 className="mb-5 text-xl font-semibold text-slate-700 dark:text-gray-300">Tägliche Umsatz- und Retourenentwicklung</h3>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickColor }} interval="preserveStartEnd" />
          <YAxis tickFormatter={formatEur} tick={{ fontSize: 12, fill: tickColor }} width={95} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => (typeof value === 'number' ? formatEur(value) : value)}
          />
          <Legend wrapperStyle={legendStyle} />
          <Line type="monotone" dataKey="grossRevenue" name="Brutto" stroke={c.indigo} dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="netRevenue" name="Netto" stroke={c.green} dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="refundAmount" name="Retouren" stroke={c.red} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

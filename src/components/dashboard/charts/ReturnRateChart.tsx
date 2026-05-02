'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ReturnRateEntry } from '../../../queries/dashboardData'
import { useTheme } from '../../ThemeProvider'

interface Props {
  data: ReturnRateEntry[]
}

function formatPct(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value)
}

export function ReturnRateChart({ data }: Props) {
  const { isDark } = useTheme()

  const relevant = data.filter((e) => e.returnRateByValue > 0).slice(0, 10)

  const gridColor = isDark ? '#374151' : '#e2e8f0'
  const tickColor = isDark ? '#9ca3af' : '#64748b'
  const tooltipStyle = {
    backgroundColor: isDark ? '#1f2937' : '#fafaf9',
    border: `1px solid ${isDark ? '#374151' : '#d6d3d1'}`,
    borderRadius: '6px',
    color: isDark ? '#f3f4f6' : '#0f172a',
  }
  const barColor = isDark ? '#f87171' : '#dc2626'

  return (
    <div className="rounded-md border border-stone-200 bg-stone-100 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
      <h3 className="mb-5 text-xl font-semibold text-slate-700 dark:text-gray-300">Retourenwert-Quote pro Influencer</h3>
      {relevant.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400 dark:text-gray-500">
          Keine Daten für die aktuelle Filterauswahl.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={relevant} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis type="number" tickFormatter={formatPct} tick={{ fontSize: 12, fill: tickColor }} domain={[0, 'auto']} />
            <YAxis type="category" dataKey="handle" tick={{ fontSize: 13, fill: tickColor }} width={130} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => (typeof value === 'number' ? formatPct(value) : value)}
            />
            <Bar dataKey="returnRateByValue" name="Retourenwert-%" fill={barColor} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

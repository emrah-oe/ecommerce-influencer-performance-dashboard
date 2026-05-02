'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTheme } from '../../ThemeProvider'

interface Props {
  clean: number
  mixed: number
  unknown: number
}

export function AttributionMixChart({ clean, mixed, unknown }: Props) {
  const { isDark } = useTheme()

  const tooltipStyle = {
    backgroundColor: isDark ? '#1f2937' : '#fafaf9',
    border: `1px solid ${isDark ? '#374151' : '#d6d3d1'}`,
    borderRadius: '6px',
    color: isDark ? '#f3f4f6' : '#0f172a',
  }
  const legendStyle = { color: isDark ? '#d1d5db' : '#334155', fontSize: 13 }
  const sliceColors = isDark
    ? ['#4ade80', '#facc15', '#9ca3af']
    : ['#16a34a', '#ca8a04', '#9ca3af']

  const chartData = [
    { name: 'Clean', value: clean, color: sliceColors[0]! },
    { name: 'Mixed', value: mixed, color: sliceColors[1]! },
    ...(unknown > 0 ? [{ name: 'Unknown', value: unknown, color: sliceColors[2]! }] : []),
  ]

  return (
    <div className="rounded-md border border-stone-200 bg-stone-100 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
      <h3 className="mb-5 text-xl font-semibold text-slate-700 dark:text-gray-300">Attributionsqualität</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ value, percent }) =>
              Number(value) > 0 ? `${(Number(percent) * 100).toFixed(1)} %` : ''
            }
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
        </PieChart>
      </ResponsiveContainer>
      <p className="mt-3 text-xs text-slate-400 dark:text-gray-500">
        Unknown Orders werden keinem Influencer zugerechnet, weil kein belastbares Attributionssignal vorliegt.
      </p>
    </div>
  )
}

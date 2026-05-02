'use client'

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { InfluencerScatterEntry } from '../../../queries/filteredDashboardData'
import { useTheme } from '../../ThemeProvider'

interface Props {
  data: InfluencerScatterEntry[]
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPct(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value)
}

export function InfluencerEvaluationScatter({ data }: Props) {
  const { isDark } = useTheme()

  const gridColor = isDark ? '#374151' : '#e2e8f0'
  const tickColor = isDark ? '#9ca3af' : '#64748b'
  const legendStyle = { color: isDark ? '#d1d5db' : '#334155', fontSize: 13 }
  const tooltipBg = isDark ? '#1f2937' : '#fafaf9'
  const tooltipBorder = isDark ? '#374151' : '#d6d3d1'
  const tooltipText = isDark ? '#f3f4f6' : '#0f172a'

  const colors = isDark
    ? { top: '#818cf8', mid: '#2dd4bf', long_tail: '#fbbf24' }
    : { top: '#4f46e5', mid: '#0d9488', long_tail: '#d97706' }

  const topData = data.filter((d) => d.volumeClass === 'top')
  const midData = data.filter((d) => d.volumeClass === 'mid')
  const longTailData = data.filter((d) => d.volumeClass === 'long_tail')

  return (
    <div className="rounded-md border border-stone-200 bg-stone-100 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
      <h3 className="mb-5 text-xl font-semibold text-slate-700 dark:text-gray-300">
        Influencer-Bewertung
      </h3>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            type="number"
            dataKey="netRevenue"
            name="Nettoumsatz"
            tickFormatter={formatEur}
            tick={{ fontSize: 13, fill: tickColor }}
            label={{
              value: 'Nettoumsatz (€)',
              position: 'insideBottom',
              offset: -20,
              fill: tickColor,
              fontSize: 13,
            }}
          />
          <YAxis
            type="number"
            dataKey="returnRateByValue"
            name="Retourenwert-%"
            tickFormatter={formatPct}
            tick={{ fontSize: 13, fill: tickColor }}
            width={65}
            label={{
              value: 'Retourenwert-%',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fill: tickColor,
              fontSize: 13,
            }}
          />
          <ZAxis type="number" dataKey="orderCount" name="Orders" range={[40, 360]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload as InfluencerScatterEntry
              return (
                <div
                  style={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: '6px',
                    color: tooltipText,
                    padding: '8px 12px',
                    fontSize: 13,
                    lineHeight: '1.6',
                  }}
                >
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>{d.handle}</p>
                  <p>Klasse: {d.volumeClass}</p>
                  <p>Orders: {d.orderCount}</p>
                  <p>Nettoumsatz: {formatEur(d.netRevenue)}</p>
                  <p>Retourenwert-%: {formatPct(d.returnRateByValue)}</p>
                </div>
              )
            }}
          />
          <Legend
            layout="vertical"
            verticalAlign="top"
            align="right"
            wrapperStyle={{
              ...legendStyle,
              lineHeight: '2',
              paddingLeft: 12,
              borderLeft: `2px solid ${isDark ? '#374151' : '#d6d3d1'}`,
            }}
          />
          <Scatter name="Top" data={topData} fill={colors.top} fillOpacity={0.8} />
          <Scatter name="Mid" data={midData} fill={colors.mid} fillOpacity={0.8} />
          <Scatter name="Long-Tail" data={longTailData} fill={colors.long_tail} fillOpacity={0.8} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

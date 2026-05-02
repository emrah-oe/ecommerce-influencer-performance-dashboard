import { prisma } from '../lib/prisma'

export interface RevenueTimeSeriesEntry {
  month: string
  grossRevenue: number
  netRevenue: number
  refundAmount: number
}

export async function fetchRevenueTimeSeries(): Promise<RevenueTimeSeriesEntry[]> {
  const rows = await prisma.$queryRaw<
    { month: string; gross_revenue: string; net_revenue: string; refund_amount: string }[]
  >`
    SELECT
      TO_CHAR(order_date, 'YYYY-MM') AS month,
      SUM(gross_revenue)::text        AS gross_revenue,
      SUM(gross_revenue - refund_amount)::text AS net_revenue,
      SUM(refund_amount)::text        AS refund_amount
    FROM orders
    WHERE order_id NOT LIKE 'shopify_%'
    GROUP BY TO_CHAR(order_date, 'YYYY-MM')
    ORDER BY month ASC
  `

  return rows.map((row) => ({
    month: row.month,
    grossRevenue: parseFloat(row.gross_revenue),
    netRevenue: parseFloat(row.net_revenue),
    refundAmount: parseFloat(row.refund_amount),
  }))
}

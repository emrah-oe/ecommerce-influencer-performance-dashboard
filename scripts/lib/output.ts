import fs from 'node:fs'
import path from 'node:path'
import type { GeneratorConfig } from '../config.js'
import type { Influencer, Order } from './types.js'

interface SyncRunCounts {
  totalOrders: number
  byMonth: Record<string, number>
  byAttributionStatus: Record<string, number>
  byReturnStatus: Record<string, number>
  edgeCases: number
}

function buildCounts(orders: Order[]): SyncRunCounts {
  const byMonth: Record<string, number> = {}
  const byAttributionStatus: Record<string, number> = {}
  const byReturnStatus: Record<string, number> = {}
  let edgeCases = 0

  for (const o of orders) {
    const month = o.orderDate.slice(0, 7)
    byMonth[month] = (byMonth[month] ?? 0) + 1
    byAttributionStatus[o.attributionStatus] = (byAttributionStatus[o.attributionStatus] ?? 0) + 1
    byReturnStatus[o.returnStatus] = (byReturnStatus[o.returnStatus] ?? 0) + 1
    if (o.isEdgeCase) edgeCases++
  }

  return { totalOrders: orders.length, byMonth, byAttributionStatus, byReturnStatus, edgeCases }
}

function groupByMonth(orders: Order[]): Map<string, Order[]> {
  const map = new Map<string, Order[]>()
  for (const o of orders) {
    const month = o.orderDate.slice(0, 7)
    if (!map.has(month)) map.set(month, [])
    map.get(month)!.push(o)
  }
  return map
}

export function writeOutput(
  influencers: Influencer[],
  orders: Order[],
  config: GeneratorConfig,
  outputDir: string,
): void {
  if (!fs.existsSync(outputDir)) {
    throw new Error(`Output-Verzeichnis nicht gefunden: ${outputDir}`)
  }

  const counts = buildCounts(orders)
  const byMonth = groupByMonth(orders)

  const files: Array<{ target: string; content: string }> = [
    {
      target: path.join(outputDir, 'influencers.json'),
      content: JSON.stringify(influencers, null, 2),
    },
    {
      target: path.join(outputDir, 'sync_run.json'),
      content: JSON.stringify(
        { seed: config.seed, generatedAt: new Date().toISOString(), config, counts },
        null,
        2,
      ),
    },
  ]

  for (const [month, monthOrders] of byMonth.entries()) {
    files.push({
      target: path.join(outputDir, `orders_${month}.json`),
      content: JSON.stringify(monthOrders, null, 2),
    })
  }

  // Phase 1: alle Inhalte als .tmp schreiben
  const tmpPaths = files.map(f => `${f.target}.tmp`)
  try {
    for (let i = 0; i < files.length; i++) {
      fs.writeFileSync(tmpPaths[i]!, files[i]!.content, 'utf-8')
    }
  } catch (err) {
    for (const tmp of tmpPaths) {
      try { fs.unlinkSync(tmp) } catch { /* ignorieren */ }
    }
    throw err
  }

  // Phase 2: alle .tmp auf Zielnamen umbenennen
  for (let i = 0; i < files.length; i++) {
    fs.renameSync(tmpPaths[i]!, files[i]!.target)
  }
}

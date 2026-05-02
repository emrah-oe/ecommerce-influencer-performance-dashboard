import path from 'node:path'
import { DEFAULT_CONFIG, type GeneratorConfig } from './config.js'
import { createPrng } from './lib/prng.js'
import { generateInfluencers } from './lib/influencers.js'
import { generateOrders } from './lib/orders.js'
import { writeOutput } from './lib/output.js'

function validateConfig(c: GeneratorConfig): void {
  const longTailCount = c.influencerCount - c.topTierCount - c.midTierCount
  if (longTailCount <= 0) {
    throw new Error(
      `Konfigurationsfehler: topTierCount(${c.topTierCount}) + midTierCount(${c.midTierCount}) >= influencerCount(${c.influencerCount})`
    )
  }
  if (c.noReturnRatio + c.partialReturnRatio > 1.0 + 1e-9) {
    throw new Error(
      `Konfigurationsfehler: noReturnRatio + partialReturnRatio = ${c.noReturnRatio + c.partialReturnRatio} > 1.0`
    )
  }
}

function main(): void {
  const config = DEFAULT_CONFIG
  console.log(`Datengenerator – Seed: ${config.seed}`)
  console.log(
    `Generiere ${config.ordersPerMonth * config.simulatedMonths} Orders über ${config.simulatedMonths} Monate...`
  )

  validateConfig(config)

  const prng = createPrng(config.seed)
  const influencers = generateInfluencers(config, prng)
  const orders = generateOrders(config, influencers, prng)

  const outputDir = path.resolve(process.cwd(), 'data', 'synthetic')
  writeOutput(influencers, orders, config, outputDir)

  const edgeCases = orders.filter(o => o.isEdgeCase).length
  console.log(`✓ ${orders.length} Orders geschrieben (davon ${edgeCases} Sonderfälle)`)
  console.log(`✓ Ausgabe: ${outputDir}`)
}

main()

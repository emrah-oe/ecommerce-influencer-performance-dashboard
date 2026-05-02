/**
 * Legt fehlende Shopify-Influencer aus data/shopify-influencers.config.json in Supabase an.
 * Bestehende Einträge (geprüft per discountCode) werden übersprungen – keine Updates, keine Deletes.
 * Standard: Dry-Run. Mit --execute werden die fehlenden Einträge wirklich geschrieben.
 */
import * as dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { readFileSync } from 'fs'
import { join } from 'path'

// ─── Typen ────────────────────────────────────────────────────────────────────

interface ShopifyInfluencerConfigEntry {
  id: string
  handle: string
  discountCode: string
  discountPercentage: number
  isMixed: boolean
  mixedReason: string | null
  source: string
}

// ─── Konstanten ───────────────────────────────────────────────────────────────

// Platzhalter für Felder, die nur für synthetische Order-Generierung relevant sind.
// Shopify-Influencer erscheinen im Dashboard nicht (fetchAllInfluencers filtert inf_shopify_* aus).
const DEFAULT_VOLUME_CLASS = 'mid' as const
const DEFAULT_NO_RETURN_RATIO = 0.87
const DEFAULT_PARTIAL_RETURN_RATIO = 0.08
const DEFAULT_FULL_RETURN_RATIO = 0.05

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const executeMode = process.argv.includes('--execute')

  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
  const prisma = new PrismaClient({ adapter })

  try {
    const config: ShopifyInfluencerConfigEntry[] = JSON.parse(
      readFileSync(join(process.cwd(), 'data', 'shopify-influencers.config.json'), 'utf-8'),
    )

    const allCodes = config.map(e => e.discountCode.toUpperCase())

    const existing = await prisma.influencer.findMany({
      where: { discountCode: { in: allCodes } },
      select: { id: true, handle: true, discountCode: true },
    })

    const existingByCode = new Map(existing.map(r => [r.discountCode.toUpperCase(), r]))

    const toCreate = config.filter(e => !existingByCode.has(e.discountCode.toUpperCase()))
    const toSkip   = config.filter(e =>  existingByCode.has(e.discountCode.toUpperCase()))

    console.log('\n' + '═'.repeat(68))
    console.log(`SHOPIFY-INFLUENCER SEED  ${executeMode ? '(EXECUTE)' : '(DRY-RUN – kein Schreiben)'}`)
    console.log('═'.repeat(68))
    console.log(`Config-Einträge gesamt:  ${config.length}`)
    console.log(`Bereits vorhanden:       ${toSkip.length}`)
    console.log(`Fehlend / anzulegen:     ${toCreate.length}`)

    if (toSkip.length > 0) {
      console.log('\nÜbersprungen (discountCode bereits in DB):')
      for (const e of toSkip) {
        const row = existingByCode.get(e.discountCode.toUpperCase())!
        console.log(`  ${e.discountCode.padEnd(12)} → id: ${row.id}  handle: ${row.handle}`)
      }
    }

    if (toCreate.length === 0) {
      console.log('\n✓ Keine fehlenden Einträge – nichts zu tun.')
      return
    }

    console.log('\nAnzulegende Einträge:')
    for (const e of toCreate) {
      console.log(`  ${e.discountCode.padEnd(12)} id: ${e.id.padEnd(22)} handle: ${e.handle}  isMixed: ${e.isMixed}`)
    }

    if (!executeMode) {
      console.log('\n⚠  Dry-Run: keine Datenbankänderungen vorgenommen.')
      console.log('   Execute-Modus: npm run seed:shopify-influencers -- --execute')
      console.log('═'.repeat(68))
      return
    }

    console.log('\nLege fehlende Einträge an...')
    let created = 0
    for (const e of toCreate) {
      await prisma.influencer.create({
        data: {
          id: e.id,
          handle: e.handle,
          volumeClass: DEFAULT_VOLUME_CLASS,
          isMixed: e.isMixed,
          discountCode: e.discountCode,
          noReturnRatio: DEFAULT_NO_RETURN_RATIO,
          partialReturnRatio: DEFAULT_PARTIAL_RETURN_RATIO,
          fullReturnRatio: DEFAULT_FULL_RETURN_RATIO,
        },
      })
      console.log(`  ✓ ${e.id}  (${e.discountCode})`)
      created++
    }

    console.log(`\n✓ ${created} Influencer angelegt.`)
    console.log('═'.repeat(68))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

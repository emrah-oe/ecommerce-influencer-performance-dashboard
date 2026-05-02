/**
 * Aktualisiert die Handles der 30 synthetischen Influencer (inf_01–inf_30) in Supabase.
 * Standard: Dry-Run. Mit --execute werden die Handles tatsächlich geschrieben.
 * IDs, discountCodes, isMixed und volumeClass bleiben unverändert.
 */
import * as dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// ─── Mapping inf_01..inf_30 → neuer Handle ────────────────────────────────────

const HANDLE_MAP: ReadonlyArray<{ id: string; handle: string }> = [
  { id: 'inf_01', handle: 'alex_move' },
  { id: 'inf_02', handle: 'anna_edit' },
  { id: 'inf_03', handle: 'antonio_dailyfit' },
  { id: 'inf_04', handle: 'arda_threads' },
  { id: 'inf_05', handle: 'ben_trailclub' },
  { id: 'inf_06', handle: 'clara_glowroom' },
  { id: 'inf_07', handle: 'elias_setup' },
  { id: 'inf_08', handle: 'emma_sundaynotes' },
  { id: 'inf_09', handle: 'finn_matchday' },
  { id: 'inf_10', handle: 'jonas_weekender' },
  { id: 'inf_11', handle: 'julia_at_home' },
  { id: 'inf_12', handle: 'kira_modeclub' },
  { id: 'inf_13', handle: 'lara_living' },
  { id: 'inf_14', handle: 'lea_minifamily' },
  { id: 'inf_15', handle: 'leo_cityfits' },
  { id: 'inf_16', handle: 'lina_skinjournal' },
  { id: 'inf_17', handle: 'lucas_playlab' },
  { id: 'inf_18', handle: 'luis_barbell' },
  { id: 'inf_19', handle: 'mario_kicks' },
  { id: 'inf_20', handle: 'marta_studio' },
  { id: 'inf_21', handle: 'mira_curated' },
  { id: 'inf_22', handle: 'nick_momentum' },
  { id: 'inf_23', handle: 'noah_bytes' },
  { id: 'inf_24', handle: 'pascal_roam' },
  { id: 'inf_25', handle: 'ron_athletics' },
  { id: 'inf_26', handle: 'sami_urbanwear' },
  { id: 'inf_27', handle: 'sara_daylight' },
  { id: 'inf_28', handle: 'sofia_softglam' },
  { id: 'inf_29', handle: 'tim_escape' },
  { id: 'inf_30', handle: 'tom_tailored' },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const executeMode = process.argv.includes('--execute')

  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
  const prisma = new PrismaClient({ adapter })

  try {
    const ids = HANDLE_MAP.map(e => e.id)
    const existing = await prisma.influencer.findMany({
      where: { id: { in: ids } },
      select: { id: true, handle: true },
    })
    const existingById = new Map(existing.map(r => [r.id, r.handle]))

    console.log('\n' + '═'.repeat(68))
    console.log(`SYNTHETIC HANDLE UPDATE  ${executeMode ? '(EXECUTE)' : '(DRY-RUN – kein Schreiben)'}`)
    console.log('═'.repeat(68))
    console.log(`Einträge in Mapping:     ${HANDLE_MAP.length}`)
    console.log(`In Supabase gefunden:    ${existing.length}`)

    const toUpdate = HANDLE_MAP.filter(e => {
      const current = existingById.get(e.id)
      return current !== undefined && current !== e.handle
    })
    const alreadyCorrect = HANDLE_MAP.filter(e => existingById.get(e.id) === e.handle)
    const notFound = HANDLE_MAP.filter(e => !existingById.has(e.id))

    console.log(`Bereits korrekt:         ${alreadyCorrect.length}`)
    console.log(`Zu aktualisieren:        ${toUpdate.length}`)
    if (notFound.length > 0) {
      console.log(`Nicht in DB gefunden:    ${notFound.length}`)
      for (const e of notFound) console.log(`  ✗ ${e.id}`)
    }

    if (toUpdate.length > 0) {
      console.log('\nÄnderungen:')
      for (const e of toUpdate) {
        const current = existingById.get(e.id)!
        console.log(`  ${e.id.padEnd(8)}  ${current.padEnd(20)} → ${e.handle}`)
      }
    }

    if (!executeMode) {
      console.log('\n⚠  Dry-Run: keine Datenbankänderungen vorgenommen.')
      console.log('   Execute-Modus: npx tsx scripts/update-synthetic-handles.ts --execute')
      console.log('═'.repeat(68))
      return
    }

    console.log('\nAktualisiere...')
    let updated = 0
    for (const e of toUpdate) {
      await prisma.influencer.update({ where: { id: e.id }, data: { handle: e.handle } })
      console.log(`  ✓ ${e.id}  → ${e.handle}`)
      updated++
    }

    console.log(`\n✓ ${updated} Handle(s) aktualisiert.`)
    console.log('═'.repeat(68))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

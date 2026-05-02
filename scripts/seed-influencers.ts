import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

interface InfluencerConfig {
  id: string
  handle: string
  volumeClass: 'top' | 'mid' | 'long_tail'
  isMixed: boolean
  discountCode: string
  noReturnRatio: number
  partialReturnRatio: number
  fullReturnRatio: number
}

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const raw = readFileSync(join(process.cwd(), 'data', 'influencers.config.json'), 'utf-8')
  const configs: InfluencerConfig[] = JSON.parse(raw) as InfluencerConfig[]

  let upserted = 0
  for (const cfg of configs) {
    await prisma.influencer.upsert({
      where: { id: cfg.id },
      create: {
        id: cfg.id,
        handle: cfg.handle,
        volumeClass: cfg.volumeClass,
        isMixed: cfg.isMixed,
        discountCode: cfg.discountCode,
        noReturnRatio: cfg.noReturnRatio,
        partialReturnRatio: cfg.partialReturnRatio,
        fullReturnRatio: cfg.fullReturnRatio,
      },
      update: {
        handle: cfg.handle,
        isMixed: cfg.isMixed,
        discountCode: cfg.discountCode,
        noReturnRatio: cfg.noReturnRatio,
        partialReturnRatio: cfg.partialReturnRatio,
        fullReturnRatio: cfg.fullReturnRatio,
      },
    })
    upserted++
  }

  console.log(`✓ ${upserted} Influencer geseedert`)
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

import type { Influencer } from '@prisma/client'
import type { VolumeClass } from '../../scripts/lib/types'
import { prisma } from '../lib/prisma'

export interface InfluencerRecord {
  id: string
  handle: string
  volumeClass: VolumeClass
  isMixed: boolean
  discountCode: string
}

function mapInfluencerToRecord(influencer: Influencer): InfluencerRecord {
  return {
    id: influencer.id,
    handle: influencer.handle,
    volumeClass: influencer.volumeClass as VolumeClass,
    isMixed: influencer.isMixed,
    discountCode: influencer.discountCode,
  }
}

export async function fetchAllInfluencers(): Promise<InfluencerRecord[]> {
  const influencers = await prisma.influencer.findMany({
    where: { NOT: { id: { startsWith: 'inf_shopify_' } } },
  })
  return influencers.map(mapInfluencerToRecord)
}

export async function fetchAllInfluencersForSync(): Promise<InfluencerRecord[]> {
  const influencers = await prisma.influencer.findMany()
  return influencers.map(mapInfluencerToRecord)
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Influencer } from '@prisma/client'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    influencer: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma.js'
import { fetchAllInfluencers } from '../influencers.js'

function makeDbInfluencer(overrides: Partial<Influencer> = {}): Influencer {
  return {
    id: 'inf_01',
    handle: 'influencer_a',
    volumeClass: 'top',
    isMixed: false,
    discountCode: 'INF01',
    noReturnRatio: 0.7,
    partialReturnRatio: 0.2,
    fullReturnRatio: 0.1,
    ...overrides,
  }
}

const findMany = vi.mocked(prisma.influencer.findMany)

beforeEach(() => {
  findMany.mockReset()
})

describe('fetchAllInfluencers', () => {
  it('gibt leeres Array zurück wenn keine Influencer vorhanden', async () => {
    findMany.mockResolvedValue([])
    const result = await fetchAllInfluencers()
    expect(result).toEqual([])
  })

  it('ruft prisma.influencer.findMany mit Shopify-Ausschlussfilter auf', async () => {
    findMany.mockResolvedValue([])
    await fetchAllInfluencers()
    expect(findMany).toHaveBeenCalledOnce()
    expect(findMany).toHaveBeenCalledWith({
      where: { NOT: { id: { startsWith: 'inf_shopify_' } } },
    })
  })

  it('mappt einen Influencer auf InfluencerRecord', async () => {
    findMany.mockResolvedValue([
      makeDbInfluencer({
        id: 'inf_42',
        handle: 'creator_x',
        volumeClass: 'mid',
        isMixed: true,
        discountCode: 'CREATOR10',
      }),
    ])
    const result = await fetchAllInfluencers()
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: 'inf_42',
      handle: 'creator_x',
      volumeClass: 'mid',
      isMixed: true,
      discountCode: 'CREATOR10',
    })
  })

  it('mappt mehrere Influencer unabhängig voneinander', async () => {
    findMany.mockResolvedValue([
      makeDbInfluencer({ id: 'inf_01', handle: 'alpha' }),
      makeDbInfluencer({ id: 'inf_02', handle: 'beta' }),
      makeDbInfluencer({ id: 'inf_03', handle: 'gamma' }),
    ])
    const result = await fetchAllInfluencers()
    expect(result).toHaveLength(3)
    expect(result.map((r) => r.id)).toEqual(['inf_01', 'inf_02', 'inf_03'])
    expect(result.map((r) => r.handle)).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('alle drei VolumeClass-Werte werden korrekt gemappt', async () => {
    for (const volumeClass of ['top', 'mid', 'long_tail'] as const) {
      findMany.mockResolvedValue([makeDbInfluencer({ volumeClass })])
      const result = await fetchAllInfluencers()
      expect(result[0]?.volumeClass).toBe(volumeClass)
    }
  })

  it('enthält keine internen Datenbankfelder wie noReturnRatio', async () => {
    findMany.mockResolvedValue([makeDbInfluencer()])
    const result = await fetchAllInfluencers()
    const record = result[0] ?? {}
    expect(Object.keys(record)).not.toContain('noReturnRatio')
    expect(Object.keys(record)).not.toContain('partialReturnRatio')
    expect(Object.keys(record)).not.toContain('fullReturnRatio')
    expect(Object.keys(record)).toHaveLength(5)
  })
})

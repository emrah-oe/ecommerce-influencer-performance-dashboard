import type { GeneratorConfig } from '../config.js'
import type { Influencer, ProfileClass, AttributionProfile, ReturnProfile, VolumeClass } from './types.js'
import type { createPrng } from './prng.js'

type Prng = ReturnType<typeof createPrng>

const HANDLES: readonly string[] = [
  'alex_move', 'anna_edit', 'antonio_dailyfit', 'arda_threads', 'ben_trailclub',
  'clara_glowroom', 'elias_setup', 'emma_sundaynotes', 'finn_matchday', 'jonas_weekender',
  'julia_at_home', 'kira_modeclub', 'lara_living', 'lea_minifamily', 'leo_cityfits',
  'lina_skinjournal', 'lucas_playlab', 'luis_barbell', 'mario_kicks', 'marta_studio',
  'mira_curated', 'nick_momentum', 'noah_bytes', 'pascal_roam', 'ron_athletics',
  'sami_urbanwear', 'sara_daylight', 'sofia_softglam', 'tim_escape', 'tom_tailored',
]

const PROFILE_CLASSES: readonly ProfileClass[] = [
  // top (0–2)
  'predominantly_clean',   // 0: alex_move
  'moderately_mixed',      // 1: anna_edit
  'extreme_risk',          // 2: antonio_dailyfit
  // mid (3–9)
  'predominantly_clean',   // 3: arda_threads
  'predominantly_clean',   // 4: ben_trailclub
  'predominantly_clean',   // 5: clara_glowroom
  'predominantly_clean',   // 6: elias_setup
  'moderately_mixed',      // 7: emma_sundaynotes
  'moderately_mixed',      // 8: finn_matchday
  'heavily_mixed',         // 9: jonas_weekender
  // long_tail (10–29)
  'predominantly_clean',   // 10: julia_at_home
  'predominantly_clean',   // 11: kira_modeclub
  'predominantly_clean',   // 12: lara_living
  'predominantly_clean',   // 13: lea_minifamily
  'predominantly_clean',   // 14: leo_cityfits
  'predominantly_clean',   // 15: lina_skinjournal
  'predominantly_clean',   // 16: lucas_playlab
  'moderately_mixed',      // 17: luis_barbell
  'moderately_mixed',      // 18: mario_kicks
  'moderately_mixed',      // 19: marta_studio
  'moderately_mixed',      // 20: mira_curated
  'moderately_mixed',      // 21: nick_momentum
  'moderately_mixed',      // 22: noah_bytes
  'moderately_mixed',      // 23: pascal_roam
  'heavily_mixed',         // 24: ron_athletics
  'heavily_mixed',         // 25: sami_urbanwear
  'heavily_mixed',         // 26: sara_daylight
  'heavily_mixed',         // 27: sofia_softglam
  'heavily_mixed',         // 28: tim_escape
  'extreme_risk',          // 29: tom_tailored (EC6)
]

function buildAttributionProfile(prng: Prng, cls: ProfileClass): AttributionProfile {
  let pUnknown: number
  let cleanRatio: number
  switch (cls) {
    case 'predominantly_clean':
      pUnknown   = 0.20 + prng() * 0.15   // 20–35 %
      cleanRatio = 0.88 + prng() * 0.10   // 88–98 %
      break
    case 'moderately_mixed':
      pUnknown   = 0.10 + prng() * 0.15   // 10–25 %
      cleanRatio = 0.40 + prng() * 0.30   // 40–70 %
      break
    case 'heavily_mixed':
      pUnknown   = 0.10 + prng() * 0.10   // 10–20 %
      cleanRatio = 0.10 + prng() * 0.20   // 10–30 %
      break
    case 'extreme_risk':
      pUnknown   = 0.05 + prng() * 0.10   // 5–15 %
      cleanRatio = 0.02 + prng() * 0.06   // 2–8 %
      break
  }
  const knownShare = 1 - pUnknown
  return {
    pClean:   knownShare * cleanRatio,
    pMixed:   knownShare * (1 - cleanRatio),
    pUnknown,
  }
}

function buildReturnProfile(
  prng: Prng,
  base: { noReturnRatio: number; partialReturnRatio: number },
): ReturnProfile {
  const noRaw = Math.max(0.01, base.noReturnRatio + (prng() - 0.5) * 0.10)
  const partialRaw = Math.max(0.01, base.partialReturnRatio + (prng() - 0.5) * 0.06)
  const fullRaw = Math.max(0.01, 1 - noRaw - partialRaw)
  const total = noRaw + partialRaw + fullRaw
  return {
    noReturnRatio: noRaw / total,
    partialReturnRatio: partialRaw / total,
    fullReturnRatio: fullRaw / total,
  }
}

export function generateInfluencers(config: GeneratorConfig, prng: Prng): Influencer[] {
  const longTailCount = config.influencerCount - config.topTierCount - config.midTierCount

  const tiers: VolumeClass[] = [
    ...Array<VolumeClass>(config.topTierCount).fill('top'),
    ...Array<VolumeClass>(config.midTierCount).fill('mid'),
    ...Array<VolumeClass>(longTailCount).fill('long_tail'),
  ]

  return tiers.map((volumeClass, idx): Influencer => {
    const num = String(idx + 1).padStart(2, '0')
    const id = `inf_${num}`
    const profileClass = PROFILE_CLASSES[idx]!
    const isMixed = profileClass !== 'predominantly_clean'
    const attributionProfile = buildAttributionProfile(prng, profileClass)
    return {
      id,
      handle: HANDLES[idx]!,
      volumeClass,
      profileClass,
      attributionProfile,
      isMixed,
      returnProfile: buildReturnProfile(prng, {
        noReturnRatio: config.noReturnRatio,
        partialReturnRatio: config.partialReturnRatio,
      }),
      discountCode: {
        code: `CODE_CREATOR_${num}`,
        influencerId: id,
        isMixed,
      },
    }
  })
}

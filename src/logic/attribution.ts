import type { AttributionStatus } from '../../scripts/lib/types'

export interface InfluencerMatch {
  isMixed: boolean
}

export interface AttributionDistribution {
  clean_influencer: number
  mixed_code: number
  unknown: number
  total: number
}

export interface AttributionDistributionRatio {
  clean_influencer: number
  mixed_code: number
  unknown: number
}

/**
 * Leitet den AttributionStatus aus den Rohdaten einer Order ab.
 * Kein Datenbankzugriff – reine Eingabe/Ausgabe-Logik.
 */
export function deriveAttributionStatus(
  hasDiscountCode: boolean,
  usedDiscountCode: string | null,
  matchedInfluencer: InfluencerMatch | null,
): AttributionStatus {
  if (!hasDiscountCode || usedDiscountCode === null || matchedInfluencer === null) {
    return 'unknown'
  }
  return matchedInfluencer.isMixed ? 'mixed_code' : 'clean_influencer'
}

/**
 * Zählt Orders je AttributionStatus.
 */
export function countByAttributionStatus(
  statuses: AttributionStatus[],
): AttributionDistribution {
  const result: AttributionDistribution = {
    clean_influencer: 0,
    mixed_code: 0,
    unknown: 0,
    total: statuses.length,
  }
  for (const s of statuses) {
    result[s] += 1
  }
  return result
}

/**
 * Berechnet den prozentualen Anteil je Status (0–1).
 * Bei leerem Input sind alle Anteile 0.
 */
export function calculateAttributionRatios(
  distribution: AttributionDistribution,
): AttributionDistributionRatio {
  const { total } = distribution
  if (total === 0) {
    return { clean_influencer: 0, mixed_code: 0, unknown: 0 }
  }
  return {
    clean_influencer: distribution.clean_influencer / total,
    mixed_code: distribution.mixed_code / total,
    unknown: distribution.unknown / total,
  }
}

/**
 * Gibt true zurück, wenn der Status eine eindeutig saubere Influencer-Zuordnung darstellt.
 */
export function isReliableAttribution(status: AttributionStatus): boolean {
  return status === 'clean_influencer'
}

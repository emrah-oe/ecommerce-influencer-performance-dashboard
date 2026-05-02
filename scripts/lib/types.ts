export type AttributionStatus = 'clean_influencer' | 'mixed_code' | 'unknown'
export type ReturnStatus = 'no_return' | 'partial_return' | 'full_return'
export type ReturnSource = 'tag' | 'metafield' | 'none'
export type VolumeClass = 'top' | 'mid' | 'long_tail'
export type ProfileClass =
  | 'predominantly_clean'
  | 'moderately_mixed'
  | 'heavily_mixed'
  | 'extreme_risk'

export interface AttributionProfile {
  pClean: number
  pMixed: number
  pUnknown: number
}

export interface ReturnProfile {
  noReturnRatio: number
  partialReturnRatio: number
  fullReturnRatio: number
}

export interface DiscountCode {
  code: string
  influencerId: string
  isMixed: boolean
}

export interface Influencer {
  id: string
  handle: string
  volumeClass: VolumeClass
  profileClass: ProfileClass
  attributionProfile: AttributionProfile
  isMixed: boolean  // Legacy: abgeleitet als profileClass !== 'predominantly_clean'
  returnProfile: ReturnProfile
  discountCode: DiscountCode
}

export interface Order {
  orderId: string
  orderDate: string           // ISO-8601
  grossRevenue: number
  hasDiscountCode: boolean
  usedDiscountCode: string | null
  attributionStatus: AttributionStatus
  attributedInfluencerId: string | null
  returnStatus: ReturnStatus
  refundAmount: number
  returnSource: ReturnSource
  rawTags: string[]
  rawMetafields: Record<string, string>
  rawOrderPayload: Record<string, unknown>
  isEdgeCase: boolean
}

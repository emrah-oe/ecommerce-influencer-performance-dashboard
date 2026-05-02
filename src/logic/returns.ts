import type { ReturnStatus } from '../../scripts/lib/types'

export interface NetRevenueResult {
  grossRevenue: number
  refundAmount: number
  netRevenue: number
}

export interface ValidationResult {
  valid: boolean
  reason?: string
}

export function calculateNetRevenue(
  grossRevenue: number,
  refundAmount: number,
): NetRevenueResult {
  return {
    grossRevenue,
    refundAmount,
    netRevenue: grossRevenue - refundAmount,
  }
}

export function validateRefundAmount(
  grossRevenue: number,
  refundAmount: number,
  returnStatus: ReturnStatus,
): ValidationResult {
  if (refundAmount < 0) {
    return { valid: false, reason: 'refundAmount darf nicht negativ sein' }
  }
  if (refundAmount > grossRevenue) {
    return { valid: false, reason: 'refundAmount übersteigt grossRevenue' }
  }

  switch (returnStatus) {
    case 'no_return':
      if (refundAmount !== 0) {
        return { valid: false, reason: 'no_return erfordert refundAmount = 0' }
      }
      break
    case 'full_return':
      if (refundAmount !== grossRevenue) {
        return {
          valid: false,
          reason: 'full_return erfordert refundAmount = grossRevenue',
        }
      }
      break
    case 'partial_return':
      if (refundAmount <= 0 || refundAmount >= grossRevenue) {
        return {
          valid: false,
          reason:
            'partial_return erfordert 0 < refundAmount < grossRevenue',
        }
      }
      break
  }

  return { valid: true }
}

export function hasReturn(returnStatus: ReturnStatus): boolean {
  return returnStatus === 'partial_return' || returnStatus === 'full_return'
}

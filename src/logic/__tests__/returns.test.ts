import { describe, it, expect } from 'vitest'
import {
  calculateNetRevenue,
  validateRefundAmount,
  hasReturn,
} from '../returns.js'

describe('calculateNetRevenue', () => {
  it('gibt netRevenue = grossRevenue - refundAmount zurück', () => {
    const result = calculateNetRevenue(100, 30)
    expect(result.netRevenue).toBe(70)
    expect(result.grossRevenue).toBe(100)
    expect(result.refundAmount).toBe(30)
  })

  it('no_return: refundAmount = 0 → netRevenue = grossRevenue', () => {
    const result = calculateNetRevenue(200, 0)
    expect(result.netRevenue).toBe(200)
  })

  it('full_return: refundAmount = grossRevenue → netRevenue = 0', () => {
    const result = calculateNetRevenue(150, 150)
    expect(result.netRevenue).toBe(0)
  })

  it('partial_return: 0 < refundAmount < grossRevenue', () => {
    const result = calculateNetRevenue(120, 40)
    expect(result.netRevenue).toBe(80)
  })
})

describe('validateRefundAmount – no_return', () => {
  it('valid: refundAmount = 0', () => {
    expect(validateRefundAmount(100, 0, 'no_return').valid).toBe(true)
  })

  it('invalid: refundAmount > 0', () => {
    const result = validateRefundAmount(100, 10, 'no_return')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/no_return/)
  })
})

describe('validateRefundAmount – full_return', () => {
  it('valid: refundAmount = grossRevenue', () => {
    expect(validateRefundAmount(100, 100, 'full_return').valid).toBe(true)
  })

  it('invalid: refundAmount < grossRevenue', () => {
    const result = validateRefundAmount(100, 80, 'full_return')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/full_return/)
  })
})

describe('validateRefundAmount – partial_return', () => {
  it('valid: 0 < refundAmount < grossRevenue', () => {
    expect(validateRefundAmount(100, 50, 'partial_return').valid).toBe(true)
  })

  it('invalid: refundAmount = 0', () => {
    const result = validateRefundAmount(100, 0, 'partial_return')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/partial_return/)
  })

  it('invalid: refundAmount = grossRevenue', () => {
    const result = validateRefundAmount(100, 100, 'partial_return')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/partial_return/)
  })
})

describe('validateRefundAmount – ungültige Grundkonstellationen', () => {
  it('invalid: refundAmount negativ', () => {
    const result = validateRefundAmount(100, -10, 'no_return')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/negativ/)
  })

  it('invalid: refundAmount > grossRevenue', () => {
    const result = validateRefundAmount(100, 150, 'full_return')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/übersteigt/)
  })
})

describe('hasReturn', () => {
  it('no_return → false', () => {
    expect(hasReturn('no_return')).toBe(false)
  })

  it('partial_return → true', () => {
    expect(hasReturn('partial_return')).toBe(true)
  })

  it('full_return → true', () => {
    expect(hasReturn('full_return')).toBe(true)
  })
})

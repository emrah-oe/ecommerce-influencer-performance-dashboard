import type { ShopifyOrder } from './shopifyTypes'
import type { ReturnStatus, ReturnSource } from '../../scripts/lib/types'

export interface RefundParseResult {
  returnStatus: ReturnStatus
  refundAmount: number
  returnSource: ReturnSource
}

const RETURN_TAG_PATTERNS = ['return', 'returned', 'refunded', 'rücksendung', 'retoure']

function hasReturnTag(tags: string): boolean {
  return tags
    .split(',')
    .map(t => t.trim().toLowerCase())
    .some(tag => RETURN_TAG_PATTERNS.some(pattern => tag.includes(pattern)))
}

export function parseShopifyRefunds(order: ShopifyOrder): RefundParseResult {
  const grossRevenue = parseFloat(order.total_price)

  const refundAmount = order.refunds.reduce(
    (sum, refund) =>
      sum + refund.refund_line_items.reduce((s, item) => s + parseFloat(item.subtotal), 0),
    0,
  )

  let returnStatus: ReturnStatus
  if (refundAmount <= 0) {
    returnStatus = 'no_return'
  } else if (refundAmount >= grossRevenue) {
    returnStatus = 'full_return'
  } else {
    returnStatus = 'partial_return'
  }

  const returnSource: ReturnSource = hasReturnTag(order.tags) ? 'tag' : 'none'

  return { returnStatus, refundAmount, returnSource }
}

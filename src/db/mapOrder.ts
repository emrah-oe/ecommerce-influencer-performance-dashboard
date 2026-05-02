import type { Order } from '@prisma/client'
import type { AttributionStatus, ReturnStatus } from '../../scripts/lib/types'
import type { OrderInput } from '../metrics/orderMetrics'
import type { InfluencerOrderInput } from '../metrics/influencerMetrics'

export function mapOrderToInput(order: Order): OrderInput {
  return {
    grossRevenue: order.grossRevenue.toNumber(),
    refundAmount: order.refundAmount.toNumber(),
    returnStatus: order.returnStatus as ReturnStatus,
    attributionStatus: order.attributionStatus as AttributionStatus,
  }
}

export function mapAttributedOrderToInfluencerInput(
  order: Order & { attributedInfluencerId: string },
): InfluencerOrderInput {
  return {
    ...mapOrderToInput(order),
    attributedInfluencerId: order.attributedInfluencerId,
  }
}

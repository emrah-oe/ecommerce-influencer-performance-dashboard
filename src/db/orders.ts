import type { Order } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { mapOrderToInput, mapAttributedOrderToInfluencerInput } from './mapOrder'
import type { OrderInput } from '../metrics/orderMetrics'
import type { InfluencerOrderInput } from '../metrics/influencerMetrics'

const SHOPIFY_ORDER_FILTER = { NOT: { orderId: { startsWith: 'shopify_' } } }

export async function fetchAllOrders(): Promise<OrderInput[]> {
  const orders = await prisma.order.findMany({ where: SHOPIFY_ORDER_FILTER })
  return orders.map(mapOrderToInput)
}

function isAttributed(order: Order): order is Order & { attributedInfluencerId: string } {
  return order.attributedInfluencerId !== null
}

export async function fetchAttributedOrders(): Promise<InfluencerOrderInput[]> {
  const orders = await prisma.order.findMany({
    where: { attributedInfluencerId: { not: null }, ...SHOPIFY_ORDER_FILTER },
  })
  return orders.filter(isAttributed).map(mapAttributedOrderToInfluencerInput)
}

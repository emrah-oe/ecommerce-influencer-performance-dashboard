import { prisma } from '../lib/prisma'
import { fetchAllOrders as fetchShopifyOrders } from './shopifyClient'
import { mapShopifyOrder } from './mapShopifyOrder'
import { fetchAllInfluencersForSync } from '../db/influencers'
import type { ShopifyClientConfig, FetchOrdersOptions } from './shopifyClient'

export interface SyncResult {
  processed: number
  failed: number
  errors: string[]
}

export async function syncOrders(
  config: ShopifyClientConfig,
  options: FetchOrdersOptions = {},
): Promise<SyncResult> {
  const result: SyncResult = { processed: 0, failed: 0, errors: [] }
  let fatalError: string | null = null

  try {
    const influencers = await fetchAllInfluencersForSync()
    const influencersByCode = new Map(
      influencers.map(inf => [inf.discountCode.toUpperCase(), inf]),
    )

    for await (const page of fetchShopifyOrders(config, options)) {
      for (const shopifyOrder of page) {
        try {
          const input = mapShopifyOrder(shopifyOrder, influencersByCode)

          await prisma.order.upsert({
            where: { orderId: input.orderId },
            create: {
              orderId: input.orderId,
              orderDate: input.orderDate,
              grossRevenue: input.grossRevenue,
              hasDiscountCode: input.hasDiscountCode,
              usedDiscountCode: input.usedDiscountCode,
              attributionStatus: input.attributionStatus,
              attributedInfluencerId: input.attributedInfluencerId,
              returnStatus: input.returnStatus,
              refundAmount: input.refundAmount,
              returnSource: input.returnSource,
              rawTags: input.rawTags,
              rawMetafields: input.rawMetafields,
              rawOrderPayload: input.rawOrderPayload as object,
              isEdgeCase: input.isEdgeCase,
            },
            update: {
              // rawTags, rawMetafields, rawOrderPayload werden NIE überschrieben
              attributionStatus: input.attributionStatus,
              attributedInfluencerId: input.attributedInfluencerId,
              returnStatus: input.returnStatus,
              refundAmount: input.refundAmount,
              returnSource: input.returnSource,
            },
          })

          result.processed++
        } catch (err) {
          result.failed++
          result.errors.push(
            `shopify_${shopifyOrder.id}: ${err instanceof Error ? err.message : String(err)}`,
          )
        }
      }
    }
  } catch (err) {
    fatalError = err instanceof Error ? err.message : String(err)
    result.errors.push(`Fatal: ${fatalError}`)
  } finally {
    const status =
      fatalError !== null ? 'error' : result.failed === 0 ? 'success' : 'partial'

    await prisma.syncRun.create({
      data: {
        seed: null,
        generatedAt: null,
        config: { source: 'shopify', apiVersion: config.apiVersion },
        counts: { processed: result.processed, failed: result.failed },
        status,
        errorMessage:
          result.errors.length > 0 ? result.errors.slice(0, 20).join('\n') : null,
      },
    })
  }

  return result
}

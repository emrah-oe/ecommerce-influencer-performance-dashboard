import type { ShopifyOrder, ShopifyOrdersResponse } from './shopifyTypes'

export interface ShopifyClientConfig {
  storeDomain: string
  accessToken: string
  apiVersion: string
}

export interface ShopifyAppCredentials {
  storeDomain: string
  clientId: string
  clientSecret: string
}

export async function getShopifyAccessToken(creds: ShopifyAppCredentials): Promise<string> {
  const url = `https://${creds.storeDomain}/admin/oauth/access_token`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: 'client_credentials',
    }),
  })
  if (!response.ok) {
    throw new Error(`Shopify Token-Fehler: ${response.status} ${response.statusText}`)
  }
  const data = (await response.json()) as { access_token: string }
  return data.access_token
}

export interface FetchOrdersOptions {
  updatedAtMin?: string
  limit?: number
}

function parseLinkHeader(header: string | null): string | null {
  if (!header) return null
  const match = header.match(/<([^>]+)>;\s*rel="next"/)
  return match?.[1] ?? null
}

export async function fetchOrderPage(
  config: ShopifyClientConfig,
  urlOrParams: string,
): Promise<{ orders: ShopifyOrder[]; nextUrl: string | null }> {
  const url = urlOrParams.startsWith('https://')
    ? urlOrParams
    : `https://${config.storeDomain}/admin/api/${config.apiVersion}/orders.json${urlOrParams}`

  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': config.accessToken,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText} (${url})`)
  }

  const data = (await response.json()) as ShopifyOrdersResponse
  const nextUrl = parseLinkHeader(response.headers.get('link'))

  return { orders: data.orders, nextUrl }
}

export async function* fetchAllOrders(
  config: ShopifyClientConfig,
  options: FetchOrdersOptions = {},
): AsyncGenerator<ShopifyOrder[]> {
  const params = new URLSearchParams({
    limit: String(options.limit ?? 250),
    status: 'any',
  })
  if (options.updatedAtMin) {
    params.set('updated_at_min', options.updatedAtMin)
  }

  let nextUrl: string | null = `?${params.toString()}`

  while (nextUrl !== null) {
    const result = await fetchOrderPage(config, nextUrl)
    yield result.orders
    nextUrl = result.nextUrl
    if (nextUrl) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
}

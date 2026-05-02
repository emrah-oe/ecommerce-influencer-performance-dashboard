import * as dotenv from 'dotenv'
dotenv.config()

import { syncOrders } from '../src/sync/syncOrders'
import { getShopifyAccessToken } from '../src/sync/shopifyClient'
import type { ShopifyClientConfig } from '../src/sync/shopifyClient'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Fehlende Umgebungsvariable: ${name}`)
  return value
}

async function main() {
  const storeDomain = requireEnv('SHOPIFY_STORE_DOMAIN')
  const clientId = requireEnv('SHOPIFY_CLIENT_ID')
  const clientSecret = requireEnv('SHOPIFY_CLIENT_SECRET')
  const apiVersion = process.env['SHOPIFY_API_VERSION'] ?? '2026-04'

  const accessToken = await getShopifyAccessToken({ storeDomain, clientId, clientSecret })

  const config: ShopifyClientConfig = { storeDomain, accessToken, apiVersion }

  const updatedAtMin = process.argv[2]

  console.log(`Sync gestartet (store: ${storeDomain}${updatedAtMin ? `, ab: ${updatedAtMin}` : ''})`)

  const result = await syncOrders(config, { updatedAtMin })

  console.log(`✓ Verarbeitet: ${result.processed}`)
  if (result.failed > 0) {
    console.error(`✗ Fehler: ${result.failed}`)
    result.errors.forEach(e => console.error(`  - ${e}`))
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

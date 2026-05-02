/**
 * Phase 1: Vorhandene Rabattcodes per Shopify GraphQL Admin API laden und validieren.
 * Phase 2 (Dry-Run): 150 Order-Definitionen gemäß ADR-004 generieren – keine Mutationen.
 * Erstellt keine Orders, keine Discounts, ändert Supabase nicht.
 */
import * as dotenv from 'dotenv'
dotenv.config()

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getShopifyAccessToken } from '../src/sync/shopifyClient'
import { createPrng, sampleLognormal } from './lib/prng.js'
import { DEFAULT_CONFIG } from './config.js'

// ─── Konstanten ────────────────────────────────────────────────────────────────

const EXPECTED_CODE_COUNT = 30
const TOTAL_ORDERS = 150
const UNKNOWN_ORDERS = 25   // code-los → attribution: unknown
const CURRENCY_CODE = 'EUR'
const TARGET_CLEAN = 105
const TARGET_MIXED = 20
const TARGET_NO_RETURN = 130
const TARGET_PARTIAL_RETURN = 12
const TARGET_FULL_RETURN = 8
const SEED = 42
const RATE_LIMIT_DELAY_MS = 12_000  // 5 Orders/Minute
const MIN_ORDER_VALUE = 30
const MAX_ORDER_VALUE = 250
const MAX_CART_ATTEMPTS = 10  // maximale Versuche für Warenkorb im Zielbereich

// ─── CLI-Argumente ────────────────────────────────────────────────────────────

function parseArgs(): { executeMode: boolean; limit: number | null; offset: number } {
  const args = process.argv.slice(2)
  const executeMode = args.includes('--execute')
  const limitIdx = args.indexOf('--limit')
  let limit: number | null = null
  if (limitIdx !== -1) {
    const raw = args[limitIdx + 1]
    const n = raw !== undefined ? parseInt(raw, 10) : NaN
    if (isNaN(n) || n < 1) throw new Error(`Ungültiger --limit-Wert: ${raw ?? '(leer)'}`)
    limit = n
  }
  const offsetIdx = args.indexOf('--offset')
  let offset = 0
  if (offsetIdx !== -1) {
    const raw = args[offsetIdx + 1]
    const n = raw !== undefined ? parseInt(raw, 10) : NaN
    if (isNaN(n) || n < 0) throw new Error(`Ungültiger --offset-Wert: ${raw ?? '(leer)'}`)
    offset = n
  }
  return { executeMode, limit, offset }
}

// ─── Tag-Konventionen (aus bestehenden Dev-Store-Orders) ──────────────────────

type ReturnStatus = 'no_return' | 'partial_return' | 'full_return'
type AttributionStatus = 'clean_influencer' | 'mixed_code' | 'unknown'

function attributionTag(s: AttributionStatus): string {
  return `attribution_${s}`
}

function codeTag(code: string | null): string {
  return code !== null ? `code_${code.toUpperCase()}` : 'code_none'
}

function influencerTag(handle: string | null): string {
  return handle !== null ? `influencer_${handle}` : 'influencer_unknown'
}

function returnTag(s: ReturnStatus): string {
  // Hinweis: parseShopifyRefunds.ts leitet returnSource aus diesen Tags ab (hasReturnTag).
  // 'return_not_returned' enthält 'returned' → returnSource: 'tag' auch für no_return-Orders.
  // returnStatus selbst wird im Sync aus dem Refund-Betrag abgeleitet, nicht aus Tags.
  switch (s) {
    case 'no_return':      return 'return_not_returned'
    case 'partial_return': return 'return_partially_returned'
    case 'full_return':    return 'return_returned'
  }
}

// ─── Typen ────────────────────────────────────────────────────────────────────

interface InfluencerConfigEntry {
  id: string
  handle: string
  discountCode: string
  discountPercentage: number
  isMixed: boolean
  mixedReason: string | null
  source: string
}

interface DiscountCodeRecord {
  shopifyId: string
  code: string
}

interface CodeInfo {
  shopifyId: string
  code: string
  handle: string
  discountPercentage: number
  isMixed: boolean
  mixedReason: string | null
}

interface LineItemDef {
  title: string
  price: number
  quantity: number
  variantId?: string
}

interface OrderDef {
  index: number
  discountCode: string | null
  discountPercentage: number | null
  handle: string | null
  attributionStatus: AttributionStatus
  grossRevenue: number
  lineItems: LineItemDef[]
  tags: string[]
  returnStatus: ReturnStatus
  refundAmountDesignated: number
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

interface ShopifyProduct {
  id: string
  title: string
  variants: Array<{ id: string; title: string; price: number }>
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Fehlende Umgebungsvariable: ${name}`)
  return value
}

function pct(n: number, total: number): string {
  return `${((n / total) * 100).toFixed(1)} %`
}

function shuffle<T>(arr: T[], prng: () => number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1))
    const tmp = result[i]!
    result[i] = result[j]!
    result[j] = tmp
  }
  return result
}

function splitAmount(total: number, n: number, prng: () => number): number[] {
  if (n === 1) return [Math.round(total * 100) / 100]
  const min = 5.0
  const parts: number[] = []
  let remaining = total
  for (let i = 0; i < n - 1; i++) {
    const maxForThis = remaining - (n - 1 - i) * min
    const amount = maxForThis <= min ? min : min + prng() * (maxForThis - min)
    const rounded = Math.round(amount * 100) / 100
    parts.push(rounded)
    remaining = Math.round((remaining - rounded) * 100) / 100
  }
  parts.push(Math.max(min, Math.round(remaining * 100) / 100))
  return parts
}

// ─── Influencer-Config laden ───────────────────────────────────────────────────

function loadInfluencerConfig(): InfluencerConfigEntry[] {
  const p = join(process.cwd(), 'data', 'shopify-influencers.config.json')
  return JSON.parse(readFileSync(p, 'utf-8')) as InfluencerConfigEntry[]
}

function buildCodeInfo(records: DiscountCodeRecord[]): CodeInfo[] {
  const configEntries = loadInfluencerConfig()
  const configByCode = new Map<string, InfluencerConfigEntry>()
  for (const entry of configEntries) {
    configByCode.set(entry.discountCode.toUpperCase(), entry)
  }

  // Shopify-Codes ohne Config-Eintrag → Abbruch
  const missingInConfig = records.filter(r => !configByCode.has(r.code.toUpperCase())).map(r => r.code)
  if (missingInConfig.length > 0) {
    console.error(`✗ Shopify-Codes nicht in data/shopify-influencers.config.json: ${missingInConfig.join(', ')}`)
    process.exit(1)
  }

  // Config-Codes ohne entsprechenden Shopify-Code → Abbruch
  const shopifyCodes = new Set(records.map(r => r.code.toUpperCase()))
  const missingInShopify = configEntries
    .filter(e => !shopifyCodes.has(e.discountCode.toUpperCase()))
    .map(e => e.discountCode)
  if (missingInShopify.length > 0) {
    console.error(`✗ Config-Codes nicht im Shopify Dev Store gefunden: ${missingInShopify.join(', ')}`)
    console.error('  Bitte fehlende Codes im Dev Store anlegen oder aus data/shopify-influencers.config.json entfernen.')
    process.exit(1)
  }

  return records.map((r): CodeInfo => {
    const cfg = configByCode.get(r.code.toUpperCase())!
    return {
      shopifyId: r.shopifyId,
      code: r.code,
      handle: cfg.handle,
      discountPercentage: cfg.discountPercentage,
      isMixed: cfg.isMixed,
      mixedReason: cfg.mixedReason,
    }
  })
}

// ─── GraphQL Helper ───────────────────────────────────────────────────────────

async function shopifyGraphQL<T>(
  storeDomain: string,
  accessToken: string,
  apiVersion: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const url = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!response.ok) {
    throw new Error(`GraphQL-Fehler: ${response.status} ${response.statusText}`)
  }
  const json = (await response.json()) as GraphQLResponse<T>
  if (json.errors?.length) {
    throw new Error(`GraphQL-Fehler: ${json.errors.map(e => e.message).join(', ')}`)
  }
  if (!json.data) throw new Error('GraphQL-Response enthält kein data-Feld')
  return json.data
}

// ─── Phase 1: Rabattcodes laden ───────────────────────────────────────────────

interface CodeDiscountNodesData {
  codeDiscountNodes: {
    nodes: Array<{
      id: string
      codeDiscount: { codes: { nodes: Array<{ code: string }> } } | null
    }>
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }
}

const DISCOUNT_CODES_QUERY = `
  query GetDiscountCodes($first: Int!, $after: String) {
    codeDiscountNodes(first: $first, after: $after) {
      nodes {
        id
        codeDiscount {
          ... on DiscountCodeBasic        { codes(first: 1) { nodes { code } } }
          ... on DiscountCodeBxgy         { codes(first: 1) { nodes { code } } }
          ... on DiscountCodeFreeShipping { codes(first: 1) { nodes { code } } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

async function loadDiscountCodes(
  storeDomain: string,
  accessToken: string,
  apiVersion: string,
): Promise<DiscountCodeRecord[]> {
  const records: DiscountCodeRecord[] = []
  let after: string | null = null
  do {
    const data: CodeDiscountNodesData = await shopifyGraphQL<CodeDiscountNodesData>(
      storeDomain, accessToken, apiVersion, DISCOUNT_CODES_QUERY, { first: 50, after },
    )
    for (const node of data.codeDiscountNodes.nodes) {
      const code = node.codeDiscount?.codes?.nodes[0]?.code
      if (code) {
        records.push({ shopifyId: node.id, code })
      } else {
        console.warn(`  Warnung: Discount-Node ${node.id} ohne Code-String – übersprungen`)
      }
    }
    const { hasNextPage, endCursor }: { hasNextPage: boolean; endCursor: string | null } =
      data.codeDiscountNodes.pageInfo
    after = hasNextPage ? (endCursor ?? null) : null
  } while (after !== null)
  return records
}

// ─── Phase 2: Produkte laden ──────────────────────────────────────────────────

interface ProductsData {
  products: {
    nodes: Array<{
      id: string
      title: string
      variants: { nodes: Array<{ id: string; title: string; price: string }> }
    }>
  }
}

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!) {
    products(first: $first) {
      nodes {
        id title
        variants(first: 3) { nodes { id title price } }
      }
    }
  }
`

type ProductLoadResult =
  | { ok: true; products: ShopifyProduct[] }
  | { ok: false; reason: string }

async function loadProducts(
  storeDomain: string,
  accessToken: string,
  apiVersion: string,
): Promise<ProductLoadResult> {
  let data: ProductsData
  try {
    data = await shopifyGraphQL<ProductsData>(
      storeDomain, accessToken, apiVersion, PRODUCTS_QUERY, { first: 20 },
    )
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) }
  }
  const products = data.products.nodes
    .filter(p => p.variants.nodes.length > 0)
    .map(p => ({
      id: p.id,
      title: p.title,
      variants: p.variants.nodes.map(v => ({
        id: v.id,
        title: v.title,
        price: parseFloat(v.price),
      })),
    }))
  if (products.length === 0) {
    return { ok: false, reason: 'Keine Produkte im Dev Store gefunden (leerer Produktkatalog).' }
  }
  return { ok: true, products }
}

// ─── Phase 2: Line Items ──────────────────────────────────────────────────────

const FALLBACK_TITLES = ['T-Shirt', 'Hoodie', 'Cap', 'Tasche', 'Jacke', 'Shorts', 'Longsleeve', 'Mütze']

// Echte Shopify-Produkte: reale Variantenpreise; mehrere Versuche für Zielbereich 30–250 €.
function generateRealLineItems(
  prng: () => number,
  products: ShopifyProduct[],
): { lineItems: LineItemDef[]; outOfRange: boolean } {
  let bestItems: LineItemDef[] | null = null
  let bestDistance = Infinity

  for (let attempt = 0; attempt < MAX_CART_ATTEMPTS; attempt++) {
    const numItems = 1 + Math.floor(prng() * 4)
    const items: LineItemDef[] = []
    for (let j = 0; j < numItems; j++) {
      const p = products[Math.floor(prng() * products.length)]!
      const v = p.variants[Math.floor(prng() * p.variants.length)]!
      items.push({
        title: p.variants.length > 1 ? `${p.title} – ${v.title}` : p.title,
        price: v.price,
        quantity: 1,
        variantId: v.id,
      })
    }
    const total = items.reduce((s, li) => s + li.price, 0)
    if (total >= MIN_ORDER_VALUE && total <= MAX_ORDER_VALUE) {
      return { lineItems: items, outOfRange: false }
    }
    const distance = total < MIN_ORDER_VALUE ? MIN_ORDER_VALUE - total : total - MAX_ORDER_VALUE
    if (distance < bestDistance) {
      bestDistance = distance
      bestItems = items
    }
  }

  return { lineItems: bestItems!, outOfRange: true }
}

// Fallback ohne Shopify-Produkte: generierten Zielwert auf Custom Line Items verteilen.
function generateCustomLineItems(grossRevenue: number, prng: () => number): LineItemDef[] {
  const numItems = 1 + Math.floor(prng() * 4)
  const prices = splitAmount(grossRevenue, numItems, prng)
  return prices.map(price => ({
    title: FALLBACK_TITLES[Math.floor(prng() * FALLBACK_TITLES.length)] ?? 'Artikel',
    price,
    quantity: 1,
  }))
}

// ─── Phase 2: Order-Definitionen generieren ───────────────────────────────────

function generateOrderDefs(
  codes: CodeInfo[],
  products: ShopifyProduct[],
): { orders: OrderDef[]; outOfRangeCount: number } {
  const prng = createPrng(SEED)

  const cleanCodes = codes.filter(c => !c.isMixed)
  const mixedCodes = codes.filter(c => c.isMixed)

  const slots: Array<CodeInfo | null> = [
    ...Array.from({ length: TARGET_CLEAN }, (_, i) => cleanCodes[i % cleanCodes.length]!),
    ...Array.from({ length: TARGET_MIXED }, (_, i) => mixedCodes[i % mixedCodes.length]!),
    ...Array.from({ length: UNKNOWN_ORDERS }, (): null => null),
  ]

  const shuffled = shuffle(slots, prng)

  const returnSlots: ReturnStatus[] = shuffle(
    [
      ...Array<ReturnStatus>(TARGET_NO_RETURN).fill('no_return'),
      ...Array<ReturnStatus>(TARGET_PARTIAL_RETURN).fill('partial_return'),
      ...Array<ReturnStatus>(TARGET_FULL_RETURN).fill('full_return'),
    ],
    prng,
  )

  let outOfRangeCount = 0

  const orders = shuffled.map((codeInfo, i): OrderDef => {
    // Line Items zuerst wählen; grossRevenue ergibt sich aus echten Preisen (oder generiert für Fallback).
    let lineItems: LineItemDef[]
    let grossRevenue: number
    if (products.length > 0) {
      const result = generateRealLineItems(prng, products)
      if (result.outOfRange) outOfRangeCount++
      lineItems = result.lineItems
      grossRevenue = Math.round(lineItems.reduce((s, li) => s + li.price * li.quantity, 0) * 100) / 100
    } else {
      const rawRevenue = sampleLognormal(prng, DEFAULT_CONFIG.avgOrderValue, DEFAULT_CONFIG.orderValueLogSigma)
      grossRevenue = Math.max(MIN_ORDER_VALUE, Math.min(MAX_ORDER_VALUE, Math.round(rawRevenue * 100) / 100))
      lineItems = generateCustomLineItems(grossRevenue, prng)
    }

    const returnStatus = returnSlots[i]!

    const refundAmountDesignated =
      returnStatus === 'no_return' ? 0
      : returnStatus === 'full_return' ? grossRevenue
      : Math.round(grossRevenue * (0.10 + prng() * 0.70) * 100) / 100

    const attributionStatus: AttributionStatus =
      codeInfo === null ? 'unknown'
      : codeInfo.isMixed ? 'mixed_code'
      : 'clean_influencer'

    const tags = [
      attributionTag(attributionStatus),
      codeTag(codeInfo?.code ?? null),
      influencerTag(codeInfo?.handle ?? null),
      returnTag(returnStatus),
    ]

    return {
      index: i + 1,
      discountCode: codeInfo?.code ?? null,
      discountPercentage: codeInfo?.discountPercentage ?? null,
      handle: codeInfo?.handle ?? null,
      attributionStatus,
      grossRevenue,
      lineItems,
      tags,
      returnStatus,
      refundAmountDesignated,
    }
  })

  return { orders, outOfRangeCount }
}

// ─── Ausgabe ──────────────────────────────────────────────────────────────────

function toOrderCreateInput(def: OrderDef): Record<string, unknown> {
  // Schema 2026-04 verifiziert:
  // • lineItems.priceSet statt price (MoneyBagInput → shopMoney: MoneyInput)
  // • discountCode ist ein Objekt mit itemPercentageDiscountCode/itemFixedDiscountCode,
  //   kein plain String. Alle Dev-Store-Codes sind Prozentcodes (10/12/15/20/25 %).
  // • createdAt ist in OrderCreateOrderInput nicht verfügbar; processedAt kann gesetzt
  //   werden, falls zeitliche Verteilung gewünscht – für diesen Seed nicht nötig.
  // • tags direkt als [String!] – korrekt.
  const input: Record<string, unknown> = {
    lineItems: def.lineItems.map(li => ({
      ...(li.variantId ? { variantId: li.variantId } : { title: li.title }),
      // priceSet nur für Custom Items: echte Shopify-Varianten behalten ihren gespeicherten Preis.
      ...(li.variantId ? {} : { priceSet: { shopMoney: { amount: li.price.toFixed(2), currencyCode: CURRENCY_CODE } } }),
      quantity: li.quantity,
    })),
    tags: def.tags,
  }
  if (def.discountCode !== null && def.discountPercentage !== null) {
    input['discountCode'] = {
      itemPercentageDiscountCode: { code: def.discountCode, percentage: def.discountPercentage },
    }
  }
  if (def.returnStatus !== 'no_return') {
    input['note'] =
      `[seed] returnStatus=${def.returnStatus}, refundAmount=${def.refundAmountDesignated.toFixed(2)} – separate refundCreate erforderlich`
  }
  return input
}

function printPhase1Summary(codes: CodeInfo[]): void {
  const clean = codes.filter(c => !c.isMixed)
  const mixed = codes.filter(c => c.isMixed)
  console.log(`  Clean (${clean.length}): ${clean.map(c => c.code).join(', ')}`)
  console.log(`  Mixed (${mixed.length}): ${mixed.map(c => `${c.code} (${c.mixedReason})`).join(', ')}`)
  console.log(`  Alle ${codes.length} Codes aus data/shopify-influencers.config.json geladen.`)
}

function printDryRunSummary(orders: OrderDef[], codeCount: number, lineItemSource: string, outOfRangeCount: number): void {
  const clean = orders.filter(o => o.attributionStatus === 'clean_influencer').length
  const mixed = orders.filter(o => o.attributionStatus === 'mixed_code').length
  const unknown = orders.filter(o => o.attributionStatus === 'unknown').length
  const noReturn = orders.filter(o => o.returnStatus === 'no_return').length
  const partial = orders.filter(o => o.returnStatus === 'partial_return').length
  const full = orders.filter(o => o.returnStatus === 'full_return').length
  const codesUsed = new Set(orders.filter(o => o.discountCode).map(o => o.discountCode!)).size
  const revenues = orders.map(o => o.grossRevenue)
  const minRev = Math.min(...revenues)
  const maxRev = Math.max(...revenues)
  const avgRev = revenues.reduce((s, r) => s + r, 0) / revenues.length
  const totalRev = revenues.reduce((s, r) => s + r, 0)

  console.log('\n' + '═'.repeat(64))
  console.log('DRY-RUN ZUSAMMENFASSUNG  (keine Orders erstellt)')
  console.log('═'.repeat(64))
  console.log(`Orders gesamt:        ${orders.length}`)
  console.log(`Codes verwendet:      ${codesUsed} von ${codeCount}`)
  console.log(`Line-Item-Quelle:     ${lineItemSource}`)
  console.log()
  console.log('Attribution:')
  console.log(`  clean_influencer:   ${String(clean).padStart(3)}  (${pct(clean, orders.length)})   ADR-Ziel: ~105 (70 %)`)
  console.log(`  mixed_code:         ${String(mixed).padStart(3)}  (${pct(mixed, orders.length)})   ADR-Ziel:  ~20 (13 %)`)
  console.log(`  unknown:            ${String(unknown).padStart(3)}  (${pct(unknown, orders.length)})   ADR-Ziel:  ~25 (17 %)`)
  console.log()
  console.log('Retouren:')
  console.log(`  no_return:          ${String(noReturn).padStart(3)}  (${pct(noReturn, orders.length)})   Ziel: ${TARGET_NO_RETURN}`)
  console.log(`  partial_return:     ${String(partial).padStart(3)}  (${pct(partial, orders.length)})   Ziel: ${TARGET_PARTIAL_RETURN}`)
  console.log(`  full_return:        ${String(full).padStart(3)}  (${pct(full, orders.length)})   Ziel: ${TARGET_FULL_RETURN}`)
  console.log()
  console.log('Bestellwerte:')
  console.log(`  Min: ${minRev.toFixed(2)} €   Max: ${maxRev.toFixed(2)} €   Ø: ${avgRev.toFixed(2)} €   Gesamt: ${totalRev.toFixed(2)} €`)
  console.log()
  if (outOfRangeCount > 0) {
    console.log(`⚠  ${outOfRangeCount} Warenkorb/Warenkörbe außerhalb ${MIN_ORDER_VALUE}–${MAX_ORDER_VALUE} € nach ${MAX_CART_ATTEMPTS} Versuchen – bester Versuch verwendet.`)
    console.log()
  }
  console.log('⚠  Hinweise für Phase-2-Ausführung:')
  console.log('   • createdAt: Unterstützung via orderCreate vor Implementierung prüfen.')
  console.log('   • Retouren: separate refundCreate-Mutationen nach orderCreate erforderlich.')
  console.log('   • Code-Mapping: alle Codes werden aus data/shopify-influencers.config.json gelesen.')
  console.log('   • Sync: funktioniert erst korrekt, wenn die Shopify-Influencer (inf_shopify_*)')
  console.log('     in Supabase vorhanden sind und der inf_shopify_*-Filter im Sync-Pfad angepasst wurde.')
  console.log('═'.repeat(64))
}

function printSampleOrders(orders: OrderDef[]): void {
  const picks = [
    orders.find(o => o.attributionStatus === 'clean_influencer'),
    orders.find(o => o.attributionStatus === 'mixed_code'),
    orders.find(o => o.attributionStatus === 'unknown'),
    orders.find(o => o.returnStatus === 'partial_return' || o.returnStatus === 'full_return'),
    orders.find(o => o.lineItems.length >= 3),
  ]
  const seen = new Set<number>()
  const unique = picks.filter((o): o is OrderDef => o !== undefined && !seen.has(o.index) && seen.add(o.index) !== undefined)

  console.log('\nBEISPIEL-ORDER-DEFINITIONEN')
  console.log('─'.repeat(64))
  for (const def of unique) {
    console.log(`\n#${def.index}  ${def.attributionStatus.padEnd(22)} ${def.discountCode ?? '(kein Code)'}`)
    console.log(`   Betrag:     ${def.grossRevenue.toFixed(2)} €  |  Retoure: ${def.returnStatus}`)
    console.log(`   Tags:       ${def.tags.join(', ')}`)
    console.log(`   Line Items: ${def.lineItems.map(li => `${li.title} ${li.price.toFixed(2)} €`).join(' + ')}`)
    console.log('   orderCreate-Input (Vorschau – Feldnamen vor Ausführung verifizieren):')
    const input = JSON.stringify(toOrderCreateInput(def), null, 2)
    console.log('   ' + input.replace(/\n/g, '\n   '))
  }
}

// ─── Execute-Modus: orderCreate ───────────────────────────────────────────────

const ORDER_CREATE_MUTATION = `
  mutation OrderCreate($order: OrderCreateOrderInput!) {
    orderCreate(order: $order) {
      order {
        id
        name
        tags
      }
      userErrors {
        field
        message
      }
    }
  }
`

interface OrderCreateData {
  orderCreate: {
    order: { id: string; name: string; tags: string[] } | null
    userErrors: Array<{ field: string[]; message: string }>
  }
}

async function executeOrders(
  orders: OrderDef[],
  storeDomain: string,
  accessToken: string,
  apiVersion: string,
): Promise<void> {
  console.log('\n' + '═'.repeat(64))
  console.log('EXECUTE-MODUS – echte Orders werden erstellt')
  console.log('═'.repeat(64))
  console.log(`Store:          ${storeDomain}`)
  console.log(`Orders:         ${orders.length}`)
  console.log(`Rate Limit:     max. 5/Minute (${RATE_LIMIT_DELAY_MS / 1000} s Pause zwischen Orders)`)
  console.log('⚠  Diese Aktion erstellt echte Shopify-Orders. Abbrechen: Ctrl+C.')
  console.log('─'.repeat(64))

  for (let i = 0; i < orders.length; i++) {
    const def = orders[i]!

    if (i > 0) {
      await new Promise<void>(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS))
    }

    process.stdout.write(`[${i + 1}/${orders.length}] #${def.index}  ${def.attributionStatus}  ${def.discountCode ?? '(kein Code)'}... `)

    const data = await shopifyGraphQL<OrderCreateData>(
      storeDomain, accessToken, apiVersion,
      ORDER_CREATE_MUTATION, { order: toOrderCreateInput(def) },
    )

    const { order, userErrors } = data.orderCreate

    if (userErrors.length > 0) {
      console.error('\n✗ userErrors:')
      for (const e of userErrors) {
        console.error(`   ${e.field.join('.')}: ${e.message}`)
      }
      console.error(`\nAbbruch bei Order #${def.index}. Bereits erstellte Orders bleiben erhalten.`)
      process.exit(1)
    }

    if (!order) {
      console.error('\n✗ Leere Antwort: order ist null.')
      process.exit(1)
    }

    console.log(`✓ ${order.name}  (${order.id})`)
    console.log(`   Tags: ${order.tags.join(', ')}`)
  }

  console.log('\n' + '═'.repeat(64))
  console.log(`✓ ${orders.length} Order(s) erfolgreich erstellt.`)
  console.log('  Nächster Schritt: Sync ausführen (npm run sync:shopify), dann DB-Ergebnis prüfen.')
  console.log('═'.repeat(64))
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { executeMode, limit, offset } = parseArgs()

  const storeDomain = requireEnv('SHOPIFY_STORE_DOMAIN')
  const clientId = requireEnv('SHOPIFY_CLIENT_ID')
  const clientSecret = requireEnv('SHOPIFY_CLIENT_SECRET')
  const apiVersion = process.env['SHOPIFY_API_VERSION'] ?? '2026-04'

  console.log(`Store: ${storeDomain} (API ${apiVersion})`)
  console.log('Authentifiziere...')
  const accessToken = await getShopifyAccessToken({ storeDomain, clientId, clientSecret })

  // ── Phase 1 ────────────────────────────────────────────────────────────────
  console.log('\nPhase 1: Rabattcodes laden...')
  const rawCodes = await loadDiscountCodes(storeDomain, accessToken, apiVersion)

  if (rawCodes.length !== EXPECTED_CODE_COUNT) {
    console.error(`✗ Validierung fehlgeschlagen: ${rawCodes.length} Codes, erwartet ${EXPECTED_CODE_COUNT}.`)
    process.exit(1)
  }

  const codes = buildCodeInfo(rawCodes)
  console.log(`✓ ${EXPECTED_CODE_COUNT} Codes validiert.`)
  printPhase1Summary(codes)

  // ── Phase 2: Produkte laden ────────────────────────────────────────────────
  console.log('\nPhase 2: Produkte laden...')
  const productResult = await loadProducts(storeDomain, accessToken, apiVersion)

  let products: ShopifyProduct[]
  let lineItemSource: string

  if (productResult.ok) {
    products = productResult.products
    lineItemSource = `${products.length} Shopify-Produkte (${products.map(p => p.title).join(', ')})`
    console.log(`✓ ${products.length} Produkte geladen.`)
  } else {
    console.warn(`\n⚠  WARNUNG: Produkte konnten nicht geladen werden.`)
    console.warn(`   Ursache: ${productResult.reason}`)
    console.warn(`   Dry-Run verwendet Custom Line Items als Fallback.`)
    console.warn(`   Für realistische Warenkörbe: read_products-Scope ergänzen und`)
    console.warn(`   Produkte im Dev Store anlegen, bevor Phase 2 ausgeführt wird.`)
    products = []
    lineItemSource = 'Custom Line Items (Fallback – Produkte nicht geladen)'
  }

  // ── Phase 2: Order-Definitionen generieren ─────────────────────────────────
  const modeLabel = executeMode ? '' : ' (Dry-Run)'
  console.log(`\nGeneriere ${TOTAL_ORDERS} Order-Definitionen${modeLabel}...`)
  const { orders: allOrders, outOfRangeCount } = generateOrderDefs(codes, products)

  if (!executeMode) {
    printDryRunSummary(allOrders, codes.length, lineItemSource, outOfRangeCount)
    printSampleOrders(allOrders)
    console.log('\n✓ Dry-Run abgeschlossen. Keine Orders wurden erstellt.')
    console.log('  Execute-Modus: npm run seed:shopify -- --execute [--limit <n>]')
    return
  }

  // ── Execute-Modus ──────────────────────────────────────────────────────────
  const afterOffset = offset > 0 ? allOrders.slice(offset) : allOrders
  const ordersToCreate = limit !== null ? afterOffset.slice(0, limit) : afterOffset
  if (offset > 0) {
    console.log(`Übersprungen (--offset ${offset}): ${Math.min(offset, allOrders.length)} Order-Definition(en)`)
  }
  console.log(`Auszuführen: ${ordersToCreate.length} Order-Definition(en)`)
  await executeOrders(ordersToCreate, storeDomain, accessToken, apiVersion)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

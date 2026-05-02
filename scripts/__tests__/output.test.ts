import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeOutput } from '../lib/output.js'
import { generateInfluencers } from '../lib/influencers.js'
import { generateOrders } from '../lib/orders.js'
import { createPrng } from '../lib/prng.js'
import { DEFAULT_CONFIG } from '../config.js'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('writeOutput', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true })
  })

  it('schreibt influencers.json, N orders_YYYY-MM.json und sync_run.json', () => {
    const prng = createPrng(42)
    const influencers = generateInfluencers(DEFAULT_CONFIG, prng)
    const orders = generateOrders(DEFAULT_CONFIG, influencers, prng)
    writeOutput(influencers, orders, DEFAULT_CONFIG, tmpDir)

    const files = fs.readdirSync(tmpDir)
    expect(files).toContain('influencers.json')
    expect(files).toContain('sync_run.json')
    expect(files.filter(f => f.startsWith('orders_'))).toHaveLength(DEFAULT_CONFIG.simulatedMonths)
  })

  it('keine .tmp-Dateien verbleiben nach erfolgreichem Lauf', () => {
    const prng = createPrng(42)
    const influencers = generateInfluencers(DEFAULT_CONFIG, prng)
    const orders = generateOrders(DEFAULT_CONFIG, influencers, prng)
    writeOutput(influencers, orders, DEFAULT_CONFIG, tmpDir)

    expect(fs.readdirSync(tmpDir).every(f => !f.endsWith('.tmp'))).toBe(true)
  })

  it('influencers.json enthält alle 30 Influencer', () => {
    const prng = createPrng(42)
    const influencers = generateInfluencers(DEFAULT_CONFIG, prng)
    const orders = generateOrders(DEFAULT_CONFIG, influencers, prng)
    writeOutput(influencers, orders, DEFAULT_CONFIG, tmpDir)

    const content = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'influencers.json'), 'utf-8')
    ) as unknown[]
    expect(content).toHaveLength(30)
  })

  it('sync_run.json enthält seed, generatedAt, config und counts', () => {
    const prng = createPrng(42)
    const influencers = generateInfluencers(DEFAULT_CONFIG, prng)
    const orders = generateOrders(DEFAULT_CONFIG, influencers, prng)
    writeOutput(influencers, orders, DEFAULT_CONFIG, tmpDir)

    const run = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'sync_run.json'), 'utf-8')
    ) as Record<string, unknown>
    expect(run['seed']).toBe(DEFAULT_CONFIG.seed)
    expect(typeof run['generatedAt']).toBe('string')
    expect(run['config']).toBeDefined()
    const counts = run['counts'] as Record<string, unknown>
    expect(counts['totalOrders']).toBe(DEFAULT_CONFIG.ordersPerMonth * DEFAULT_CONFIG.simulatedMonths)
    expect(counts['edgeCases']).toBe(6)
  })

  it('wirft einen Fehler wenn Ausgabeverzeichnis fehlt', () => {
    const prng = createPrng(42)
    const influencers = generateInfluencers(DEFAULT_CONFIG, prng)
    const orders = generateOrders(DEFAULT_CONFIG, influencers, prng)
    expect(() =>
      writeOutput(influencers, orders, DEFAULT_CONFIG, '/nonexistent/path/xyz')
    ).toThrow()
  })
})

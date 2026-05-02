'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { DashboardFilterParams, DataDateRange } from '../../queries/filteredDashboardData'
import type { InfluencerRecord } from '../../db/influencers'

interface Props {
  influencers: InfluencerRecord[]
  initialParams: DashboardFilterParams
  dataDateRange: DataDateRange | null
}

function toggleItem(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function fmtDe(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function SectionHeader({
  label,
  open,
  onToggle,
  active,
}: {
  label: string
  open: boolean
  onToggle: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between py-2.5 text-left"
    >
      <span className="flex items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">
          {label}
        </span>
        {active && (
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-rose-400" />
        )}
      </span>
      <span className="text-slate-400 dark:text-gray-500">
        <ChevronIcon open={open} />
      </span>
    </button>
  )
}

export function DashboardFilters({ influencers, initialParams, dataDateRange }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const [from, setFrom] = useState(initialParams.from ?? '')
  const [to, setTo] = useState(initialParams.to ?? '')
  const [attribution, setAttribution] = useState<string[]>(
    initialParams.attribution ? initialParams.attribution.split(',') : [],
  )
  const [returnStatus, setReturnStatus] = useState<string[]>(
    initialParams.returnStatus ? initialParams.returnStatus.split(',') : [],
  )
  const [selectedInfluencers, setSelectedInfluencers] = useState<string[]>(
    initialParams.influencer ? initialParams.influencer.split(',') : [],
  )

  const [boxOpen, setBoxOpen] = useState(true)
  const [secZeitraum, setSecZeitraum] = useState(true)
  const [secAttribution, setSecAttribution] = useState(true)
  const [secRetour, setSecRetour] = useState(true)
  const [secInfluencer, setSecInfluencer] = useState(false)

  useEffect(() => {
    setFrom(initialParams.from ?? '')
    setTo(initialParams.to ?? '')
    setAttribution(initialParams.attribution ? initialParams.attribution.split(',') : [])
    setReturnStatus(initialParams.returnStatus ? initialParams.returnStatus.split(',') : [])
    setSelectedInfluencers(initialParams.influencer ? initialParams.influencer.split(',') : [])
  }, [
    initialParams.from,
    initialParams.to,
    initialParams.attribution,
    initialParams.returnStatus,
    initialParams.influencer,
  ])

  const isActive = !!(
    from ||
    to ||
    attribution.length ||
    returnStatus.length ||
    selectedInfluencers.length
  )

  const activeCount = [
    !!(from || to),
    attribution.length > 0,
    returnStatus.length > 0,
    selectedInfluencers.length > 0,
  ].filter(Boolean).length

  const showHint =
    dataDateRange !== null &&
    ((!!from && from < dataDateRange.min) || (!!to && to > dataDateRange.max))

  function apply() {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (attribution.length) params.set('attribution', attribution.join(','))
    if (returnStatus.length) params.set('returnStatus', returnStatus.join(','))
    if (selectedInfluencers.length) params.set('influencer', selectedInfluencers.join(','))
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function reset() {
    setFrom('')
    setTo('')
    setAttribution([])
    setReturnStatus([])
    setSelectedInfluencers([])
    router.push(pathname)
  }

  return (
    <div className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-lg border border-green-200/70 bg-stone-100 shadow-sm dark:border-rose-900/40 dark:bg-gray-800">
      {/* Akzentstreifen */}
      <div className="h-1 shrink-0 bg-green-500 dark:bg-rose-800" />

      {/* Header – immer sichtbar, klappbar */}
      <button
        type="button"
        onClick={() => setBoxOpen((v) => !v)}
        className="flex shrink-0 items-center justify-between px-4 py-3 text-left hover:bg-stone-200/50 dark:hover:bg-gray-700/40"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg font-semibold text-slate-700 dark:text-gray-300">Filter</span>
          {isActive && (
            <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white dark:bg-rose-700">
              {activeCount}
            </span>
          )}
        </span>
        <span className="text-slate-400 dark:text-gray-500">
          <ChevronIcon open={boxOpen} />
        </span>
      </button>

      {/* Body – einklappbar */}
      {boxOpen && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* scrollbarer Filterinhalt */}
          <div className="flex-1 overflow-y-auto px-4">
            {/* Hinweis: Datumsbereich außerhalb der Datenbasis */}
            {showHint && dataDateRange && (
              <p className="mb-3 mt-1 rounded bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                Hinweis: Die verfügbaren Dashboard-Daten reichen vom{' '}
                <span className="font-medium">{fmtDe(dataDateRange.min)}</span> bis{' '}
                <span className="font-medium">{fmtDe(dataDateRange.max)}</span>.
              </p>
            )}
            <div className="divide-y divide-stone-200 dark:divide-gray-700/60">

              {/* Zeitraum */}
              <div>
                <SectionHeader
                  label="Zeitraum"
                  open={secZeitraum}
                  onToggle={() => setSecZeitraum((v) => !v)}
                  active={!!(from || to)}
                />
                {secZeitraum && (
                  <div className="flex flex-col gap-2 pb-3">
                    <label className="flex items-center gap-2">
                      <span className="w-7 shrink-0 text-sm text-slate-500 dark:text-gray-400">Von</span>
                      <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="min-w-0 flex-1 rounded border border-stone-200 px-2 py-1 text-sm text-slate-900 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-rose-700 dark:focus:ring-rose-700"
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <span className="w-7 shrink-0 text-sm text-slate-500 dark:text-gray-400">Bis</span>
                      <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="min-w-0 flex-1 rounded border border-stone-200 px-2 py-1 text-sm text-slate-900 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-rose-700 dark:focus:ring-rose-700"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Attribution */}
              <div>
                <SectionHeader
                  label="Attribution"
                  open={secAttribution}
                  onToggle={() => setSecAttribution((v) => !v)}
                  active={attribution.length > 0}
                />
                {secAttribution && (
                  <div className="flex flex-col gap-1.5 pb-3">
                    {(
                      [
                        { value: 'eindeutig', label: 'Eindeutig' },
                        { value: 'leicht_gemischt', label: 'Leicht gemischt' },
                        { value: 'gemischt', label: 'Gemischt' },
                        { value: 'stark_gemischt', label: 'Stark gemischt' },
                      ] as const
                    ).map(({ value, label }) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={attribution.includes(value)}
                          onChange={() => setAttribution(toggleItem(attribution, value))}
                          className="accent-green-600 dark:accent-rose-700"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Retourenprofil */}
              <div>
                <SectionHeader
                  label="Retourenprofil"
                  open={secRetour}
                  onToggle={() => setSecRetour((v) => !v)}
                  active={returnStatus.length > 0}
                />
                {secRetour && (
                  <div className="flex flex-col gap-1.5 pb-3">
                    {(
                      [
                        { value: 'niedrig', label: 'Niedrige Retourenquote' },
                        { value: 'mittel', label: 'Mittlere Retourenquote' },
                        { value: 'hoch', label: 'Hohe Retourenquote' },
                        { value: 'sehr_hoch', label: 'Sehr hohe Retourenquote' },
                      ] as const
                    ).map(({ value, label }) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={returnStatus.includes(value)}
                          onChange={() => setReturnStatus(toggleItem(returnStatus, value))}
                          className="accent-green-600 dark:accent-rose-700"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Influencer */}
              <div>
                <SectionHeader
                  label="Influencer"
                  open={secInfluencer}
                  onToggle={() => setSecInfluencer((v) => !v)}
                  active={selectedInfluencers.length > 0}
                />
                {secInfluencer && (
                  <div className="pb-3">
                    <select
                      multiple
                      size={4}
                      value={selectedInfluencers}
                      onChange={(e) =>
                        setSelectedInfluencers(
                          Array.from(e.target.selectedOptions).map((o) => o.value),
                        )
                      }
                      className="w-full rounded border border-stone-200 px-2 py-1 text-sm text-slate-900 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-rose-700 dark:focus:ring-rose-700"
                    >
                      {influencers.map((inf) => (
                        <option key={inf.id} value={inf.id}>
                          {inf.handle}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">
                      {selectedInfluencers.length > 0
                        ? `${selectedInfluencers.length} ausgewählt · `
                        : ''}
                      Strg / Umschalt für Mehrfachauswahl
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Button-Zeile – haftet am unteren Rand der Box */}
          <div className="shrink-0 border-t border-stone-200 bg-stone-100 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex gap-2">
              <button
                onClick={apply}
                className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 dark:bg-rose-800 dark:hover:bg-rose-700"
              >
                Anwenden
              </button>
              {isActive && (
                <button
                  onClick={reset}
                  className="rounded border border-stone-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-stone-200 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Zurücksetzen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

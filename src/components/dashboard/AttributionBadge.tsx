// mixedRatio = mixed_code / (clean_influencer + mixed_code)
// Basis: nur Orders mit attributedInfluencerId != null — unknown-Orders gehen nicht ein
const MIN_ATTRIBUTED_ORDERS = 10

export function AttributionBadge({
  mixedRatio,
  attributedCount,
}: {
  mixedRatio: number
  attributedCount: number
}) {
  let label: string
  let className: string

  if (attributedCount < MIN_ATTRIBUTED_ORDERS) {
    label = 'Wenig Daten'
    className = 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
  } else if (mixedRatio < 0.05) {
    label = 'Eindeutig'
    className = 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
  } else if (mixedRatio < 0.25) {
    label = 'Leicht gemischt'
    className = 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
  } else if (mixedRatio < 0.60) {
    label = 'Gemischt'
    className = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
  } else {
    label = 'Stark gemischt'
    className = 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
  }

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

export const maxDuration = 60

import { loadFilteredDashboardData } from '../queries/filteredDashboardData'
import type { DashboardFilterParams } from '../queries/filteredDashboardData'
import { SummaryMetrics } from '../components/dashboard/SummaryMetrics'
import { InfluencerTable } from '../components/dashboard/InfluencerTable'
import { DashboardFilters } from '../components/dashboard/DashboardFilters'
import { RevenueOverTime } from '../components/dashboard/charts/RevenueOverTime'
import { AttributionMixChart } from '../components/dashboard/charts/AttributionMixChart'
import { TopInfluencerChart } from '../components/dashboard/charts/TopInfluencerChart'
import { ReturnRateChart } from '../components/dashboard/charts/ReturnRateChart'
import { InfluencerEvaluationScatter } from '../components/dashboard/charts/InfluencerEvaluationScatter'

function getString(val: string | string[] | undefined): string | undefined {
  return typeof val === 'string' ? val : undefined
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const filterParams: DashboardFilterParams = {
    from: getString(searchParams.from),
    to: getString(searchParams.to),
    attribution: getString(searchParams.attribution),
    returnStatus: getString(searchParams.returnStatus),
    influencer: getString(searchParams.influencer),
    sort: getString(searchParams.sort),
    dir: getString(searchParams.dir),
    page: getString(searchParams.page),
  }

  const data = await loadFilteredDashboardData(filterParams)
  const { attribution } = data.summary
  const attributionParams = filterParams.attribution ? filterParams.attribution.split(',') : []
  const unknownOrderCount = attributionParams.length > 0
    ? 0
    : data.totalOrderCount - data.summary.orderCount

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {/* Hauptbereich */}
      <div className="min-w-0 flex-1 space-y-8">
        <SummaryMetrics summary={data.summary} totalOrderCount={data.totalOrderCount} unknownOrderCount={unknownOrderCount} />
        <RevenueOverTime data={data.revenueTimeSeries} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopInfluencerChart data={data.topInfluencersChart} />
          <ReturnRateChart data={data.returnRateChart} />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AttributionMixChart
            clean={attribution.clean_influencer}
            mixed={attribution.mixed_code}
            unknown={unknownOrderCount}
          />
          <InfluencerEvaluationScatter data={data.scatterData} />
        </div>
        <InfluencerTable influencers={data.influencers} metricsMap={data.influencerMetrics} filterParams={filterParams} paginationMeta={data.paginationMeta} />
      </div>

      {/* Filter-Sidebar */}
      <aside className="w-full lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-6">
        <DashboardFilters influencers={data.allInfluencers} initialParams={filterParams} dataDateRange={data.dataDateRange} />
      </aside>
    </div>
  )
}

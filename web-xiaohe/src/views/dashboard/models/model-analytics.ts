import type { QuotaDataItem } from '@/api/dashboard'
import type { BarDataItem, LineDataItem, PieDataItem } from '@/types/component/chart'
import { formatChartTime } from '@/utils/chart-time'

export type TimeGranularity = 'hour' | 'day' | 'week'

export interface AnalyticsFilters {
  startTimestamp: number
  endTimestamp: number
  granularity: TimeGranularity
}

export interface AnalyticsSummary {
  totalCount: number
  totalQuota: number
  totalTokens: number
  averageRpm: number
  averageTpm: number
}

export interface AnalyticsChartData {
  timeLabels: string[]
  quotaSeries: BarDataItem[]
  callTrendSeries: LineDataItem[]
  callDistribution: PieDataItem[]
  callRankingLabels: string[]
  callRankingSeries: BarDataItem[]
}

const UNKNOWN_MODEL = 'Unknown'

/**
 * 创建最近指定天数的分析筛选条件
 * @param days 最近天数
 * @returns 包含起止时间与推荐粒度的筛选条件
 */
export function createRecentFilters(days = 1): AnalyticsFilters {
  const endTimestamp = Math.floor(Date.now() / 1000)
  return {
    startTimestamp: endTimestamp - days * 24 * 60 * 60,
    endTimestamp,
    granularity: days <= 1 ? 'hour' : days >= 29 ? 'week' : 'day'
  }
}

/**
 * 汇总模型调用统计指标
 * @param data API 返回的用量数据
 * @param filters 当前生效的时间筛选
 * @returns 总调用、额度、Token 与分钟均值
 */
export function summarizeAnalytics(
  data: QuotaDataItem[],
  filters: AnalyticsFilters
): AnalyticsSummary {
  const totals = data.reduce(
    (result, item) => {
      result.totalCount += Number(item.count || 0)
      result.totalQuota += Number(item.quota || 0)
      result.totalTokens += Number(item.token_used || 0)
      return result
    },
    { totalCount: 0, totalQuota: 0, totalTokens: 0 }
  )
  const minutes = Math.max((filters.endTimestamp - filters.startTimestamp) / 60, 1)

  return {
    ...totals,
    averageRpm: totals.totalCount / minutes,
    averageTpm: totals.totalTokens / minutes
  }
}

/**
 * 将用量数据转换为现有图表组件需要的数据结构
 * @param data API 返回的用量数据
 * @param quotaPerUnit 每美元对应的 quota 数量
 * @returns 额度分布与模型调用图表数据
 */
export function buildAnalyticsChartData(
  data: QuotaDataItem[],
  quotaPerUnit: number
): AnalyticsChartData {
  const sortedRows = [...data].sort((a, b) => a.created_at - b.created_at)
  const timestamps = [...new Set(sortedRows.map((item) => item.created_at))]
  const models = [...new Set(sortedRows.map((item) => item.model_name || UNKNOWN_MODEL))]
  const quotaByModelAndTime = new Map<string, Map<number, number>>()
  const callsByModel = new Map<string, number>()
  const callsByModelAndTime = new Map<string, Map<number, number>>()

  for (const row of sortedRows) {
    const model = row.model_name || UNKNOWN_MODEL
    const modelQuotaTimeline = quotaByModelAndTime.get(model) || new Map<number, number>()
    modelQuotaTimeline.set(
      row.created_at,
      (modelQuotaTimeline.get(row.created_at) || 0) + Number(row.quota || 0) / quotaPerUnit
    )
    quotaByModelAndTime.set(model, modelQuotaTimeline)
    callsByModel.set(model, (callsByModel.get(model) || 0) + Number(row.count || 0))
    const modelTimeline = callsByModelAndTime.get(model) || new Map<number, number>()
    modelTimeline.set(
      row.created_at,
      (modelTimeline.get(row.created_at) || 0) + Number(row.count || 0)
    )
    callsByModelAndTime.set(model, modelTimeline)
  }

  const ranking = [...callsByModel.entries()].sort((a, b) => b[1] - a[1])
  const rankingAscending = [...ranking].reverse()
  return {
    timeLabels: timestamps.map(formatChartTime),
    quotaSeries: models.map((model) => ({
      name: model,
      data: timestamps.map((timestamp) => quotaByModelAndTime.get(model)?.get(timestamp) || 0)
    })),
    callTrendSeries: models.map((model) => ({
      name: model,
      data: timestamps.map((timestamp) => callsByModelAndTime.get(model)?.get(timestamp) || 0)
    })),
    callDistribution: ranking.map(([name, value]) => ({ name, value })),
    callRankingLabels: rankingAscending.map(([name]) => name),
    callRankingSeries: rankingAscending.map(([name, value], index) => ({
      name,
      data: rankingAscending.map((_, categoryIndex) => (categoryIndex === index ? value : 0))
    }))
  }
}

/**
 * 将数值格式化为紧凑且可读的本地化文本
 * @param value 待格式化数值
 * @param locale 当前语言标识
 * @param maximumFractionDigits 最大小数位
 * @returns 本地化数值文本
 */
export function formatMetric(value: number, locale: string, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(locale, {
    notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits
  }).format(value)
}

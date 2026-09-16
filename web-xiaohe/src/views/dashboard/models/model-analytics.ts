import type { QuotaDataItem } from '@/api/dashboard'
import type { LineDataItem, PieDataItem } from '@/types/component/chart'

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
  quotaByTime: number[]
  quotaAreaSeries: LineDataItem[]
  callTrendSeries: LineDataItem[]
  callDistribution: PieDataItem[]
  callRankingLabels: string[]
  callRankingValues: number[]
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
 * 按当前语言格式化时间分组标签
 * @param timestamp 秒级时间戳
 * @param granularity 时间聚合粒度
 * @param locale 当前语言标识
 * @returns 用于图表横轴的时间文本
 */
function formatTimeLabel(timestamp: number, granularity: TimeGranularity, locale: string): string {
  const options: Intl.DateTimeFormatOptions =
    granularity === 'hour'
      ? { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
      : granularity === 'day'
        ? { month: '2-digit', day: '2-digit' }
        : { year: 'numeric', month: '2-digit', day: '2-digit' }
  return new Intl.DateTimeFormat(locale, options).format(timestamp * 1000)
}

/**
 * 将用量数据转换为现有图表组件需要的数据结构
 * @param data API 返回的用量数据
 * @param granularity 时间聚合粒度
 * @param locale 当前语言标识
 * @param quotaPerUnit 每美元对应的 quota 数量
 * @returns 额度分布与模型调用图表数据
 */
export function buildAnalyticsChartData(
  data: QuotaDataItem[],
  granularity: TimeGranularity,
  locale: string,
  quotaPerUnit: number
): AnalyticsChartData {
  const sortedRows = [...data].sort((a, b) => a.created_at - b.created_at)
  const timestamps = [...new Set(sortedRows.map((item) => item.created_at))]
  const models = [...new Set(sortedRows.map((item) => item.model_name || UNKNOWN_MODEL))]
  const quotaByTimestamp = new Map<number, number>()
  const callsByModel = new Map<string, number>()
  const callsByModelAndTime = new Map<string, Map<number, number>>()

  for (const row of sortedRows) {
    const model = row.model_name || UNKNOWN_MODEL
    quotaByTimestamp.set(
      row.created_at,
      (quotaByTimestamp.get(row.created_at) || 0) + Number(row.quota || 0) / quotaPerUnit
    )
    callsByModel.set(model, (callsByModel.get(model) || 0) + Number(row.count || 0))
    const modelTimeline = callsByModelAndTime.get(model) || new Map<number, number>()
    modelTimeline.set(
      row.created_at,
      (modelTimeline.get(row.created_at) || 0) + Number(row.count || 0)
    )
    callsByModelAndTime.set(model, modelTimeline)
  }

  const ranking = [...callsByModel.entries()].sort((a, b) => b[1] - a[1])
  const quotaByTime = timestamps.map((timestamp) => quotaByTimestamp.get(timestamp) || 0)

  return {
    timeLabels: timestamps.map((timestamp) => formatTimeLabel(timestamp, granularity, locale)),
    quotaByTime,
    quotaAreaSeries: [
      {
        name: 'Quota',
        data: quotaByTime,
        showAreaColor: true
      }
    ],
    callTrendSeries: models.map((model) => ({
      name: model,
      data: timestamps.map((timestamp) => callsByModelAndTime.get(model)?.get(timestamp) || 0)
    })),
    callDistribution: ranking.map(([name, value]) => ({ name, value })),
    callRankingLabels: ranking.map(([name]) => name).reverse(),
    callRankingValues: ranking.map(([, value]) => value).reverse()
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

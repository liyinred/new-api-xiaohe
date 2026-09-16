import type { PricingModel } from '@/api/model-square'
import type { SystemStatus } from '@/api/auth'

export type TokenUnit = 'M' | 'K'
export type SortOption = 'name' | 'price-low' | 'price-high'
export type QuotaTypeFilter = 'all' | 'token' | 'request' | 'task'
export type PriceType = 'input' | 'output' | 'cache' | 'create-cache' | 'image'

export interface ModelFilters {
  search: string
  vendor: string
  group: string
  quotaType: QuotaTypeFilter
  endpoint: string
  tag: string
  sort: SortOption
}

export interface PriceOptions {
  tokenUnit: TokenUnit
  group: string
  showRechargePrice: boolean
  status?: SystemStatus
}

/**
 * 将模型标签字符串转换为去重后的标签列表
 * @param tags 后端返回的逗号分隔标签
 * @returns 去重且去除空白的标签列表
 */
export function parseModelTags(tags?: string): string[] {
  if (!tags) return []
  return [
    ...new Set(
      tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ]
}

/**
 * 获取模型用于概览价格的分组倍率
 * @param model 模型定价信息
 * @param selectedGroup 当前选中的分组，all 表示使用最低倍率
 * @returns 可用的分组倍率
 */
export function getDisplayGroupRatio(model: PricingModel, selectedGroup: string): number {
  const groupRatios = model.group_ratio || {}
  if (selectedGroup !== 'all' && model.enable_groups.includes(selectedGroup)) {
    const selectedRatio = groupRatios[selectedGroup]
    return Number.isFinite(selectedRatio) ? selectedRatio : 1
  }

  const ratios = model.enable_groups
    .map((group) => groupRatios[group])
    .filter((ratio): ratio is number => Number.isFinite(ratio))
  return ratios.length > 0 ? Math.min(...ratios) : 1
}

/**
 * 计算模型的美元基础价格
 * @param model 模型定价信息
 * @param type 价格类型
 * @param group 当前筛选分组
 * @returns 美元价格，缺少倍率时返回 NaN
 */
export function calculateModelPrice(model: PricingModel, type: PriceType, group: string): number {
  const groupRatio = getDisplayGroupRatio(model, group)
  if (model.quota_type === 1) return (model.model_price || 0) * groupRatio

  const inputPrice = model.model_ratio * 2 * groupRatio
  const ratios: Record<PriceType, number | null | undefined> = {
    input: 1,
    output: model.completion_ratio,
    cache: model.cache_ratio,
    'create-cache': model.create_cache_ratio,
    image: model.image_ratio
  }
  const ratio = ratios[type]
  return ratio == null || !Number.isFinite(ratio) ? Number.NaN : inputPrice * ratio
}

/**
 * 按系统币种设置格式化模型价格
 * @param amountUsd 美元价格
 * @param status 系统公开配置
 * @param showRechargePrice 是否应用充值价格倍率
 * @returns 带币种符号的价格文本
 */
export function formatBillingPrice(
  amountUsd: number,
  status: SystemStatus | undefined,
  showRechargePrice: boolean
): string {
  if (!Number.isFinite(amountUsd)) return '-'

  const usdExchangeRate = Math.max(status?.usd_exchange_rate || 1, 0.001)
  const priceRate = Math.max(status?.price || 1, 0.001)
  const rechargeAdjusted = showRechargePrice ? (amountUsd * priceRate) / usdExchangeRate : amountUsd

  let symbol = '$'
  let displayAmount = rechargeAdjusted
  if (status?.quota_display_type === 'CNY') {
    symbol = '¥'
    displayAmount *= usdExchangeRate
  } else if (status?.quota_display_type === 'CUSTOM') {
    symbol = status.custom_currency_symbol?.trim() || '$'
    displayAmount *= Math.max(status.custom_currency_exchange_rate || 1, 0.001)
  }

  const maximumFractionDigits = Math.abs(displayAmount) >= 1 ? 4 : 6
  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits
  }).format(displayAmount)
  return `${symbol}${formatted}`
}

/**
 * 生成模型指定价格类型的展示文本
 * @param model 模型定价信息
 * @param type 价格类型
 * @param options 价格单位、分组及币种选项
 * @returns 格式化后的价格文本
 */
export function formatModelPrice(
  model: PricingModel,
  type: PriceType,
  options: PriceOptions
): string {
  let price = calculateModelPrice(model, type, options.group)
  if (model.quota_type === 0 && options.tokenUnit === 'K') price /= 1000
  return formatBillingPrice(price, options.status, options.showRechargePrice)
}

/**
 * 根据模型计费字段判断筛选分类
 * @param model 模型定价信息
 * @returns token、request 或 task 分类
 */
export function getQuotaType(model: PricingModel): Exclude<QuotaTypeFilter, 'all'> {
  if (model.billing_mode === 'tiered_expr') return 'task'
  return model.quota_type === 1 ? 'request' : 'token'
}

/**
 * 对模型列表应用搜索、分类筛选与价格排序
 * @param models 已关联供应商信息的模型列表
 * @param filters 当前筛选条件
 * @returns 筛选并排序后的新数组
 */
export function filterAndSortModels(models: PricingModel[], filters: ModelFilters): PricingModel[] {
  const keyword = filters.search.trim().toLocaleLowerCase()
  const filtered = models.filter((model) => {
    const searchable = [
      model.model_name,
      model.description,
      model.vendor_name,
      model.tags,
      ...(model.supported_endpoint_types || [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()

    if (keyword && !searchable.includes(keyword)) return false
    if (filters.vendor !== 'all' && String(model.vendor_id) !== filters.vendor) return false
    if (filters.group !== 'all' && !model.enable_groups.includes(filters.group)) return false
    if (filters.quotaType !== 'all' && getQuotaType(model) !== filters.quotaType) return false
    if (filters.endpoint !== 'all' && !model.supported_endpoint_types?.includes(filters.endpoint))
      return false
    if (filters.tag !== 'all' && !parseModelTags(model.tags).includes(filters.tag)) return false
    return true
  })

  return filtered.sort((left, right) => {
    if (filters.sort === 'name') return left.model_name.localeCompare(right.model_name)
    const direction = filters.sort === 'price-low' ? 1 : -1
    const leftPrice = calculateModelPrice(left, 'input', filters.group)
    const rightPrice = calculateModelPrice(right, 'input', filters.group)
    return (leftPrice - rightPrice) * direction
  })
}

/**
 * 收集模型列表中的全部唯一标签
 * @param models 模型列表
 * @returns 按名称排序的标签列表
 */
export function collectModelTags(models: PricingModel[]): string[] {
  return [...new Set(models.flatMap((model) => parseModelTags(model.tags)))].sort()
}

/**
 * 收集模型列表支持的全部端点类型
 * @param models 模型列表
 * @returns 按名称排序的端点类型列表
 */
export function collectEndpointTypes(models: PricingModel[]): string[] {
  return [...new Set(models.flatMap((model) => model.supported_endpoint_types || []))].sort()
}

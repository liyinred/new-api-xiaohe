import type { PricingModel } from '@/api/model-square'
import type { SystemStatus } from '@/api/auth'
import { formatBillingAmount } from '@/utils/quota'

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
  tierIndex?: number
  now?: Date
}

export interface DisplayPricingTier {
  label: string
  condition?: string
  input?: number
  output?: number
  cache?: number
  'create-cache'?: number
  image?: number
  imageCache?: number
  imageOutput?: number
  audioInput?: number
  audioOutput?: number
  cacheCreate1h?: number
  fixed?: number
}

/**
 * 判断模型是否使用表达式定价，避免回退到无关的默认倍率
 * @param model 模型定价信息
 * @returns 是否存在表达式计费
 */
export function hasExpressionPricing(
  model: Pick<PricingModel, 'billing_mode' | 'billing_expr' | 'billing_plugin_variants'>
): boolean {
  return (
    model.billing_mode === 'tiered_expr' ||
    Boolean(
      model.billing_plugin_variants?.some((variant) => variant.billing_mode === 'tiered_expr')
    )
  )
}

/**
 * 解析可安全展示的线性分档价格，不解释任意计费表达式
 * @param model 模型定价信息
 * @param matchedLabel 日志已记录的命中档位；提供时仅返回该档位的线性价格
 * @returns 顺序分档价格或唯一命中档位价格；无法安全提取时返回空数组
 */
export function getDisplayPricingTiers(
  model: Pick<PricingModel, 'billing_mode' | 'billing_expr' | 'billing_plugin_variants'>,
  matchedLabel?: string
): DisplayPricingTier[] {
  if (!hasExpressionPricing(model) || model.billing_plugin_variants?.length) return []
  const expression = (model.billing_expr || '').trim().replace(/^v1:/, '').trim()
  const tiers: DisplayPricingTier[] = []
  const tierPattern =
    /tier\(\s*(['"])([^'"]+)\1\s*,\s*(fixed\(\s*(?:\d+(?:\.\d+)?|\.\d+)\s*\)|[^()]*)\)/g
  const structure = expression.replace(tierPattern, (_, __, label: string, body: string) => {
    const tier: DisplayPricingTier = { label }
    const fixed = body.match(/^fixed\(\s*((?:\d+(?:\.\d+)?|\.\d+))\s*\)$/)
    if (fixed) {
      tier.fixed = Number(fixed[1])
    } else {
      const fields: Record<string, keyof DisplayPricingTier> = {
        p: 'input',
        c: 'output',
        cr: 'cache',
        cc: 'create-cache',
        img: 'image',
        img_cr: 'imageCache',
        img_o: 'imageOutput',
        ai: 'audioInput',
        ao: 'audioOutput',
        cc1h: 'cacheCreate1h'
      }
      for (const term of body.split('+')) {
        const match = term.trim().match(/^([a-z_]+)\s*\*\s*((?:\d+(?:\.\d+)?|\.\d+))$/)
        if (!match || !fields[match[1]]) return 'INVALID'
        const field = fields[match[1]] as Exclude<keyof DisplayPricingTier, 'label' | 'condition'>
        if (tier[field] !== undefined) return 'INVALID'
        tier[field] = Number(match[2])
      }
    }
    tiers.push(tier)
    return 'T'
  })
  if (matchedLabel && !structure.includes('INVALID')) {
    const matches = tiers.filter(
      (tier) => tier.label.trim().toLowerCase() === matchedLabel.trim().toLowerCase()
    )
    return matches.length === 1 ? matches : []
  }
  if (tiers.length && /^(?:len\s*(?:<=?|>=?)\s*\d+\s*\?\s*T\s*:\s*)*T$/.test(structure)) {
    const branch = structure.match(/^([^?]+)\?\s*T\s*:\s*T$/)
    if (branch) tiers[0].condition = branch[1].trim()
    return tiers
  }
  const branch = structure.match(/^([^?]+)\?\s*T\s*:\s*T$/)
  if (!branch || tiers.length !== 2) return []
  tiers[0].condition = branch[1].trim()
  return tiers
}

/**
 * 计算计费时间条件在指定时刻是否成立
 * @param condition 仅包含时间函数、比较及布尔运算的条件表达式
 * @param now 用于计算当前档位的时刻
 * @returns 条件结果；表达式不受支持或时区无效时返回 null
 */
export function evaluateTimePricingCondition(condition: string, now: Date): boolean | null {
  const formatterCache = new Map<string, Record<string, number>>()

  /**
   * 获取指定时区的时间字段值
   * @param field 时间字段名称
   * @param timezone IANA 时区名称
   * @returns 时间字段值；时区无效时返回 null
   */
  const readTimeValue = (field: string, timezone: string): number | null => {
    let values = formatterCache.get(timezone)
    if (!values) {
      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          weekday: 'short',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hourCycle: 'h23'
        }).formatToParts(now)
        const partValue = (type: Intl.DateTimeFormatPartTypes): number =>
          Number(parts.find((part) => part.type === type)?.value)
        const weekday = parts.find((part) => part.type === 'weekday')?.value || ''
        values = {
          weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday),
          month: partValue('month'),
          day: partValue('day'),
          hour: partValue('hour'),
          minute: partValue('minute')
        }
        formatterCache.set(timezone, values)
      } catch {
        return null
      }
    }
    const value = values[field]
    return Number.isFinite(value) && value >= 0 ? value : null
  }

  let invalid = false
  const comparison =
    /(weekday|month|day|hour|minute)\(\s*(['"])([^'"]+)\2\s*\)\s*(>=|<=|>|<)\s*(\d+)/g
  let resolved = condition.replace(
    comparison,
    (_, field: string, __, timezone: string, operator: string, expectedText: string) => {
      const value = readTimeValue(field, timezone)
      if (value === null) {
        invalid = true
        return 'false'
      }
      const expected = Number(expectedText)
      const matches =
        operator === '>='
          ? value >= expected
          : operator === '<='
            ? value <= expected
            : operator === '>'
              ? value > expected
              : value < expected
      return String(matches)
    }
  )
  if (invalid || resolved.replace(/true|false|&&|\|\||[()\s]/g, '')) return null

  /**
   * 计算不包含括号的布尔表达式
   * @param expression 仅包含 true、false、&& 和 || 的表达式
   * @returns 布尔结果；格式无效时返回 null
   */
  const evaluateFlatExpression = (expression: string): boolean | null => {
    const groups = expression.split('||')
    if (groups.some((group) => group.trim() === '')) return null
    let hasValidGroup = false
    for (const group of groups) {
      const values = group.split('&&').map((value) => value.trim())
      if (values.some((value) => value !== 'true' && value !== 'false')) return null
      hasValidGroup ||= values.every((value) => value === 'true')
    }
    return hasValidGroup
  }

  while (resolved.includes('(')) {
    const next = resolved.replace(/\(([^()]*)\)/g, (_, inner: string) => {
      const result = evaluateFlatExpression(inner)
      if (result === null) invalid = true
      return String(result ?? false)
    })
    if (invalid || next === resolved) return null
    resolved = next
  }
  return evaluateFlatExpression(resolved)
}

/**
 * 获取模型在指定时刻生效的价格档位序号
 * @param model 模型定价信息
 * @param now 用于计算当前档位的时刻
 * @returns 当前档位序号；模型不包含可识别的时间分档时返回 undefined
 */
export function getCurrentPricingTierIndex(model: PricingModel, now?: Date): number | undefined {
  if (!now) return undefined
  const tiers = getDisplayPricingTiers(model)
  if (tiers.length !== 2 || !tiers[0].condition) return undefined
  const matched = evaluateTimePricingCondition(tiers[0].condition, now)
  return matched === null ? undefined : matched ? 0 : 1
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
 * @param tierIndex 表达式价格分档序号，未指定时取各档较低价格
 * @returns 美元价格，缺少倍率时返回 NaN
 */
export function calculateModelPrice(
  model: PricingModel,
  type: PriceType,
  group: string,
  tierIndex?: number
): number {
  const groupRatio = getDisplayGroupRatio(model, group)
  if (hasExpressionPricing(model)) {
    const tiers = getDisplayPricingTiers(model)
    const amounts = (tierIndex === undefined ? tiers : tiers.slice(tierIndex, tierIndex + 1))
      .map((tier) =>
        tier.fixed !== undefined ? (type === 'input' ? tier.fixed : undefined) : tier[type]
      )
      .filter((amount): amount is number => amount !== undefined)
    return amounts.length ? Math.min(...amounts) * groupRatio : Number.NaN
  }
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

  const usdExchangeRate = Math.max(status?.usd_exchange_rate ?? status?.price ?? 1, 0.001)
  const priceRate = Math.max(status?.price || 1, 0.001)
  const rechargeAdjusted = showRechargePrice ? (amountUsd * priceRate) / usdExchangeRate : amountUsd

  return formatBillingAmount(rechargeAdjusted, status)
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
  const tierIndex = options.tierIndex ?? getCurrentPricingTierIndex(model, options.now)
  let price = calculateModelPrice(model, type, options.group, tierIndex)
  const tiers = hasExpressionPricing(model) ? getDisplayPricingTiers(model) : []
  const tier = tiers[tierIndex ?? 0]
  if (model.quota_type === 0 && tier?.fixed === undefined && options.tokenUnit === 'K')
    price /= 1000
  return formatBillingPrice(price, options.status, options.showRechargePrice)
}

/**
 * 根据模型计费字段判断筛选分类
 * @param model 模型定价信息
 * @returns token、request 或 task 分类
 */
export function getQuotaType(model: PricingModel): Exclude<QuotaTypeFilter, 'all'> {
  if (Object.keys(model.billing_usage_schema || {}).length > 0) return 'task'
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
    if (!Number.isFinite(leftPrice)) return Number.isFinite(rightPrice) ? 1 : 0
    if (!Number.isFinite(rightPrice)) return -1
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

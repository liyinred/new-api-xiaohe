import type { SystemStatus } from '@/api/auth'

export const DEFAULT_QUOTA_PER_UNIT = 500000

/**
 * 将内部 quota 转换为管理员设置的展示数值
 * @param quota 内部 quota 数量
 * @param status 系统公开配置
 * @returns 对应币种或原始 Tokens 数值
 */
export function quotaToDisplayAmount(quota: number, status?: SystemStatus): number {
  if (status?.quota_display_type === 'TOKENS') return Number(quota || 0)
  const usdAmount = quotaToUsd(quota, status?.quota_per_unit)
  if (status?.quota_display_type === 'CNY') {
    return usdAmount * resolveExchangeRate(status.usd_exchange_rate)
  }
  if (status?.quota_display_type === 'CUSTOM') {
    return usdAmount * resolveExchangeRate(status.custom_currency_exchange_rate)
  }
  return usdAmount
}

/**
 * 获取图表额度数值使用的符号前缀
 * @param status 系统公开配置
 * @returns 币种符号，Tokens 模式返回空文本
 */
export function getQuotaDisplayPrefix(status?: SystemStatus): string {
  if (status?.quota_display_type === 'TOKENS') return ''
  if (status?.quota_display_type === 'CNY') return '¥'
  if (status?.quota_display_type === 'CUSTOM') {
    return `${status.custom_currency_symbol?.trim() || '¤'} `
  }
  return '$'
}

/**
 * 规范化管理员设置的汇率
 * @param rate 接口返回的汇率
 * @returns 正数汇率，无效时返回 1
 */
function resolveExchangeRate(rate?: number): number {
  const value = Number(rate)
  return Number.isFinite(value) && value > 0 ? value : 1
}

/**
 * 按官方前端展示规则格式化额度数值
 * @param amount 已换算的展示数值
 * @param status 系统公开配置
 * @param largeDigits 大于等于 1 时的小数位
 * @param smallDigits 小于 1 时的小数位
 * @param abbreviate 是否以 k 缩写大额数值
 * @returns 带币种符号的数值或 Tokens 文本
 */
function formatDisplayAmount(
  amount: number,
  status: SystemStatus | undefined,
  largeDigits: number,
  smallDigits: number,
  abbreviate: boolean
): string {
  if (status?.quota_display_type === 'TOKENS' && abbreviate && Math.abs(amount) >= 1000) {
    const compact = (amount / 1000).toFixed(1).replace(/\.0$/, '')
    return `${getQuotaDisplayPrefix(status)}${compact}k`
  }
  if (status?.quota_display_type === 'TOKENS') {
    return amount
      .toFixed(Math.abs(amount) >= 1 ? 0 : smallDigits)
      .replace(/(\.[0-9]*?)0+$/, '$1')
      .replace(/\.$/, '')
  }
  const digits = Math.abs(amount) >= 1 ? largeDigits : smallDigits
  const minimum = 10 ** -digits
  const adjusted = amount !== 0 && Math.abs(amount) < minimum ? Math.sign(amount) * minimum : amount
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }
  if (status?.quota_display_type === 'CUSTOM') {
    return `${getQuotaDisplayPrefix(status)}${new Intl.NumberFormat(undefined, options).format(adjusted)}`
  }
  return new Intl.NumberFormat(undefined, {
    ...options,
    style: 'currency',
    currency: status?.quota_display_type === 'CNY' ? 'CNY' : 'USD',
    currencyDisplay: 'narrowSymbol'
  }).format(adjusted)
}

/**
 * 按管理员货币展示格式呈现 quota
 * @param quota 内部 quota 数量
 * @param status 系统公开配置
 * @returns 展示额度文本
 */
export function formatQuota(quota: number, status?: SystemStatus): string {
  return formatDisplayAmount(quotaToDisplayAmount(quota, status), status, 2, 4, true)
}

/**
 * 按管理员货币展示格式呈现高精度日志 quota
 * @param quota 内部 quota 数量
 * @param status 系统公开配置
 * @returns 高精度展示额度文本
 */
export function formatLogQuota(quota: number, status?: SystemStatus): string {
  return formatDisplayAmount(quotaToDisplayAmount(quota, status), status, 4, 6, false)
}

/**
 * 按管理员币种格式化美元计价的账单金额，Tokens 模式仍显示美元
 * @param amount 美元金额
 * @param status 系统公开配置
 * @returns 高精度币种金额文本
 */
export function formatBillingAmount(amount: number, status?: SystemStatus): string {
  const billingStatus =
    status?.quota_display_type === 'TOKENS'
      ? { ...status, quota_display_type: 'USD' as const }
      : status
  return formatDisplayAmount(
    amount *
      (billingStatus?.quota_display_type === 'CNY'
        ? resolveExchangeRate(status?.usd_exchange_rate)
        : billingStatus?.quota_display_type === 'CUSTOM'
          ? resolveExchangeRate(status?.custom_currency_exchange_rate)
          : 1),
    billingStatus,
    4,
    6,
    false
  )
}

/**
 * 规范化每美元对应的 quota 数量
 * @param quotaPerUnit 接口返回的每美元 quota 数量
 * @returns 可用的每美元 quota 数量
 */
export function resolveQuotaPerUnit(quotaPerUnit?: number): number {
  const value = Number(quotaPerUnit)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_QUOTA_PER_UNIT
}

/**
 * 将内部 quota 单位转换为美元数值
 * @param quota 内部 quota 数量
 * @param quotaPerUnit 每美元对应的 quota 数量
 * @returns 美元数值
 */
export function quotaToUsd(quota: number, quotaPerUnit = DEFAULT_QUOTA_PER_UNIT): number {
  return Number(quota || 0) / resolveQuotaPerUnit(quotaPerUnit)
}

/**
 * 将美元数值转换为内部 quota 单位
 * @param amount 美元数值
 * @param quotaPerUnit 每美元对应的 quota 数量
 * @returns 取整后的内部 quota 数量
 */
export function usdToQuota(amount: number, quotaPerUnit = DEFAULT_QUOTA_PER_UNIT): number {
  return Math.round(Number(amount || 0) * resolveQuotaPerUnit(quotaPerUnit))
}

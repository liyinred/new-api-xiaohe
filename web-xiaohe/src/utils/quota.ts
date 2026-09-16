export const DEFAULT_QUOTA_PER_UNIT = 500000

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

/**
 * 按数值大小确定美元小数位
 * @param amount 美元数值
 * @param largeDigits 大于等于一美元时的小数位
 * @param smallDigits 小于一美元时的小数位
 * @returns 美元格式化小数位
 */
function getUsdFractionDigits(amount: number, largeDigits: number, smallDigits: number): number {
  return Math.abs(amount) >= 1 ? largeDigits : smallDigits
}

/**
 * 将美元数值格式化为带 $ 符号的文本
 * @param amount 美元数值
 * @param largeDigits 大于等于一美元时的小数位
 * @param smallDigits 小于一美元时的小数位
 * @returns 美元文本
 */
function formatUsdAmount(amount: number, largeDigits: number, smallDigits: number): string {
  const digits = getUsdFractionDigits(amount, largeDigits, smallDigits)
  const minimum = 10 ** -digits
  const adjustedAmount =
    amount !== 0 && Math.abs(amount) < minimum ? Math.sign(amount) * minimum : amount

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(adjustedAmount)
}

/**
 * 按官方前端精度格式化 quota 为美元
 * @param quota 内部 quota 数量
 * @param quotaPerUnit 每美元对应的 quota 数量
 * @returns 带 $ 符号的美元文本
 */
export function formatQuotaUsd(quota: number, quotaPerUnit = DEFAULT_QUOTA_PER_UNIT): string {
  return formatUsdAmount(quotaToUsd(quota, quotaPerUnit), 2, 4)
}

/**
 * 按官方使用日志精度格式化 quota 为美元
 * @param quota 内部 quota 数量
 * @param quotaPerUnit 每美元对应的 quota 数量
 * @returns 带 $ 符号的高精度美元文本
 */
export function formatLogQuotaUsd(quota: number, quotaPerUnit = DEFAULT_QUOTA_PER_UNIT): string {
  return formatUsdAmount(quotaToUsd(quota, quotaPerUnit), 4, 6)
}

/**
 * 按官方计费详情精度格式化美元金额
 * @param amount 美元金额
 * @returns 带 $ 符号的高精度美元文本
 */
export function formatBillingUsd(amount: number): string {
  return formatUsdAmount(amount, 4, 6)
}

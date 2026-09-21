/**
 * 将 Token 数值按 K、M、B 单位格式化
 * @param value 待格式化的 Token 数值
 * @param locale 当前语言标识
 * @returns 带数量级单位的本地化 Token 文本
 */
export function formatTokenMetric(value: number, locale: string): string {
  const absoluteValue = Math.abs(value)
  const unit =
    absoluteValue >= 1_000_000_000
      ? { divisor: 1_000_000_000, suffix: 'B' }
      : absoluteValue >= 1_000_000
        ? { divisor: 1_000_000, suffix: 'M' }
        : absoluteValue >= 1_000
          ? { divisor: 1_000, suffix: 'K' }
          : { divisor: 1, suffix: '' }
  const formattedValue = new Intl.NumberFormat(locale, {
    maximumFractionDigits: unit.suffix ? 2 : 0
  }).format(value / unit.divisor)

  return `${formattedValue}${unit.suffix}`
}

/**
 * 按可选精度和前缀格式化图表中的数值
 * @param value 图表数值
 * @param prefix 数值前缀
 * @param precision 最大小数位；未指定时保留原始显示
 * @returns 格式化后的图表数值文本
 */
export function formatChartValue(value: number, prefix = '', precision?: number): string {
  const formatted =
    precision === undefined
      ? String(value)
      : new Intl.NumberFormat(undefined, {
          maximumFractionDigits: precision,
          useGrouping: false
        }).format(value)
  return `${prefix}${formatted}`
}

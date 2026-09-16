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

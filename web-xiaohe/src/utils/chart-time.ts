/**
 * 将秒级时间戳格式化为图表横轴使用的本地月日与时分
 * @param timestamp 秒级时间戳
 * @returns MM-DD HH:mm 格式的时间标签
 */
export function formatChartTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  /** 将日期数字补足两位。@param value 日期数字 @returns 两位文本 */
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

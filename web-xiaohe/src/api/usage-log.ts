import request from '@/utils/http'

export interface UsageLog {
  id: number
  created_at: number
  type: number
  content: string
  token_name: string
  model_name: string
  quota: number
  prompt_tokens: number
  completion_tokens: number
  use_time: number
  is_stream: boolean
  group: string
  other: string
  request_id: string
  upstream_request_id?: string
}

export interface UsageLogList {
  items: UsageLog[]
  total: number
  page: number
  page_size: number
}

export interface UsageLogStats {
  quota: number
  rpm: number
  tpm: number
}

export interface UsageLogQuery {
  p?: number
  page_size?: number
  type?: number
  token_name?: string
  model_name?: string
  start_timestamp?: number
  end_timestamp?: number
  group?: string
  request_id?: string
}

/**
 * 获取当前用户的使用日志
 * @param params 分页与日志筛选条件
 * @returns 使用日志分页数据
 */
export function fetchUsageLogs(params: UsageLogQuery) {
  return request.get<UsageLogList>({ url: '/api/log/self', params })
}

/**
 * 获取当前筛选条件下的使用统计
 * @param params 日志筛选条件
 * @returns 额度、RPM 与 TPM 统计
 */
export function fetchUsageLogStats(params: Omit<UsageLogQuery, 'p' | 'page_size'>) {
  return request.get<UsageLogStats>({ url: '/api/log/self/stat', params })
}

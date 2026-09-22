import request from '@/utils/http'

export interface UsageLog {
  id: number
  user_id: number
  created_at: number
  type: number
  content: string
  username: string
  token_name: string
  model_name: string
  quota: number
  prompt_tokens: number
  completion_tokens: number
  use_time: number
  is_stream: boolean
  channel: number
  channel_name: string
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
 * 按当前角色获取使用日志
 * @param params 分页与日志筛选条件
 * @param isAdmin 是否获取管理员可见的全部日志
 * @returns 使用日志分页数据
 */
export function fetchUsageLogs(params: UsageLogQuery, isAdmin: boolean = false) {
  return request.get<UsageLogList>({ url: isAdmin ? '/api/log' : '/api/log/self', params })
}

/**
 * 获取当前筛选条件下的使用统计
 * @param params 日志筛选条件
 * @param isAdmin 是否统计管理员可见的全部日志
 * @returns 额度、RPM 与 TPM 统计
 */
export function fetchUsageLogStats(
  params: Omit<UsageLogQuery, 'p' | 'page_size'>,
  isAdmin: boolean = false
) {
  return request.get<UsageLogStats>({
    url: isAdmin ? '/api/log/stat' : '/api/log/self/stat',
    params
  })
}

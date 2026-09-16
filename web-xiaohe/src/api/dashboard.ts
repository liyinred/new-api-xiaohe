import request from '@/utils/http'

export interface QuotaDataItem {
  created_at: number
  model_name?: string
  username?: string
  token_used?: number
  count?: number
  quota?: number
}

export interface QuotaDataParams {
  start_timestamp: number
  end_timestamp: number
  default_time?: string
}

/**
 * 获取指定时间范围内的用量数据
 * @param params 时间范围与聚合粒度
 * @param isAdmin 是否按管理员权限查询全部用户数据
 * @returns 用量数据列表
 */
export function fetchUserQuotaData(params: QuotaDataParams, isAdmin = false) {
  return request.get<QuotaDataItem[]>({
    url: isAdmin ? '/api/data' : '/api/data/self',
    params
  })
}

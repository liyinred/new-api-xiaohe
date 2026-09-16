import request from '@/utils/http'

export interface ApiToken {
  id: number
  name: string
  key: string
  status: number
  remain_quota: number
  used_quota: number
  unlimited_quota: boolean
  expired_time: number
  created_time: number
  accessed_time: number
  group?: string
  model_limits_enabled: boolean
  model_limits?: string
  allow_ips?: string
}

export interface TokenList {
  items: ApiToken[]
  total: number
  page: number
  page_size: number
}

export interface TokenFormData {
  name: string
  remain_quota: number
  expired_time: number
  unlimited_quota: boolean
  model_limits_enabled: boolean
  model_limits: string
  allow_ips: string
  group: string
  auto_groups: string[]
  cross_group_retry: boolean
}

/**
 * 获取当前用户的 API 密钥列表
 * @param params 分页与搜索参数
 * @returns API 密钥分页数据
 */
export function fetchTokens(params: { p: number; size: number; keyword?: string; token?: string }) {
  const url = params.keyword || params.token ? '/api/token/search' : '/api/token/'
  return request.get<TokenList>({ url, params })
}

/**
 * 创建 API 密钥
 * @param params API 密钥配置
 * @returns 新建的 API 密钥
 */
export function createToken(params: TokenFormData) {
  return request.post<ApiToken>({ url: '/api/token/', params })
}

/**
 * 更新 API 密钥
 * @param params 带密钥编号的配置
 * @returns 更新后的 API 密钥
 */
export function updateToken(params: TokenFormData & { id: number }) {
  return request.put<ApiToken>({ url: '/api/token/', params })
}

/**
 * 更新 API 密钥启用状态
 * @param id API 密钥编号
 * @param status 目标状态
 * @returns 更新后的 API 密钥
 */
export function updateTokenStatus(id: number, status: number) {
  return request.put<ApiToken>({
    url: '/api/token/?status_only=true',
    params: { id, status }
  })
}

/**
 * 删除 API 密钥
 * @param id API 密钥编号
 * @returns 删除结果
 */
export function deleteToken(id: number) {
  return request.del<unknown>({ url: `/api/token/${id}` })
}

/**
 * 获取未脱敏的 API 密钥
 * @param id API 密钥编号
 * @returns 完整密钥
 */
export function fetchTokenKey(id: number) {
  return request.post<{ key: string }>({ url: `/api/token/${id}/key` })
}

/**
 * 获取当前用户可用的模型列表
 * @returns 可用模型名称列表
 */
export function fetchUserModels() {
  return request.get<string[]>({ url: '/api/user/models' })
}

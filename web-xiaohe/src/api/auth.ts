import request from '@/utils/http'

export interface SystemStatus {
  register_enabled?: boolean
  password_register_enabled?: boolean
  email_verification?: boolean
  server_address?: string
  api_info?: Array<{ url: string }>
  quota_per_unit?: number
  quota_display_type?: 'USD' | 'CNY' | 'TOKENS' | 'CUSTOM'
  usd_exchange_rate?: number
  custom_currency_symbol?: string
  custom_currency_exchange_rate?: number
  price?: number
}

/**
 * 登录
 * @param params 登录参数
 * @returns 登录响应
 */
export function fetchLogin(params: Api.Auth.LoginParams) {
  return request.post<Api.Auth.LoginResponse>({
    url: '/api/user/login',
    params
  })
}

/**
 * 注册普通用户
 * @param params 注册参数
 * @returns 注册结果
 */
export function fetchRegister(params: {
  username: string
  password: string
  email?: string
  verification_code?: string
}) {
  return request.post<unknown>({
    url: '/api/user/register',
    params
  })
}

/**
 * 获取公开系统状态
 * @returns 注册及邮箱验证开关
 */
export function fetchSystemStatus() {
  return request.get<SystemStatus>({ url: '/api/status' })
}

/**
 * 发送邮箱验证码
 * @param email 收件邮箱
 * @returns 发送结果
 */
export function fetchEmailVerification(email: string) {
  return request.get<unknown>({
    url: '/api/verification',
    params: { email }
  })
}

/**
 * 将官方用户数据转换为定制前端用户结构
 * @param user 官方用户数据
 * @returns 定制前端用户信息
 */
function mapUserInfo(user: Api.Auth.OfficialUserInfo): Api.Auth.UserInfo {
  const roleMap: Record<number, string> = {
    1: 'R_USER',
    10: 'R_ADMIN',
    100: 'R_SUPER'
  }

  return {
    buttons: [],
    roles: [roleMap[user.role] || 'R_USER'],
    userId: user.id,
    userName: user.display_name || user.username,
    email: user.email || '',
    quota: user.quota || 0,
    usedQuota: user.used_quota || 0,
    requestCount: user.request_count || 0,
    group: user.group || ''
  }
}

/**
 * 转换登录响应中的用户信息
 * @param user 官方用户数据
 * @returns 定制前端用户信息
 */
export function transformAuthUser(user: Api.Auth.OfficialUserInfo): Api.Auth.UserInfo {
  return mapUserInfo(user)
}

/**
 * 获取用户信息
 * @returns 用户信息
 */
export function fetchGetUserInfo() {
  return request
    .get<Api.Auth.OfficialUserInfo>({ url: '/api/user/self' })
    .then((user) => mapUserInfo(user))
}

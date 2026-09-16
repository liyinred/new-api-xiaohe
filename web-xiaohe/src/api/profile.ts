import request from '@/utils/http'

export interface UserProfile {
  has_password?: boolean
  id: number
  username: string
  display_name: string
  role: number
  email?: string
  group: string
  quota: number
  used_quota: number
  request_count: number
  status: number
  created_time: number
  setting?: string
}

export type AccountSecurityScope =
  | 'account.password.change'
  | 'account.password.set'
  | 'account.binding.bind'

export interface SecurityProof {
  proof_token: string
  expires_at: number
  method: string
  scope: AccountSecurityScope
}

export interface PasswordChangeResult {
  access_token: string
  has_password: boolean
  notification_warning?: boolean
}

export interface AccountSecurityResult {
  notification_warning?: boolean
}

export interface EmailBindingFlow {
  flow_token: string
  email: string
  current_email?: string
  old_email_required: boolean
  expires_at: number
  resend_at: number
  notification_warning?: boolean
}

export interface UserSettings {
  notify_type: 'email' | 'webhook' | 'bark' | 'gotify'
  quota_warning_threshold: number
  notification_email: string
  webhook_url: string
  webhook_secret: string
  bark_url: string
  gotify_url: string
  gotify_token: string
  gotify_priority: number
  accept_unset_model_ratio_model: boolean
  record_ip_log: boolean
  upstream_model_update_notify_enabled?: boolean
}

/**
 * 获取当前用户完整资料
 * @returns 当前用户资料
 */
export function fetchUserProfile() {
  return request.get<UserProfile>({ url: '/api/user/self' })
}

/**
 * 更新当前用户的显示名称
 * @param displayName 新的显示名称
 * @returns 更新结果
 */
export function updateUserProfile(displayName: string) {
  return request.put<unknown>({
    url: '/api/user/self',
    params: { display_name: displayName }
  })
}

/**
 * 使用当前密码为账户安全操作申请一次性 proof
 * @param scope 待授权的账户安全操作
 * @param password 当前账户密码
 * @param context 操作上下文
 * @returns 一次性安全 proof
 */
export function requestPasswordSecurityProof(
  scope: AccountSecurityScope,
  password: string,
  context?: Record<string, string>
) {
  return request.post<SecurityProof>({
    url: '/api/verify',
    params: {
      method: 'password',
      scope,
      password,
      ...(context ? { context } : {})
    }
  })
}

/**
 * 使用安全 proof 修改当前账户密码
 * @param password 新密码
 * @param originalPassword 当前密码
 * @param proofToken 一次性安全 proof
 * @returns 更新后的登录凭证信息
 */
export function changeAccountPassword(
  password: string,
  originalPassword: string,
  proofToken: string
) {
  return request.put<PasswordChangeResult>({
    url: '/api/user/self',
    params: { password, original_password: originalPassword },
    headers: { 'X-Security-Proof': proofToken }
  })
}

/**
 * 启动账户邮箱绑定或更换流程
 * @param email 新账户邮箱
 * @param proofToken 一次性安全 proof
 * @returns 邮箱验证流程信息
 */
export function startEmailBinding(email: string, proofToken: string) {
  return request.post<EmailBindingFlow>({
    url: '/api/oauth/email/bind/start',
    params: { email },
    headers: { 'X-Security-Proof': proofToken }
  })
}

/**
 * 重新发送账户邮箱绑定验证码
 * @param flowToken 邮箱绑定流程令牌
 * @returns 更新后的邮箱验证流程信息
 */
export function resendEmailBinding(flowToken: string) {
  return request.post<EmailBindingFlow>({
    url: '/api/oauth/email/bind/resend',
    params: { flow_token: flowToken }
  })
}

/**
 * 提交验证码完成账户邮箱绑定
 * @param flowToken 邮箱绑定流程令牌
 * @param newCode 新邮箱验证码
 * @param oldCode 原邮箱验证码
 * @returns 绑定结果
 */
export function confirmEmailBinding(flowToken: string, newCode: string, oldCode: string) {
  return request.post<AccountSecurityResult>({
    url: '/api/oauth/email/bind',
    params: { flow_token: flowToken, new_code: newCode, old_code: oldCode }
  })
}

/**
 * 更新当前用户的邮箱通知设置
 * @param settings 完整用户通知设置
 * @returns 更新结果
 */
export function updateUserSettings(settings: UserSettings) {
  return request.put<unknown>({ url: '/api/user/setting', params: settings })
}

/**
 * 解析用户设置并补充接口所需默认值
 * @param setting 用户设置 JSON 字符串
 * @returns 完整用户设置
 */
export function parseUserSettings(setting?: string): UserSettings {
  let parsed: Partial<UserSettings> = {}
  try {
    parsed = setting ? (JSON.parse(setting) as Partial<UserSettings>) : {}
  } catch {
    parsed = {}
  }

  return {
    notify_type: parsed.notify_type || 'email',
    quota_warning_threshold: parsed.quota_warning_threshold || 500000,
    notification_email: parsed.notification_email || '',
    webhook_url: parsed.webhook_url || '',
    webhook_secret: parsed.webhook_secret || '',
    bark_url: parsed.bark_url || '',
    gotify_url: parsed.gotify_url || '',
    gotify_token: parsed.gotify_token || '',
    gotify_priority: parsed.gotify_priority ?? 5,
    accept_unset_model_ratio_model: parsed.accept_unset_model_ratio_model || false,
    record_ip_log: parsed.record_ip_log || false,
    upstream_model_update_notify_enabled: parsed.upstream_model_update_notify_enabled
  }
}

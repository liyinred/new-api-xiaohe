import request from '@/utils/http'

export interface PricingVendor {
  id: number
  name: string
  icon?: string
  description?: string
}

export interface PricingEndpoint {
  path?: string
  method?: string
}

export interface PricingModel {
  model_name: string
  description?: string
  icon?: string
  tags?: string
  vendor_id?: number
  vendor_name?: string
  vendor_description?: string
  quota_type: number
  model_ratio: number
  model_price?: number
  completion_ratio: number
  cache_ratio?: number | null
  create_cache_ratio?: number | null
  image_ratio?: number | null
  audio_ratio?: number | null
  audio_completion_ratio?: number | null
  enable_groups: string[]
  supported_endpoint_types?: string[]
  billing_mode?: string
  billing_expr?: string
  group_ratio?: Record<string, number>
}

export interface PricingResponse {
  success: boolean
  message?: string
  data: PricingModel[]
  vendors: PricingVendor[]
  group_ratio: Record<string, number>
  usable_group: Record<string, string>
  supported_endpoint: Record<string, PricingEndpoint>
  auto_groups: string[]
  pricing_version?: string
}

/**
 * 获取当前用户可见的模型广场数据
 * @returns 模型、供应商、分组倍率与端点配置
 */
export function fetchModelSquare(): Promise<PricingResponse> {
  return request.get<PricingResponse>({
    url: '/api/pricing',
    returnFullResponseData: true
  })
}

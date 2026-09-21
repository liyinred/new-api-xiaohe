import { AppRouteRecord } from '@/types/router'
import { dashboardRoutes } from './dashboard'
import { apiKeysRoutes } from './api-keys'
import { modelDataRoutes } from './model-data'
import { usageLogsRoutes } from './usage-logs'
import { profileRoutes } from './profile'
import { modelSquareRoutes } from './model-square'

/**
 * 导出所有模块化路由
 */
export const routeModules: AppRouteRecord[] = [
  modelSquareRoutes,
  dashboardRoutes,
  apiKeysRoutes,
  modelDataRoutes,
  usageLogsRoutes,
  profileRoutes
]

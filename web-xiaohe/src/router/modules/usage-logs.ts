import { AppRouteRecord } from '@/types/router'

export const usageLogsRoutes: AppRouteRecord = {
  name: 'UsageLogs',
  path: '/usage-logs/common',
  component: '/usage-logs/index',
  meta: {
    title: 'menus.usageLogs.title',
    icon: 'ri:file-list-3-line',
    roles: ['R_SUPER', 'R_ADMIN', 'R_USER'],
    keepAlive: true
  }
}

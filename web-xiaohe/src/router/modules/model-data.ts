import { AppRouteRecord } from '@/types/router'

export const modelDataRoutes: AppRouteRecord = {
  name: 'ModelData',
  path: '/dashboard/models',
  component: '/dashboard/models',
  meta: {
    title: 'menus.modelData.title',
    icon: 'ri:bar-chart-box-line',
    roles: ['R_SUPER', 'R_ADMIN', 'R_USER'],
    keepAlive: false
  }
}

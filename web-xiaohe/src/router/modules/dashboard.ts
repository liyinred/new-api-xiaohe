import { AppRouteRecord } from '@/types/router'

export const dashboardRoutes: AppRouteRecord = {
  name: 'Console',
  path: '/dashboard/console',
  component: '/dashboard/console',
  meta: {
    title: 'menus.dashboard.console',
    icon: 'ri:pie-chart-line',
    roles: ['R_SUPER', 'R_ADMIN', 'R_USER'],
    keepAlive: false,
    fixedTab: true
  }
}

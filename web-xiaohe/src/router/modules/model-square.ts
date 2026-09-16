import { AppRouteRecord } from '@/types/router'

export const modelSquareRoutes: AppRouteRecord = {
  name: 'ModelSquare',
  path: '/model-square',
  component: '/model-square/index',
  meta: {
    title: 'menus.modelSquare.title',
    icon: 'ri:apps-2-line',
    roles: ['R_SUPER', 'R_ADMIN', 'R_USER'],
    keepAlive: true
  }
}
